import User from "../models/user.model.js";
import { logger } from "../utils/logger.js"
import stripe from 'stripe';
import dotenv from 'dotenv';
import { limits } from "argon2";
dotenv.config({});




const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);


// Use this api to get latitude and longitude using city name
// https://api.openweathermap.org/data/2.5/weather?q=jodhpur&appid=0318c1563a65f62cbdd1f39c1d54301a


// handle WEBHOOK

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("SIG ===> ", sig);
    console.log("webhookSecret ===> ", webhookSecret);
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

                if (!subscriptionId) {
                    logger.error('No subscription ID found in checkout.session.completed event');
                    return res.status(400).json({ success: false, message: 'No subscription created' });
                }

                const user = await User.findById(userId);
                if (!user) {
                    logger.error('User not found for subscription');
                    return res.status(404).json({ success: false, message: 'User not found' });
                }

                const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
                logger.info(`Subscription details: ${JSON.stringify(subscription, null, 2)}`);
                console.log("SUBSCRIPTION => ", subscription);

                const subscriptionItem = subscription.items.data[0];

                // Extract the start and end timestamps
                const currentPeriodStart = subscriptionItem.current_period_start;
                const currentPeriodEnd = subscriptionItem.current_period_end;

                user.subscription.stripeSubscriptionId = subscriptionId;
                user.subscription.plan = 'platinum';
                user.subscription.expiry = new Date(currentPeriodEnd * 1000);
                user.subscription.swipeLimit = 200;
                user.subscription.superlikes = 5;
                user.subscription.boosts = 3;
                user.subscription.lastReset = new Date();

                console.log("Triggered 1");

                user.subscriptionHistory.push({
                    plan: 'platinum',
                    stripeSubscriptionId: subscriptionId,
                    startDate: new Date(currentPeriodStart * 1000),
                    endDate: new Date(currentPeriodEnd * 1000),
                    status: 'active',
                });

                console.log("Triggered 2");


                await user.save();
                logger.info(`Recurring subscription activated for user ${userId}`);


                res.status(200).json({ received: true });

                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                let subId = invoice.subscription;

                if (!subId && invoice.parent && invoice.parent.subscription_details && invoice.parent.subscription_details.subscription) {
                    subId = invoice.parent.subscription_details.subscription;
                }

                // Fallback to invoice.lines.data[0].subscription as a last resort
                if (!subId && invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
                    subId = invoice.lines.data[0].subscription;
                }

                console.log("INVOICE => ", invoice);
                console.log("SUBID => ", subId);

                logger.info(`Processing invoice.payment_succeeded for subscriptionId: ${subId}`);

                if (!subId) {
                    logger.error('No subscription ID found in invoice.payment_succeeded event');
                    return res.status(400).json({ success: false, message: 'No subscription associated with invoice' });
                }

                const userWithSub = await User.findOne({ 'subscription.stripeSubscriptionId': subId });

                if (userWithSub) {
                    const subscription = await stripeClient.subscriptions.retrieve(subId);
                    console.log("DATA => ", subscription);

                    const subscriptionItem = subscription.items.data[0];

                    // Extract the start and end timestamps
                    const currentPeriodStart = subscriptionItem.current_period_start;
                    const currentPeriodEnd = subscriptionItem.current_period_end;

                    userWithSub.subscription.expiry = new Date(currentPeriodEnd * 1000);
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

// New Filters api starts


// getUsersBySameDatingGoals
export const getUsersBySameDatingGoals = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }


        const userPreferences = user.preferences || {};
        const {
            minAge = userPreferences.minAge || 18,
            maxAge = userPreferences.maxAge || 100,
            gender = userPreferences.gender || "all",
            maxDistance = userPreferences.maxDistance || 50,
            lookingFor = user.lookingFor
        } = req.query;


        if (!lookingFor) {
            return res.status(400).json({
                success: false,
                message: "Dating goal is required!"
            });
        }


        const users = await User.find({
            _id: {
                $ne: userId,
            },
            age: {
                $gte: Number(minAge),
                $lte: Number(maxAge)
            },
            gender: gender === "all" ? { in: ["male", "female", "all"] } : gender,
            lookingFor: lookingFor,
            location: {
                $near: {
                    $geometry: user.location,
                    $maxDistance: Number(maxDistance) * 1000  // distance in km to m
                },
            },
            interests: { $in: interests },
            isDeleted: false,
            status: "active",
        }).sort({ createdAt: -1 }).limit(5);


        logger.info(`Fetched users with dating goal: ${lookingFor} for user ${userId}`);
        return res.status(200).json({
            success: true,
            message: "Fetched users with same dating goals successfully!",
            users,
            total: users.length,
        });




    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getUsersBySameDatingGoals API!"
        })
    }
}











