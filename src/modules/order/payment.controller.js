import Stripe from "stripe";
import dotenv from "dotenv";
import { cartModel } from "../../../Database/models/cart.model.js";
import { orderModel } from "../../../Database/models/order.model.js";

dotenv.config({ path: "../../../.env" });
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
console.log(process.env.STRIPE_WEBHOOK_SECRET);

export const createCheckOutSession = async (req, res) => {
  try {
    const userId = req.user._id.toString();
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
      customer_email: req.user.email,
      client_reference_id: req.user._id.toString(),
      metadata: {
        userId: userId,
        cartId: cart._id.toString(),
        totalPriceAfterDiscount: (cart.totalPriceAfterDiscount || 0).toString(),
        totalPrice: cart.totalPrice.toString(),
        shippingStreet: shippingStreet || "",
        shippingCity: shippingCity || "",
        shippingPhone: shippingPhone || "",
      },
    });

    res.status(200).json({ message: "success", url: session.url });
  } catch (error) {
    console.error("Error in createCheckOutSession:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const webHookHandler = async (req, res) => {
  console.log("Webhook handler called");
  console.log("Raw body:", req.body.toString());
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("Stripe event verified:", event.type);

    if (event.type === "checkout.session.completed") {
      console.log("Checkout session completed event received");
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const clientRefId = session.client_reference_id;
    const customerEmail = session.customer_email;
    const userId = session.metadata.userId;
    const cartId = session.metadata.cartId;
    console.log("Webhook received for session:", session.id);
    console.log("Order created for user:", userId);
    try {
      const cart = await cartModel
        .findById(cartId)
        .populate("cartItem.productId");
      if (!cart) {
        console.error("Cart not found for order creation");
        return res.status(404).send("Cart not found");
      }

      const orderData = {
        userId,
        cartItems: cart.cartItem.map((item) => ({
          productId: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price,
          totalProductDiscount: item.totalProductDiscount || 0,
        })),
        shippingAddress: {
          street: session.metadata.shippingStreet || "",
          city: session.metadata.shippingCity || "",
          phone: session.metadata.shippingPhone || "",
        },
        paymentMethod: "card",
        isPaid: true,
        paidAt: new Date(),
      };

      await orderModel.create(orderData);
      await cartModel.findByIdAndDelete(cartId);

      console.log("Order created and cart cleared");
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  res.status(200).json({ received: true });
};
