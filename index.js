import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import swipeRoutes from './routes/swipe.routes.js';
import messageRoutes from './routes/message.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';


// Configuration
dotenv.config({});
connectDB();

// Initialization
const app = express();
const port = process.env.PORT || 5000;


// STRIPE 
app.use("/api/v1/stripe", stripeRoutes);



// Middlewares
app.use(express.json({ limit: '20mb' }));
// app.use((req, res, next) => {
//     if (req.originalUrl === '/api/v1/stripe/webhook') {
//         return next(); // Skip express.json() for webhook
//     }
//     express.json()(req, res, next); // Apply express.json() for other routes
// });
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
});


// Route Middlewares
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/swipe", swipeRoutes);
app.use("/api/v1/message", messageRoutes);
// app.use("/api/v1/stripe", stripeRoutes);


// Health Route
app.get("/health", (req, res) => {
    return res.status(200).json({
        success: false,
        message: "Server is Up for LumeCrush!",
    });
});


//error handler
app.use(errorHandler);

app.listen(port, () => {
    logger.info(`Server is running on port ${port}!`);
});


//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at", promise, "reason:", reason);
});