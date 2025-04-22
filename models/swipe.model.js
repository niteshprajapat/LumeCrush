import mongoose from "mongoose";

const swipeSchema = new mongoose.Schema({
    swiper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    action: {
        type: String,
        enum: ["like", "pass", "superLike"],
        required: true,
    },

}, { timestamps: true });


swipeSchema.index({ swiper: 1, target: 1 }, { unique: true });

const Swipe = mongoose.model("Swipe", swipeSchema);
export default Swipe;