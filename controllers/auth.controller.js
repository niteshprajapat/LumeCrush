import User from "../models/user.model.js";
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { logger } from "../utils/logger.js"
import { resendEmailVerificationToken, resetPasswordTokenEmail, sendAccountVerificationEmail, sendEmailVerificationToken } from "../services/emailHandler.js";


// register
export const register = async (req, res) => {
    try {
        const { username, firstName, lastName, email, password, age, gender, interests, location } = req.body;

        if (!username || !firstName || !lastName || !email || !password || !age || !gender || !interests || !location) {
            logger.error("All fields are required!");
            return res.status(404).json({
                success: false,
                message: "All fields are required!",
            })
        }

        if (age < 18) {
            logger.info("Age should above 18 years!");
            return res.status(400).json({
                success: false,
                message: "Age should above 18 years!",
            })
        }


        if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
            logger.error("Invalid location coordinates! Must be [longitude, latitude].");
            return res.status(400).json({
                success: false,
                message: "Invalid location coordinates! Must be [longitude, latitude]."
            });
        }

        // Validate longitude (-180 to 180) and latitude (-90 to 90)
        const [longitude, latitude] = location.coordinates;
        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            logger.error("Invalid coordinates! Longitude must be -180 to 180, latitude -90 to 90.");
            return res.status(400).json({
                success: false,
                message: "Invalid coordinates! Longitude must be -180 to 180, latitude -90 to 90.",
            });
        }

        const isEmailExists = await User.findOne({ email });
        if (isEmailExists) {
            logger.info("Email already Exists!");
            return res.status(400).json({
                success: false,
                message: "Email already Exists!",
            });
        }

        const isUsernameExists = await User.findOne({ username });
        if (isUsernameExists) {
            logger.info("Username already Exists!");
            return res.status(400).json({
                success: false,
                message: "Username already Exists!",
            });
        }

        console.log("interests", interests);
        const data = interests.split(",").map((interest) => interest.trim());



        // Password hash
        const hashedPassword = await argon2.hash(password);

        const user = await User.create({
            username,
            firstName,
            lastName,
            email,
            password: hashedPassword,
            age,
            gender,
            interests: data,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        });

        user.password = undefined;

        logger.info("User Registered Successfully!")

        return res.status(201).json({
            success: true,
            message: "User Registered Successfully!",
            user,
        })

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in Register API!",
        });
    }
}

// login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            logger.error("All fields are required!");
            return res.status(404).json({
                success: false,
                message: "All fields are required!",
            })
        }

        const user = await User.findOne({ email });
        if (!user) {
            logger.error("Invalid Credentials!");
            return res.status(404).json({
                success: false,
                message: "Invalid Credentials!",
            })
        }

        const isPasswordMatched = await argon2.verify(user.password, password);
        if (!isPasswordMatched) {
            logger.error("Invalid Credentials!");
            return res.status(404).json({
                success: false,
                message: "Invalid Credentials!",
            })
        }



        if (user.isVerified) {
            // token
            const payload = {
                _id: user._id,
            }

            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
                expiresIn: '1d',
            });

            user.password = undefined;

            logger.info("User LoggedIn Successfully!")

            return res.status(200).json({
                success: true,
                message: "User LoggedIn Successfully!",
                user,
                token,
            });

        } else {

            const min = Math.pow(10, 5);
            const max = Math.pow(10, 6) - 1;
            const verificationToken = crypto.randomUUID(min, max);

            user.emailVerificationToken = verificationToken;
            user.emailVerificationTokenExpires = new Date(Date.now() + 5 * 60 * 1000);

            await user.save();

            // send verification email;
            await sendEmailVerificationToken(user.email, verificationToken);

            return res.status(200).json({
                success: true,
                message: "Email Verification token has been sent to your Email",
            });



        }





    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in Login API!",
        });
    }
}



// verifyEmail
export const verifyAccount = async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(404).json({
                success: false,
                message: "All fileds are required!",
            });
        }

        const user = await User.findOne({ email });

        if (!token || !user.emailVerificationToken) {
            return res.status(400).json({
                success: false,
                message: "Invalid Request!",
            });
        }

        if (Date.now() > user.emailVerificationTokenExpires) {
            return res.status(400).json({
                success: false,
                message: "Token Expired!",
            });
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpires = undefined;

        await user.save();

        await sendAccountVerificationEmail(user.email);

        return res.status(200).json({
            success: true,
            message: "Account Verified Successfully!",
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in verifyAccount API!",
        });
    }
}

// resendToken
export const resendToken = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email is required!",
            });
        }

        const user = await User.findOne({ email });

        const min = Math.pow(10, 5);
        const max = Math.pow(10, 6) - 1;
        const verificationToken = crypto.randomUUID(min, max);

        user.emailVerificationToken = verificationToken;
        user.emailVerificationTokenExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        await resendEmailVerificationToken(user.email, verificationToken);

        return res.status(200).json({
            success: true,
            message: "Resend token Successfully!",
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in verifyAccount API!",
        });
    }
}


// forgotPassword
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email is required!",
            });
        }

        const user = await User.findOne({ email });

        const min = Math.pow(10, 5);
        const max = Math.pow(10, 6) - 1;
        const resetToken = crypto.randomUUID(min, max);

        user.resetPasswordToken = resetToken;
        user.resetPasswordTokenExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        await resetPasswordTokenEmail(user.email, resetToken);

        return res.status(200).json({
            success: true,
            message: "Reset Password Token sent Successfully!",
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in verifyAccount API!",
        });
    }
}
