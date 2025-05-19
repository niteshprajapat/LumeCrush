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

        const messages = await Message.find({ matchId: matchId, isDeleted: false });

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

// deleteMessagesBymessageId
export const deleteMessagesBymessageId = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const senderId = req.user._id;

        const message = await Message.findById(messageId);
        if (message.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Message Already Deleted! Message Not Found!"
            });
        }

        if (message.sender.toString() !== senderId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You can't delete this message! You can only delete your own message!",
            });
        }

        message.isDeleted = true;
        await message.save();

        return res.status(200).json({
            success: true,
            message: "Message Deleted Successfully!",
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getMessagesByMatchId API!"
        })
    }
}


// updateMessagesBymessageId
export const updateMessagesBymessageId = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const senderId = req.user._id;

        const message = await Message.findById(messageId);
        if (message.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "Message Already Deleted! Message Not Found!"
            });
        }

        if (message.sender.toString() !== senderId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You can't delete this message! You can only delete your own message!",
            });
        }

        message.isDeleted = true;
        await message.save();

        return res.status(200).json({
            success: true,
            message: "Message Deleted Successfully!",
        });

    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getMessagesByMatchId API!"
        })
    }
}