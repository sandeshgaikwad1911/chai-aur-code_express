import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = ()=>{
    mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
    .then(()=>{
        console.log('database connected successfully.');
    })
    .catch((err)=>{
        console.log("Error connecting to the database: ", err);
        process.exit(1)
    })
}