// New Filters api ends





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

        if (user.subscription.plan === "platinum" && user.subscription.expiry && new Date(user.subscription.expiry) > new Date()) {
            return res.status(400).json({
                success: false,
                message: `You already have an active Platinum subscription until ${new Date(user.subscription.expiry).toLocaleDateString()}. Please wait until it expires to purchase a new plan.`,
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

        console.log("CANCELSUBSC", subscription);

        const subscriptionItem = subscription.items.data[0];

        // Extract the start and end timestamps
        const currentPeriodStart = subscriptionItem.current_period_start;
        const currentPeriodEnd = subscriptionItem.current_period_end;

        console.log("CANCELSUBSCcurrentPeriodStart", currentPeriodStart);
        console.log("CANCELSUBSCcurrentPeriodEnd", currentPeriodEnd);

        user.subscriptionHistory.push({
            plan: user.subscription.plan,
            stripeSubscriptionId: user.subscription.stripeSubscriptionId,
            status: 'canceled',
            startDate: new Date(currentPeriodStart * 1000),
            endDate: new Date(currentPeriodEnd * 1000),
        });

        user.subscription.plan = "free";
        user.subscription.expiry = new Date(currentPeriodEnd * 1000);
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


// requestRefund
// export const requestRefund = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const user = await User.findById(userId);

//         if (!user || user.isDeleted) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User Not Found!",
//             });
//         }

//         const activeSubscriptionId = user.subscription.stripeSubscriptionId;
//         if (!activeSubscriptionId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No active recurring subscription found for refund!",
//             });
//         }

//         const subscription = await stripeClient.subscriptions.retrieve(activeSubscriptionId);
//         console.log("activeSubscriptionId => ", subscription);

//         const latestInvoice = await stripeClient.invoices.list({
//             subscription: activeSubscriptionId,
//             status: 'paid',
//             limit: 1,
//         });

//         console.log("latestInvoice => ", latestInvoice);

//         // const latestPaidInvoice = latestInvoice.data.find(invoice => invoice.charge && invoice.paid);
//         const latestPaidInvoice = latestInvoice.data.find(invoice => invoice.amount_paid && invoice.status);
//         // if (!latestInvoice.data.length || !latestInvoice.data[0].charge) {

//         console.log("latestPaidInvoice", latestPaidInvoice);
//         if (!latestPaidInvoice) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No recent paid invoice with a charge found for refund!",
//             });
//         }

//         // const paymentIntentId = latestPaidInvoice.data[0].charge;
//         const paymentIntentId = latestPaidInvoice.status;
//         const paymentDate = new Date(latestPaidInvoice.created * 1000);
//         const daysSincePayment = (Date.now() - paymentDate) / (24 * 60 * 60 * 1000);

//         if (daysSincePayment > 7) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Refund request is outside the 7-day refund policy window for recurring payments!",
//             });
//         }

//         const refund = await stripeClient.refunds.create({
//             charge: paymentIntentId,
//             reason: "requested_by_customer",
//         });

//         // Cancel the subscription to prevent further charges
//         await stripeClient.subscriptions.update(
//             activeSubscriptionId,
//             { cancel_at_period_end: true },
//         );

//         const subscriptionEntry = user.subscriptionHistory.find(
//             entry => entry.stripeSubscriptionId === activeSubscriptionId
//         );

//         if (subscriptionEntry) {
//             subscriptionEntry.status = 'refunded';
//             subscriptionEntry.endDate = new Date();
//         } else {
//             user.subscriptionHistory.push({
//                 plan: user.subscription.plan,
//                 stripeSubscriptionId: activeSubscriptionId,
//                 startDate: new Date(subscription.created * 1000),
//                 endDate: new Date(),
//                 status: 'refunded',
//             });
//         }

//         user.subscription.plan = 'free';
//         user.subscription.expiry = new Date();
//         user.subscription.swipeLimit = 100;
//         user.subscription.superlikes = 0;
//         user.subscription.boosts = 0;
//         user.subscription.stripeSubscriptionId = null;
//         user.subscription.lastReset = new Date();
//         await user.save();

//         return res.status(200).json({
//             success: true,
//             message: "Refund processed successfully for recurring subscription!",
//             refundId: refund.id,
//         });



//     } catch (error) {
//         logger.error(error);
//         return res.status(500).json({
//             success: false,
//             message: "Error in requestRefund API!"
//         })
//     }
// }



// requestRefund
export const requestRefund = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }

        const activeSubscriptionId = user.subscription.stripeSubscriptionId;
        if (!activeSubscriptionId) {
            return res.status(400).json({
                success: false,
                message: "No active recurring subscription found for refund!",
            });
        }

        const subscription = await stripeClient.subscriptions.retrieve(activeSubscriptionId);
        logger.debug("Retrieved subscription: ", JSON.stringify(subscription, null, 2));

        const latestInvoices = await stripeClient.invoices.list({
            subscription: activeSubscriptionId,
            status: 'paid',
            limit: 1,
        });

        logger.debug("Latest invoices: ", JSON.stringify(latestInvoices, null, 2));

        if (!latestInvoices.data.length || !latestInvoices.data[0].charge) {
            logger.error("No paid invoice with a charge found for subscription ID: " + activeSubscriptionId);
            return res.status(400).json({
                success: false,
                message: "No recent paid invoice with a charge found for refund!",
            });
        }

        const latestPaidInvoice = latestInvoices.data[0];
        const chargeId = latestPaidInvoice.charge;
        const paymentDate = new Date(latestPaidInvoice.created * 1000);
        const daysSincePayment = (Date.now() - paymentDate) / (24 * 60 * 60 * 1000);

        logger.debug("Charge ID: ${chargeId}, Payment Date: ", paymentDate.toLocaleString(), ", Days Since Payment: ", daysSincePayment);

        if (daysSincePayment > 7) {
            logger.warn(`Refund request denied for user ${userId}: Payment is ${daysSincePayment.toFixed(2)} days old, outside 7-day policy`);
            return res.status(400).json({
                success: false,
                message: "Refund request is outside the 7-day refund policy window for recurring payments!",
            });
        }

        // Check if charge has already been refunded
        const charge = await stripeClient.charges.retrieve(chargeId);
        if (charge.refunded) {
            logger.warn(`Charge ${chargeId} already refunded for user ${userId}`);
            return res.status(400).json({
                success: false,
                message: "This payment has already been refunded!",
            });
        }

        const refund = await stripeClient.refunds.create({
            charge: chargeId,
            reason: "requested_by_customer",
            metadata: { subscription_id: activeSubscriptionId },
        });

        logger.info(`Refund created for user ${userId}, refund ID: ${refund.id}`);

        // Cancel the subscription to prevent further charges
        await stripeClient.subscriptions.update(
            activeSubscriptionId,
            { cancel_at_period_end: true }
        );

        // Update subscription history
        const subscriptionEntry = user.subscriptionHistory.find(
            entry => entry.stripeSubscriptionId === activeSubscriptionId && entry.status !== 'refunded'
        );
        if (subscriptionEntry) {
            subscriptionEntry.status = 'refunded';
            subscriptionEntry.endDate = new Date();
        } else {
            user.subscriptionHistory.push({
                plan: user.subscription.plan,
                stripeSubscriptionId: activeSubscriptionId,
                startDate: new Date(subscription.created * 1000),
                endDate: new Date(),
                status: 'refunded',
            });
        }

        // Reset user subscription to free plan
        user.subscription.plan = 'free';
        user.subscription.expiry = null;
        user.subscription.swipeLimit = 100;
        user.subscription.superlikes = 0;
        user.subscription.boosts = 0;
        user.subscription.stripeSubscriptionId = null;
        user.subscription.lastReset = new Date();
        await user.save();

        logger.info(`User ${userId} subscription reset to free after refund`);

        return res.status(200).json({
            success: true,
            message: "Refund processed successfully for recurring subscription!",
            refundId: refund.id,
        });
    } catch (error) {
        logger.error(`Error in requestRefund API for user ${req.user._id}: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: `Error in requestRefund API: ${error.message}`,
        });
    }
};



// getBillingDetails
export const getBillingDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user || user.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "User Not Found!",
            });
        }


        if (!user.subscription.stripeSubscriptionId) {
            return res.status(200).json({
                success: true,
                message: "No active subscription found",
                subscription: {
                    plan: user.subscription.plan,
                    status: "inactive",
                    nextBillingDate: null,
                }
            });
        }


        const subscription = await stripeClient.subscriptions.retrieve(user.subscription.stripeSubscriptionId);


        // Calculate current_period_end
        // const billingCycleAnchorDate = new Date(subscription.billing_cycle_anchor * 1000);
        // const currentPeriodEndDate = new Date(
        //     billingCycleAnchorDate.setMonth(billingCycleAnchorDate.getMonth() + subscription.plan.interval_count)
        // );
        // const currentPeriodEnd = Math.floor(currentPeriodEndDate.getTime() / 1000);

        // const nextBillingDate = new Date(currentPeriodEnd)

        const nextBillingDate = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
            : null;

        console.log("BILL SUBSC", subscription);

        return res.status(200).json({
            success: true,
            message: "Billing details fetched successfully!",
            subscription: {
                plan: user.subscription.plan,
                status: subscription.status,
                nextBillingDate,
                subscriptionId: user.subscription.stripeSubscriptionId,
            },
        })


    } catch (error) {
        logger.error(`Error in getBillingDetails API`);
        return res.status(500).json({
            success: false,
            message: `Error in getBillingDetails API: ${error.message}`,
        });
    }
}



// getInvoices
export const getInvoices = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }

        if (!user.subscription.stripeCustomerId) {
            return res.status(200).json({
                success: true,
                message: "No invoices found.",
                invoices: [],
            });
        }

        const invoices = await stripeClient.invoices.list({
            customer: user.subscription.stripeCustomerId,
            limit: 10,
        });

        console.log("INVOIS", invoices);

        const invoiceData = await Promise.all(
            invoices.data.map((invoice) => {
                let refundStatus = 'no_charge';
                if (invoice.charge) {
                    console.log("this hit?")
                    const charge = stripeClient.charges.retrieve(invoice.charge);
                    refundStatus = charge.refunded ? 'refunded' : 'not_refunded';
                }
                return {
                    id: invoice.id,
                    amount: invoice.total / 100,
                    currency: invoice.currency,
                    date: new Date(invoice.created * 1000).toLocaleDateString(),
                    status: invoice.status,
                    invoiceUrl: invoice.hosted_invoice_url,
                    pdfUrl: invoice.invoice_pdf,
                    refundStatus,
                };
            })
        )


        return res.status(200).json({
            success: true,
            message: "Invoices fetched successfully!",
            invoices: invoiceData,
            total: invoiceData.length,
        });


    } catch (error) {
        logger.error(`Error in getInvoices API`);
        return res.status(500).json({
            success: false,
            message: `Error in getInvoices API: ${error.message}`,
        });
    }
}