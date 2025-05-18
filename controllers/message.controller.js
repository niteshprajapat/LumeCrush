import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";



// sendMessage
export const sendMessage = async (req, res) => {
    try {
        const { matchId, content, receiverId } = req.body;
        const senderId = req.user._id;

        if (!matchId || !content || !receiverId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!",
            });
        }

        const message = await Message.create({
            matchId,
            content,
            sender: senderId,
            receiver: receiverId,
        });

        await Notification.create({
            receiver: receiverId,
            sender: senderId,
            type: "message",
            content: "New message received",
        });


        return res.status(201).json({
            success: true,
            message: "Message Send Successfully!",
            message,
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in sendMessage API!"
        })
    }
}

// getMessagesByMatchId
export const getMessagesByMatchId = async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const senderId = req.user._id;

        const messages = await Message.find({ matchId: matchId });

        return res.status(200).json({
            success: true,
            message: "Fetched Messages using Match Id Successfully!",
            messages,
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getMessagesByMatchId API!"
        })
    }
}