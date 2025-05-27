import express from 'express';
import { forgotPassword, login, register, resendToken, verifyAccount, resetPassword } from '../controllers/auth.controller.js';


const router = express.Router();



router.post("/register", register);
router.post("/login", login);
// logout
router.post("/verify-account", verifyAccount);
router.post("/resend-token", resendToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
// change pwd
// google login
// github login



export default router;

