import mongoose from "mongoose";

export function dbConnection() {
  mongoose
    .connect(
      `mongodb+srv://eslamelwey:Ee27799@cluster0.8jc3tp0.mongodb.net/Ecommerce-App?retryWrites=true&w=majority&appName=Cluster0`
    )
    .then(() => {
      console.log("DB Connected Succesfully");
    })
    .catch((error) => {
      console.log("DB Failed to connect", error);
    });
}

//Use this is postman https://ecommerce-backend-codv.onrender.com/api/v1/auth/signup
