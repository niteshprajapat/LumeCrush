import dotenv from 'dotenv';
import Match from "../models/match.model.js";
import VideoCall from "../models/videocall.model.js";
import { logger } from "../utils/logger.js"
// import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { v4 as uuid } from 'uuid';
import pkg from 'agora-access-token';
import axios from "axios";
import User from '../models/user.model.js';
const { RtcTokenBuilder, RtcRole } = pkg;


dotenv.config({});




const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;


// startVideoCall
export const startVideoCall = async (req, res) => {
    try {
        const { matchId } = req.body;
        const userId = req.user._id;

        if (!matchId) {
            return res.status(404).json({
                success: false,
                message: "Match Id Not Found!",
            });
        }


        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: "Match Not Found!",
            });
        }

        // loggedIn user should one of them!
        if (match.user1.toString() !== userId.toString() && match.user2.toString() !== userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You are not a part of this Match!",
            });
        }


        const channelName = `video-call-${uuid()}`;
        const uid = userId.toString();
        const role = RtcRole.PUBLISHER;
        const currentTime = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTime + 3600;

        const token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channelName,
            uid,
            role,
            privilegeExpireTime
        );

        const videoCall = await VideoCall.create({
            matchId,
            user1: match.user1,
            user2: match.user2,
            channelName,
            status: "active",
        });

        return res.status(201).json({
            success: true,
            message: "Video call started successfully!",
            videocall: {
                _id: videoCall._id,
                channelName,
                token,
            }
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in startVideoCall API!",
        });
    }
}

// endVideoCall
export const endVideoCall = async (req, res) => {
    try {
        const { videoCallId } = req.body;
        const userId = req.user._id;

        if (!videoCallId) {
            return res.status(400).json({
                success: false,
                message: "videoCallId is required!",
            });
        }

        const videoCall = await VideoCall.findById(videoCallId);
        if (!videoCall || videoCall.isDeleted) {
            return res.status(400).json({
                success: false,
                message: "VideoCall Not Found!",
            });
        }

        if (videoCall.user1.toString() !== userId.toString() && videoCall.user2.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not part of this video call!",
            });
        }


        if (videoCall.status === "ended") {
            return res.status(404).json({
                success: false,
                message: "Video call is already Ended!",
            });
        }


        videoCall.status = "ended";
        videoCall.isDeleted = true;
        videoCall.endTime = new Date();
        await videoCall.save();

        return res.status(200).json({
            success: true,
            message: "Video call ended successfully!",
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in endVideoCall API!",
        });
    }
}

// startRecording
export const startRecording = async (req, res) => {
    try {
        const { videoCallId } = req.body;
        const userId = req.user._id;

        if (!videoCallId) {
            return res.status(400).json({
                success: false,
                message: "Video call ID is required!",
            });
        }

        const videoCall = await VideoCall.findById(videoCallId);
        if (!videoCall) {
            return res.status(404).json({
                success: false,
                message: "Video call not found!",
            });
        }

        if (videoCall.user1.toString() !== userId.toString() && videoCall.user2.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not part of this video call!",
            });
        }

        if (videoCall.recording.status === "started") {
            return res.status(400).json({
                success: false,
                message: "Recording already started!",
            });
        }


        const channelName = videoCall.channelName;
        const uid = 0;
        const role = RtcRole.SUBSCRIBER;

        const token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channelName,
            uid,
            role,
        );

        // Acquire a resource ID from Agora
        const acquireResponse = await axios.post(`https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/acquire`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {},
        }, {
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`
                ).toString("base64")}`,
                "Content-Type": "application/json",
            },
        });

        const resourceId = acquireResponse.data.resourceId;

        // Start recording with Cloudinary storage configuration
        const startResponse = await axios.post(`https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {
                token,
                recordingConfig: {
                    maxIdleTime: 30,
                    streamTypes: 2,
                    channelType: 0,
                },
                storageConfig: {
                    vendor: 2, // Cloudinary
                    region: 0, // Not used for Cloudinary
                    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                    apiKey: process.env.CLOUDINARY_API_KEY,
                    apiSecret: process.env.CLOUDINARY_API_SECRET,
                    fileNamePrefix: ["video_calls", channelName],
                },
            }
        }, {
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`
                ).toString("base64")}`,
                "Content-Type": "application/json",
            }
        });

        videoCall.recording.status = "started";
        videoCall.recording.resourceId = resourceId;
        videoCall.recording.recordingId = uid.toString();
        await videoCall.save();

        return res.status(200).json({
            success: true,
            message: "Recording started successfully!",
            resourceId,
            recordingId: uid.toString(),
        });



    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in startRecording API!",
        });
    }
}

// stopRecording
export const stopRecording = async (req, res) => {
    try {
        const { videoCallId } = req.body;
        const userId = req.user._id;

        if (!videoCallId) {
            return res.status(400).json({
                success: false,
                message: "Video call ID is required!",
            });
        }

        const videoCall = await VideoCall.findById(videoCallId);
        if (!videoCall) {
            return res.status(404).json({
                success: false,
                message: "Video call not found!",
            });
        }

        if (
            videoCall.user1.toString() !== userId.toString() &&
            videoCall.user2.toString() !== userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not part of this video call!",
            });
        }


        if (videoCall.recording.status !== "started") {
            return res.status(400).json({
                success: false,
                message: "No active recording to stop!",
            });
        }


        const resourceId = videoCall.recording.resourceId;
        const recordingId = videoCall.recording.recordingId;

        // Stop the Agora cloud recording

        const stopResponse = await axios.post(
            `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${recordingId}/mode/mix/stop`,
            {
                cname: videoCall.channelName,
                uid: recordingId,
                clientRequest: {},
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`
                    ).toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );


        const fileList = stopResponse.data?.fileList || [];
        const videoUrl = fileList.length > 0 ? fileList[0].fileName : null;

        if (!videoUrl) {
            throw new Error("No video file URL returned from Agora!");
        }

        videoCall.recording.status = "stopped";
        videoCall.recording.cloudinaryUrl = videoUrl;
        await videoCall.save();

        return res.status(200).json({
            success: true,
            message: "Recording stopped and uploaded to Cloudinary successfully!",
            cloudinaryUrl: videoUrl,
        });


    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in startRecording API!",
        });
    }
}



// getAllVideoCalls
export const getAllVideoCalls = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access this route!",
            });
        }

        const videoCalls = await VideoCall.find()
            .populate("user1", "username firstName")
            .populate("user2", "username firstName")
            .populate("matchId");

        return res.status(200).json({
            success: true,
            message: "Fetched all video calls successfully!",
            videoCalls,
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            success: false,
            message: "Error in getAllVideoCalls API!",
            error: error.message,
        });
    }
};