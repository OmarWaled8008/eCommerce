import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { productModel } from "./Database/models/product.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const images = fs.readFileSync(
  path.join(__dirname, "uploadedImages.json"),
  "utf-8"
);
const imageArray = JSON.parse(images);

mongoose
  .connect(
    `mongodb+srv://eslamelwey:Ee27799@cluster0.8jc3tp0.mongodb.net/Ecommerce-App?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    console.log("DB Connected Succesfully");
    injectProductsImages();
  })
  .catch((error) => {
    console.log("DB Failed to connect", error);
  });

async function injectProductsImages() {
  const products = await productModel.find();
  const updatedProducts = products.map((product, index) => {
    let imageIndex = index % imageArray.length;
    const imageData = imageArray[imageIndex];
    if (!imageData || !imageData.imageCover || !imageData.images) {
      console.warn(`Missing image data at index ${imageIndex}`);
      return product;
    }
    product.imgCover = imageData.imageCover.url;
    product.images = imageData.images.map((img) => img.url);
    return product;
  });
  for (const product of updatedProducts) {
    await product.save();
  }
  console.log("All products updated with images.");
}
