import User from "../models/user.model.js";
import { logger } from "../utils/logger.js"
import stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({});




const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);


// Use this api to get latitude and longitude using city name
// https://api.openweathermap.org/data/2.5/weather?q=jodhpur&appid=0318c1563a65f62cbdd1f39c1d54301a


// handle WEBHOOK

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error) {
        logger.error(`Webhook signature verification failed: ${error.message}`);
        return res.status(400).json({ success: false, message: 'Webhook Error' });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                const userId = session.metadata.userId;
                const subscriptionId = session.subscription;

                logger.info(`Processing checkout.session.completed for userId: ${userId}, subscriptionId: ${subscriptionId}`);

                const user = await User.findById(userId);
                if (!user) {
                    logger.error('User not found for subscription');
                    return res.status(404).json({ success: false, message: 'User not found' });
                }

                user.subscription.stripeSubscriptionId = subscriptionId;
                user.subscription.plan = 'platinum';
                user.subscription.expiry = null;
                user.subscription.swipeLimit = 200;
                user.subscription.superlikes = 5;
                user.subscription.boosts = 3;
                user.subscription.lastReset = new Date();

                user.subscriptionHistory.push({
                    plan: 'platinum',
                    stripeSubscriptionId: subscriptionId,
                    startDate: new Date(session.created * 1000),
                    endDate: null,
                    status: 'active',
                });

                await user.save();
                logger.info(`Recurring subscription activated for user ${userId}`);
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                const subId = invoice.subscription;
                const userWithSub = await User.findOne({ 'subscription.stripeSubscriptionId': subId });

                if (userWithSub) {
                    const subscription = await stripeClient.subscriptions.retrieve(subId);
                    userWithSub.subscription.expiry = new Date(subscription.current_period_end * 1000);
                    userWithSub.subscription.swipeLimit = 200;
                    userWithSub.subscription.superlikes = 5;
                    userWithSub.subscription.boosts = 3;
                    userWithSub.subscription.lastReset = new Date();
                    await userWithSub.save();
                    logger.info(`Recurring subscription renewed for user ${userWithSub._id}`);
                }
                break;

            case 'invoice.created':
                logger.info(`Invoice created for recurring subscription ${event.data.object.subscription}`);
                break;

            case 'charge.refunded':
                const refund = event.data.object;
                const refundedUser = await User.findOne({
                    'subscriptionHistory.stripeSubscriptionId': refund.metadata.subscription_id
                });

                if (refundedUser) {
                    const subscriptionEntry = refundedUser.subscriptionHistory.find(
                        entry => entry.stripeSubscriptionId === refund.metadata.subscription_id
                    );
                    if (subscriptionEntry) {
                        subscriptionEntry.status = 'refunded';
                        subscriptionEntry.endDate = new Date();
                    }
                    refundedUser.subscription.plan = 'free';
                    refundedUser.subscription.expiry = null;
                    refundedUser.subscription.swipeLimit = 100;
                    refundedUser.subscription.superlikes = 0;
                    refundedUser.subscription.boosts = 0;
                    refundedUser.subscription.stripeSubscriptionId = null;
                    await refundedUser.save();
                    logger.info(`Refund processed for recurring subscription for user ${refundedUser._id}`);
                }
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const sub = event.data.object;
                const userToUpdate = await User.findOne({ 'subscription.stripeSubscriptionId': sub.id });

                if (userToUpdate) {
                    if (sub.status === 'canceled' || event.type === 'customer.subscription.deleted') {
                        const subscriptionEntry = userToUpdate.subscriptionHistory.find(
                            entry => entry.stripeSubscriptionId === sub.id
                        );
                        if (subscriptionEntry) {
                            subscriptionEntry.status = 'canceled';
                            subscriptionEntry.endDate = new Date(sub.current_period_end * 1000);
                        }
                        userToUpdate.subscription.plan = 'free';
                        userToUpdate.subscription.expiry = null;
                        userToUpdate.subscription.swipeLimit = 100;
                        userToUpdate.subscription.superlikes = 0;
                        userToUpdate.subscription.boosts = 0;
                        userToUpdate.subscription.stripeSubscriptionId = null;
                        await userToUpdate.save();
                        logger.info(`Recurring subscription canceled for user ${userToUpdate._id}`);
                    }
                }
                break;

            default:
                logger.info(`Unhandled event type ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        logger.error(`Webhook error: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
};






// getDiscoverUsers
export const getDiscoverUsers = async (req, res) => {
    try {


        const userId = req.user._id;
        const user = await User.findById(userId);
        console.log("user", user);

        // const { minAge, maxAge, gender, maxDistance } = user.preferences;
        // const userInterests = user.interests || [];

        // Default to stored preferences
        const userPreferences = user.preferences || {};
        const userInterests = user.interests || [];

        const {
            minAge = userPreferences.minAge || 18,
            maxAge = userPreferences.maxAge || 100,
            gender = userPreferences.gender || "all",
            maxDistance = userPreferences.maxDistance || 100,
            interests = userInterests,
        } = req.query;



        console.log(req.query);
        console.log("storedpreferences", interests);



        // interest based filter pending
        const users = await User.find({
            _id: {
                $ne: userId,
            },
            age: {
                $gte: Number(minAge),
                $lte: Number(maxAge),
            },
            gender: gender === "all" ? { $in: ["male", "female", "other"] } : gender,
            location: {
                $near: {
                    $geometry: user.location,
                    $maxDistance: Number(maxDistance) * 1000  // distance in km
                },
            },
            interests: { $in: interests },
            isDeleted: false,
            status: "active",
        })
            .select('username firstName profilePicture age gender bio')
            .sort({ createdAt: -1 })
        // .limit(10);

        console.log("users", users);


        return res.status(200).json({

            success: true,
            message: `Fetched discoveries Successfully!`,
            users,
            total: users.length,
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getDiscoverUsers API!"
        })
    }
}

// meProfile
export const meProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Fetched LoggedIn User Profile",
            user,
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getDiscoverUsers API!"
        })
    }
}

