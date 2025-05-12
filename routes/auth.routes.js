import express from 'express';
import { login, register, verifyAccount } from '../controllers/auth.controller.js';


const router = express.Router();



router.post("/register", register);
router.post("/login", login);
router.post("/verify-account", verifyAccount);


export default router;

