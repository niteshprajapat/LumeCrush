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

// deletePost
export const deletePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const postId = req.params.postId;



        const user = await User.findById(userId);
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post Not Found!",
            });
        }

        if (post.userId.toString() !== userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You can only delete your own post!",
            });
        }


        if (post.media.public_id) {
            try {
                await cloudinary.uploader.destroy(post.media.public_id);
            } catch (cloudinaryError) {
                logger.error("Cloudinary deletion failed:", cloudinaryError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete media from Cloudinary!",
                });
            }
        }

        post.media.public_id = "";
        post.media.url = "";
        await post.save();

        user.images = user.images.filter((image) => image.toString() !== postId.toString());
        await user.save();






        logger.info(`Post ${postId} deleted by user ${userId}`);


        return res.status(201).json({
            success: true,
            message: "Post Deleted Successfully!",
        })

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in deletePost API!"
        })
    }
}