// userProfileByUserId
export const userProfileByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Fetched User Profile by Id",
            user,
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getDiscoverUsers API!"
        })
    }
}

// updatePreferences
export const updatePreferences = async (req, res) => {
    try {
        const userId = req.user._id;
        const { minAge, maxAge, maxDistance, gender } = req.body;

        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }

        if (minAge < 18) {
            return res.status(400).json({
                success: false,
                message: "Min age should atleast 18!",
            });
        }

        if (minAge) {
            user.preferences.minAge = Number(minAge);
        }

        if (maxAge) {
            user.preferences.maxAge = Number(maxAge);
        }

        if (maxDistance) {
            user.preferences.maxDistance = Number(maxDistance);
        }

        if (gender) {
            user.preferences.gender = gender;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Preferences Updated Successfully!",
            user,
        })


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getDiscoverUsers API!"
        })
    }
}



// createCheckoutSession
export const createCheckoutSession = async (req, res) => {
    try {
        const { priceId } = req.body;
        const userId = req.user._id;

        if (!priceId) {
            return res.status(400).json({
                success: false,
                message: "Price ID for recurring subscription is required!"
            });
        }

        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "User Not Found!",
            });
        }

        let stripeCustomerId = user.subscription.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripeClient.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                metadata: {
                    userId: userId.toString(),
                },
            });

            stripeCustomerId = customer.id;
            user.subscription.stripeCustomerId = stripeCustomerId;
            await user.save();
        }

        const session = await stripeClient.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: "subscription",
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                }
            ],
            success_url: 'http://localhost:5173/success',
            cancel_url: 'http://localhost:5173/cancel',
            metadata: {
                userId: userId.toString(),
            },
        });

        console.log("session", session);

        return res.status(201).json({
            success: true,
            message: "Checkout session created for recurring subscription!",
            url: session.url,
        })

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in createCheckoutSession API!"
        })
    }
}

// cancelSubscription
export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user || user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "User Not Found!",
            })
        }

        if (!user.subscription.stripeSubscriptionId) {
            return res.status(400).json({
                success: false,
                message: "No active recurring subscription found!"
            })
        }


        const subscription = await stripeClient.subscriptions.update(
            user.subscription.stripeSubscriptionId,
            { cancel_at_period_end: true }
        );

        user.subscriptionHistory.push({
            plan: user.subscription.plan,
            stripeSubscriptionId: user.subscription.stripeSubscriptionId,
            status: 'canceled',
            startDate: new Date(subscription.created * 1000),
            endDate: new Date(subscription.current_period_end * 1000),
        });

        user.subscription.plan = "free";
        user.subscription.expiry = null;
        user.subscription.swipeLimit = 100;
        user.subscription.superlikes = 0;
        user.subscription.boosts = 0;
        user.subscription.stripeSubscriptionId = null;
        user.subscription.lastReset = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Recurring subscription canceled successfully! It will end on " + new Date(subscription.current_period_end * 1000).toLocaleDateString(),
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in cancelSubscription API!"
        })
    }
}
