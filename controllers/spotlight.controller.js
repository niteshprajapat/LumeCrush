import Spotlight from "../models/spotlight.model.js";
import User from "../models/user.model.js";
import { logger } from "../utils/logger.js";
import { spotlightPlans } from "../config/spotlightPlans.js";
import stripe from 'stripe';
import dotenv from 'dotenv';


dotenv.config({});

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// purchaseSpotlight
export const purchaseSpotlight = async (req, res) => {
    try {
        const { priceId } = req.body;
        const userId = req.user._id;

        if (!priceId) {
            return res.status(404).json({
                success: false,
                message: "PriceId for spotlight is Required!",
            });
        }

        // const plan = spotlightPlans.find((plan) => plan.stripePriceId === priceId);
        const plan = spotlightPlans.find((plan) => {
            console.log(plan.stripePriceId)
            console.log("priceud => ", priceId)
            return plan.stripePriceId === priceId
        })
        if (!plan) {
            return res.status(400).json({
                success: false,
                message: "Invalid Spotlight Plan!",
            });
        }


        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "User Not Found!",
            });
        }


        // stripe customer id , fetch if exist else create
        let stripeCustomerId = user.subscription.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripeClient.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                metadata: {
                    userId: userId.toString(),
                }
            });

            stripeCustomerId = customer.id;
            user.subscription.stripeCustomerId = stripeCustomerId;
            await user.save();
        }

        const session = await stripeClient.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                }
            ],
            success_url: 'http://localhost:5173/spotlight-success',
            cancel_url: 'http://localhost:5173/spotlight-cancel',
            metadata: {
                userId: userId.toString(),
                priceId: priceId,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Checkout session created for spotlight purchase!",
            url: session.url,
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in purchaseSpotlight API!",
        });
    }
}

// activateSpotlight
export const activateSpotlight = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!"
            })
        }

        // check available spotlight
        const availableSpotlights = await Spotlight.find({
            userId,
            status: "completed",
            $or: [
                { isActive: false },
                { endTime: { $lte: new Date() } }
            ],
        });

        const totalAvailableSpotlights = availableSpotlights.reduce((sum, spotlight) => sum + spotlight.quantity, 0)

        if (totalAvailableSpotlights <= 0) {
            return res.status(400).json({
                success: false,
                message: "No spotlights available! Please purchase spotlights first."
            })
        }

        // check active spotlight
        const activeSpotlight = await Spotlight.findOne({
            userId,
            isActive: true,
            endTime: { $gt: new Date() }
        })

        if (activeSpotlight) {
            return res.status(400).json({
                success: false,
                message: `Spotlight is already active until ${new Date(activeSpotlight.endTime).toLocaleString()}!`,
            });
        }

        console.log("availableSpotlights", availableSpotlights);

        const spotlight = availableSpotlights[0];
        const spotlightDuration = 12 * 60 * 60 * 1000; // for 12 hrs
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + spotlightDuration)

        spotlight.isActive = true;
        spotlight.startTime = startTime;
        spotlight.endTime = endTime;
        spotlight.quantity -= 1;

        if (spotlight.quantity === 0) {
            spotlight.status = 'completed';
        }

        await spotlight.save();

        return res.status(200).json({
            success: true,
            message: "Spotlight activated successfully!",
            spotlight: {
                startTime,
                endTime,
                remainingSpotlights: totalAvailable - 1,
            },
        })

    } catch (error) {
        logger.error(`Error in activateSpotlight API: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Error in activateSpotlight API!",
        });
    }
}

// getSpotlights
export const getSpotlights = async (req, res) => {
    try {
        const userId = req.user._id;
        const spotlights = await Spotlight.find({ userId });

        return res.status(200).json({
            success: true,
            message: "Fetched spotlights successfully!",
            spotlights,
        });

    } catch (error) {
        logger.error(`Error in getSpotlights API: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Error in getSpotlights API!",
        });
    }
}