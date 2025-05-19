import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({});


const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    }
});


export const sendEmailVerificationToken = async (userEmail, token) => {
    try {
        const info = await transporter.sendMail({
            from: `LumeCrush <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "OTP for account verification",
            text: 'Account Verification OTP',
            html: `<p>OTP for your account verification: ${token}</p>`
        });

        console.log(`OTP email sent. ${info.messageId}`);

    } catch (error) {
        console.log(error);
    }
}


export const sendAccountVerificationEmail = async (userEmail) => {
    try {
        const info = await transporter.sendMail({
            from: `LumeCrush <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Congratulations for account verification",
            text: 'Account Verified',
            html: `<p>Your account has been verified!</p>`
        });

        console.log(`OTP email sent. ${info.messageId}`);

    } catch (error) {
        console.log(error);
    }
}

export const resendEmailVerificationToken = async (userEmail, token) => {
    try {
        const info = await transporter.sendMail({
            from: `LumeCrush <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "OTP for account verification",
            text: 'Account Verification OTP',
            html: `<p>OTP for your account verification: ${token}</p>`
        });

        console.log(`OTP email sent. ${info.messageId}`);

    } catch (error) {
        console.log(error);
    }
}


export const resetPasswordTokenEmail = async (userEmail, token) => {
    try {
        const info = await transporter.sendMail({
            from: `LumeCrush <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Reset Password Token",
            text: 'Reset Password Token',
            html: `<p>Token for reset password: ${token}</p>`
        });

        console.log(`OTP email sent. ${info.messageId}`);

    } catch (error) {
        console.log(error);
    }
}



export const passswordResetSuccessEmail = async (userEmail) => {
    try {
        const info = await transporter.sendMail({
            from: `LumeCrush <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Password Reset Successfully!",
            text: 'Password Reset Successfully',
            html: `<p>Password Reset Successfully!</p>`
        });

        console.log(`OTP email sent. ${info.messageId}`);

    } catch (error) {
        console.log(error);
    }
}