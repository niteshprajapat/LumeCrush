import User from "../models/user.model.js";
import { logger } from "../utils/logger.js"



// Use this api to get latitude and longitude using city name
// https://api.openweathermap.org/data/2.5/weather?q=jodhpur&appid=0318c1563a65f62cbdd1f39c1d54301a


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