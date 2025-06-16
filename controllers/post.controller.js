import cloudinary from "../config/cloudinary.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { logger } from "../utils/logger.js";



// createPost
export const createPost = async (req, res) => {
    try {
        const userId = req.user._id;
        const file = req.file;

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File is required!",
            });
        }


        const user = await User.findById(userId);
        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "User Not Found!",
            });
        }

        // check post limit to only 6
        if (user.images.length >= 6) {
            return res.status(400).json({
                success: false,
                message: "You have reached the maximum limit of 6 photos!"
            })
        }


        let media = {
            url: "",
            public_id: "",
        }

        if (file) {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "lumecrush_posts"
            });

            media.url = result.secure_url;
            media.public_id = result.public_id;
        }

        const post = await Post.create({
            userId,
            media,
        });


        if (post) {
            user.images.push(post._id);
            await user.save();
            await post.save();
        }


        return res.status(201).json({
            success: true,
            message: "Post Created Successfully!",
            post,
        })

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in swipeUser API!"
        })
    }
}