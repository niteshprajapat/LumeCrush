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
    images: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        }
    ],
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
    starSign: {
        type: String,
        enum: [
            "aries",
            "taurus",
            "gemini",
            "cancer",
            "leo",
            "virgo",
            "libra",
            "scorpio",
            "sagittarius",
            "capricorn",
            "aquarius",
            "pisces"
        ],
        required: true,
    },
    religion: {
        type: String,
        enum: [
            "hindu",
            "muslim",
            "christian",
            "sikh",
            "buddhist",
            "jain",
            "jewish",
            "parsi",
            "bahai",
            "spiritual",
            "atheist",
            "agnostic",
            "other"
        ],
        default: "other",
        required: true,
    },
    lookingFor: {
        type: String,
        enum: [
            "long-term relationship",
            "fun casual dates",
            "marriage",
            "intemacy without commitment",
            "a life partner",
            "ethical non-monogamy",
        ],
        required: true,
    },




    subscription: {
        plan: { type: String, enum: ['free', 'platinum'], default: 'free' },
        expiry: { type: Date, default: null }, // Null for Free plan
        swipeLimit: { type: Number, default: 100 }, // Daily limit for Free plan
        boosts: { type: Number, default: 0 }, // Platinum feature
        superlikes: { type: Number, default: 0 }, // Platinum feature
        stripeCustomerId: { type: String, default: null },
        stripeSubscriptionId: { type: String, default: "" },
        lastReset: { type: Date, default: Date.now },
    },
    subscriptionHistory: [
        {
            plan: {
                type: String,
                enum: ["free", "platinum"],
            },
            stripeSubscriptionId: {
                type: String,
            },
            startDate: { type: Date, default: null },
            endDate: { type: Date, default: null },
            status: {
                type: String,
                enum: ["active", "canceled", "refunded"],
            },
        }
    ],

    emailVerificationToken: {
        type: String,
    },
    emailVerificationTokenExpires: {
        type: Date,
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordTokenExpires: {
        type: Date,
    }


}, { timestamps: true });



// Validation to limit images to 6
userSchema.path('images').validate(function (value) {
    return value.length <= 6;
}, 'Cannot upload more than 6 photos.');

// Indexes for performance
userSchema.index({ location: '2dsphere' }); // Geospatial queries for users
userSchema.index({ email: 1 }); // Fast email lookups
userSchema.index({ role: 1 }); // Fast role-based queries


const User = mongoose.model("User", userSchema);
export default User;