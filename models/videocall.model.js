import mongoose from "mongoose";

const videoCallSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
        required: true,
    },
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
    channelName: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "ended"],
        default: "active",
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    recording: {
        status: {
            type: String,
            enum: ["none", "started", "stopped"],
            default: "none",
        },
        recordingId: {
            type: String,
            default: "",
        },
        resourceId: {
            type: String,
            default: "",
        },
    }


}, { timestamps: true });

const VideoCall = mongoose.model("VideoCall", videoCallSchema);
export default VideoCall;