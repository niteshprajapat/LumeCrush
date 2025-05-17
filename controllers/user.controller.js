import User from "../models/user.model.js";
import { logger } from "../utils/logger.js"



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