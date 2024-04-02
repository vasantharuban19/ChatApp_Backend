import mongoose from "mongoose";

const connectDatabase = async () => {
  try {
    await mongoose
    .connect(`${process.env.DB_URL}`, { dbName: process.env.DB_NAME })
    .then((data) => {
      console.log(`Mongodb connected with server: ${data.connection.host}`);
    })
  } catch (error) {
    console.log("Mongodb connection Error", error.message)
  }
};

export default connectDatabase