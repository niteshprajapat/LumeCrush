import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

}, { timestamps: true });

matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

const Match = mongoose.model("Match", matchSchema);
export default Match;