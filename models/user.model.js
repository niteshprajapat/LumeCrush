import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        url: {
            type: String,
            default: "",
        },
        public_id: {
            type: String,
            default: "",
        },
    },
    age: {
        type: Number,
        required: true,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
    },
    bio: {
        type: String,
        default: "",
    },
    interests: [
        {
            type: String,
            required: true,
        }
    ],
    preferences: {
        minAge: { type: Number, default: 18 },
        maxAge: { type: Number, default: 100 },
        maxDistance: { type: Number, default: 50 },     // 50km
        gender: {
            type: String,
            enum: ["male", "female", "other", "all"],
            default: "all",
        },
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["active", "suspended", "banned"],
        default: "active",
    },
    subscription: {
        plan: { type: String, enum: ['free', 'platinum'], default: 'free' },
        expiry: { type: Date, default: null }, // Null for Free plan
        swipeLimit: { type: Number, default: 100 }, // Daily limit for Free plan
        boosts: { type: Number, default: 0 }, // Platinum feature
        superlikes: { type: Number, default: 0 }, // Platinum feature
    },

    emailVerificationToken: {
        type: String,
    },
    emailVerificationTokenExpires: {
        type: Date,
    }


}, { timestamps: true });


// Indexes for performance
userSchema.index({ location: '2dsphere' }); // Geospatial queries for users
userSchema.index({ email: 1 }); // Fast email lookups
userSchema.index({ role: 1 }); // Fast role-based queries


const User = mongoose.model("User", userSchema);
export default User;