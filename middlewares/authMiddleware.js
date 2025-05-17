import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logger } from "../utils/logger.js"


export const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.headers.authorization.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized! Please login again!"
            });
        }

        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        console.log("decoded", decoded);

        if (!decoded) {
            return res.status(400).json({
                success: false,
                message: "Invalid Token!",
            })
        }

        const user = await User.findById(decoded._id);
        req.user = user;

        next();


    } catch (error) {
        logger.error(error);
        console.log(error);
    }
}