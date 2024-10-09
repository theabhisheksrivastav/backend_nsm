import mongoose from "mongoose";

import { DB_NAME } from "../constant.js"

const connectDB = async () => {
    try {
        
        const connectionInstance = await mongoose.connect("mongodb://localhost:27017/mydbs", {

        });

        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB: ', error);
        process.exit(1);
    }
};

export default connectDB;
