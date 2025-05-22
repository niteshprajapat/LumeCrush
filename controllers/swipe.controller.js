import Match from "../models/match.model.js";
import Notification from "../models/notification.model.js";
import Swipe from "../models/swipe.model.js";
import User from "../models/user.model.js";
import { logger } from "../utils/logger.js"


// swipeUser
export const swipeUser = async (req, res) => {
    try {
        const { target, action } = req.body;
        const swiperId = req.user._id;

        if (!target || !action) {
            return res.status(404).json({
                success: false,
                message: "All fields are required!",
            })
        }

        if (target.toString() === swiperId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cant swipe to yourself!",
            });
        }

        const swiper = await User.findById(swiperId);

        if (!swiper) {
            return res.status(404).json({
                success: false,
                message: "Swiper Not Found!"
            });
        }

        // Swipe limit check
        if (swiper.subscription.swipeLimit <= 0) {
            return res.status(403).json({
                success: false,
                message: "Swipe Limit Exceed for today. Try again tomorrow!",
            });
        }

        if (action === "superLike" && swiper.subscription.swipeLimit <= 0) {
            return res.status(403).json({
                success: false,
                message: "No more SuperLike.",
            })
        }


        const swipe = await Swipe.create({
            swiper: swiperId,
            target,
            action: action,
        });


        swiper.subscription.swipeLimit -= 1;

        if (action === "superLike") {
            swiper.subscription.superlikes -= 1;
        }

        await swipe.save();


        // Notification -> Pending
        if (action === "like" || action === "superLike") {
            const notification = await Notification.create({
                receiver: target,
                sender: swiperId,
                type: action,
                content: action === "superLike" ? `${swiperId} SuperLiked you!` : `${swiperId} liked you!`,
            });
        }


        // reverseSwipe for Match Making
        const reverseSwipe = await Swipe.findOne({
            swiper: target,
            target: swiperId,
            action: {
                $in: ["like", "superLike"]
            },
        })


        if (reverseSwipe) {
            // match making
            const match = await Match.create({
                user1: swiperId,
                user2: target,
            });

            // Notification
            await Notification.create({
                receiver: target,
                sender: swiperId,
                type: 'match',
                content: `It's a Match!`,
            });

            await Notification.create({
                receiver: swiperId,
                sender: target,
                type: 'match',
                content: `It's a Match!`
            });

        }




        return res.status(200).json({
            success: true,
            message: `Swiped Successfully to ${action}!`,
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in swipeUser API!"
        })
    }
}


// getSwipeHistoryOfUser
export const getSwipeHistoryOfUser = async (req, res) => {
    try {
        const swiperId = req.user._id;

        const swipes = await Swipe.find({ swiper: swiperId });
        console.log("Swipes", swipes);




        return res.status(200).json({
            success: true,
            message: `Fetched Swipes Successfully!`,
            swipes,
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in swipeUser API!"
        })
    }
}