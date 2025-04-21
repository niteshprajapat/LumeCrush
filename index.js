import express from 'express';
import dotenv from 'dotenv';



const app = express();
const port = process.env.PORT || 5000;


app.get("/health", (req, res) => {
    return res.status(200).json({
        success: false,
        message: "Server is Up for LumeCrush!",
    });
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}!`);
});