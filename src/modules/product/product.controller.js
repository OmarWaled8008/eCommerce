import slugify from "slugify";
import { catchAsyncError } from "../../utils/catchAsyncError.js";
import { AppError } from "../../utils/AppError.js";
import { deleteOne } from "../../handlers/factor.js";
import { productModel } from "./../../../Database/models/product.model.js";
import { ApiFeatures } from "../../utils/ApiFeatures.js";

const addProduct = catchAsyncError(async (req, res, next) => {
  // console.log(req.files);
  req.body.imgCover = req.files.imgCover[0].filename;
  req.body.images = req.files.images.map((ele) => ele.filename);

  // console.log(req.body.imgCover, req.body.images);
  req.body.slug = slugify(req.body.title);
  const addProduct = new productModel(req.body);
  await addProduct.save();

  res.status(201).json({ message: "success", addProduct });
});

const getAllProducts = catchAsyncError(async (req, res, next) => {
  let apiFeature = new ApiFeatures(
    productModel.find().populate("brand category subcategory"),
    req.query
  )
    .fields()
    .filteration()
    .search()
    .sort();

  const filteredQuery = apiFeature.mongooseQuery.clone();
  const totalProducts = await filteredQuery.countDocuments();

  apiFeature.pagination();

  const getAllProducts = await apiFeature.mongooseQuery;

  const PAGE_NUMBER = apiFeature.queryString.page * 1 || 1;
  const totalPages = Math.ceil(totalProducts / 20);
  
  res.status(201).json({
    page: PAGE_NUMBER,
    message: "success",
    data: {
      totalProducts,
      totalPages,
      getAllProducts,
    },
  });
});
const getSpecificProduct = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const getSpecificProduct = await productModel.findByIdAndUpdate(id);
  res.status(201).json({ message: "success", getSpecificProduct });
});

const updateProduct = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (req.body.title) {
    req.body.slug = slugify(req.body.title);
  }
  const updateProduct = await productModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  updateProduct && res.status(201).json({ message: "success", updateProduct });

  !updateProduct && next(new AppError("Product was not found", 404));
});

const deleteProduct = deleteOne(productModel, "Product");
export {
  addProduct,
  getAllProducts,
  getSpecificProduct,
  updateProduct,
  deleteProduct,
};
