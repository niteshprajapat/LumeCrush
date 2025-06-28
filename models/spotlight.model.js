import mongoose from "mongoose";

const spotlightSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    pricePerSpotlight: {
        type: Number,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    stripePaymentIntentId: {
        type: String,
        required: true,
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['completed', 'refunded'],
        default: "completed",
    },
    isActive: {
        type: Boolean,
    },
    startTime: {
        type: Date,
    },
    endTime: {
        type: Date,
    },



}, { timestamps: true });

// Index for efficient querying of active spotlights
spotlightSchema.index({ isActive: 1, endTime: 1 });

const Spotlight = mongoose.model("Spotlight", spotlightSchema);
export default Spotlight;