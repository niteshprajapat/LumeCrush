import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },

}, { timestamps: true });

messageSchema.index({ matchId: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;