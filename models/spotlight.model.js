import mongoose from "mongoose";

const spotlightSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    quantity: {
        type: Number
    }



}, { timestamps: true });


swipeSchema.index({ swiper: 1, target: 1 }, { unique: true });

const Spotlight = mongoose.model("Spotlight", spotlightSchema);
export default Spotlight;