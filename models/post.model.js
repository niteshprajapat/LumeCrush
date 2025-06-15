import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    media: {
        url: {
            type: String,
            default: "",
        },
        public_id: {
            type: String,
            default: "",
        },
    },
    order: {
        type: Number,
    },

}, { timestamps: true });


const Post = mongoose.model("Post", postSchema);
export default Post;