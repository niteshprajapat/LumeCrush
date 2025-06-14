import cron from 'node-cron';
import User from '../models/user.model.js';
import { logger } from './logger.js';


export const resetSwipeLimit = async () => {
    try {
        logger.info("Starting daily swipe limit reste...");

        const users = await User.find({ isDeleted: false });
        const now = new Date();

        for (const user of users) {
            const lastReset = user.subscription.lastReset || now;
            const hoursSinceLastReset = (now - lastReset) / (1000 * 60 * 60);

            // reset if 24 hrs have passed
            if (hoursSinceLastReset >= 24) {
                user.subscription.swipeLimit = user.subscription.plan === "platinum" ? 200 : 100;
                user.subscription.lastReset = now;
                await user.save();
            }

            logger.info("Swipe limits reset successfully for all users!");
        }

    } catch (error) {
        logger.error(`Error in resetSwipeLimits: ${error.message}`);
    }
}


// Schedule cron job to run every dat at midnight
cron.schedule("0 0 * * *", resetSwipeLimit);