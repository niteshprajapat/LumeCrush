import Match from "../models/match.model.js";
import VideoCall from "../models/videocall.model.js";
import { logger } from "../utils/logger.js"
// import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { v4 as uuid } from 'uuid';
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;



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