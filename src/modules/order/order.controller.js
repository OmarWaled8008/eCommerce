import { catchAsyncError } from "../../utils/catchAsyncError.js";
import { AppError } from "../../utils/AppError.js";
import { cartModel } from "../../../Database/models/cart.model.js";
import { productModel } from "../../../Database/models/product.model.js";
import { orderModel } from "../../../Database/models/order.model.js";
import dotenv from "dotenv";
dotenv.config();

import Stripe from "stripe";
import { userModel } from "../../../Database/models/user.model.js";
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createCashOrder = catchAsyncError(async (req, res, next) => {
  let cart = await cartModel.findById(req.params.id);

  // console.log(cart);
  let totalOrderPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalPrice;

  console.log(cart.cartItem);
  const order = new orderModel({
    userId: req.user._id,
    cartItem: cart.cartItem,
    totalOrderPrice,
    shippingAddress: req.body.shippingAddress,
  });

  await order.save();

  // console.log(order);
  if (order) {
    let options = cart.cartItem.map((item) => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { quantity: -item.quantity, sold: item.quantity } },
      },
    }));

    await productModel.bulkWrite(options);

    await cartModel.findByIdAndDelete(req.params.id);

    return res.status(201).json({ message: "success", order });
  } else {
    next(new AppError("Error in cart ID", 404));
  }
});

const getSpecificOrder = catchAsyncError(async (req, res, next) => {
  console.log(req.user._id);

  let order = await orderModel
    .findOne({ userId: req.user._id })
    .populate("cartItem.productId");

  res.status(200).json({ message: "success", order });
});

const getAllOrders = catchAsyncError(async (req, res, next) => {
  let orders = await orderModel.findOne({}).populate("cartItems.productId");

  res.status(200).json({ message: "success", orders });
});

const createCheckOutSession = catchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shippingStreet, shippingCity, shippingPhone } = req.body;

    const cart = await cartModel
      .findOne({ userId })
      .populate("cartItem.productId");

    if (!cart || cart.cartItem.length === 0) {
      return res.status(404).json({ message: "Cart not found or empty" });
    }

    const line_items = cart.cartItem.map((item) => ({
      price_data: {
        currency: "egp",
        product_data: {
          name: item.productId.title,
          images: [item.productId.imgCover],
        },
        unit_amount: item.productId.price * 100,
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/products`,
      cancel_url: `${process.env.CLIENT_URL}/products`,
      customer_email: req.user.email, // ✅ Real user email
      client_reference_id: req.user._id.toString(), // ✅ Will help in webhook
      metadata: {
        userId: req.user._id.toString(),
        cartId: cart._id.toString(),
        totalPriceAfterDiscount: (cart.totalPriceAfterDiscount || 0).toString(),
        totalPrice: cart.totalPrice.toString(),
        shippingStreet: shippingStreet || "",
        shippingCity: shippingCity || "",
        shippingPhone: shippingPhone || "",
      },
    });

    res.status(200).json({ message: "success", session });
  } catch (error) {
    console.error("Error in createCheckOutSession:", error);
    res.status(500).json({ message: "Server error" });
  }
});

console.log(process.env.STRIPE_WEBHOOK_SECRET);

const createOnlineOrder = catchAsyncError(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Stripe event verified:", event.type);
  } catch (err) {
    console.error("❌ Stripe webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log(
      "✅ Handling checkout.session.completed for:",
      session.customer_email
    );
    await card(session);
  }

  res.status(200).send(); // Respond to Stripe
});

//https://ecommerce-backend-codv.onrender.com/api/v1/orders/checkOut/6536c48750fab46f309bb950

async function card(session) {
  const user = await userModel.findOne({ email: session.customer_email });
  if (!user) {
    console.error("❌ User not found by email:", session.customer_email);
    return;
  }

  const cart = await cartModel.findOne({ userId: session.client_reference_id });
  if (!cart) {
    console.error("❌ Cart not found for user:", session.client_reference_id);
    return;
  }

  const order = new orderModel({
    userId: user._id,
    cartItem: cart.cartItem,
    totalOrderPrice: session.amount_total / 100,
    shippingAddress: {
      street: session.metadata.shippingStreet,
      city: session.metadata.shippingCity,
      phone: session.metadata.shippingPhone,
    },
    paymentMethod: "card",
    isPaid: true,
    paidAt: Date.now(),
  });

  await order.save();

  const bulkUpdate = cart.cartItem.map((item) => ({
    updateOne: {
      filter: { _id: item.productId },
      update: { $inc: { quantity: -item.quantity, sold: item.quantity } },
    },
  }));

  await productModel.bulkWrite(bulkUpdate);
  await cartModel.findOneAndDelete({ userId: user._id });

  console.log("✅ Order created successfully:", order._id);
}

export {
  createCashOrder,
  getSpecificOrder,
  getAllOrders,
  createCheckOutSession,
  createOnlineOrder,
};
