import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config({});

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        logger.info("MongoDB Connected Successfully!")
    } catch (error) {
        logger.error("Unable to connect MongoDB!", error);
    }
}