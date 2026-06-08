const mongoose = require('mongoose');
const bcrypt   = require("bcrypt");

const userSchema = new mongoose.Schema({
    // 1. The Name
    name: {
        type: String,
        required: [true, 'Please provide a full name'],
        trim: true,
        minlength: [2,   "Name must be at least 2 characters"],
        maxlength: [100, "Name cannot exceed 100 characters"],
    },
    
    // 2. The Email (Used for logging in)
    email: {
        type: String,
        required: [true, 'Please provide an email address'],
        unique: true, // CRITICAL: This ensures no two users can register with the exact same email!
        trim:     true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please add a valid email'
        ]
    },
    
    // 3. The Password
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [8, 'Password must be at least 8 characters'], // Basic security requirement
        select:    false, // Never returned in queries by default
    },
    
    // 4. The Role (Admin vs Standard User)
    role: {
        type: String,
        enum: {
            values: ['User', 'Admin'],
            message: "Role must be either 'User' or 'Admin'"
        },
        default: 'User' // Anyone who registers on the website is a standard 'User' by default
    }
}, {
    // Automatically creates 'createdAt' and 'updatedAt' dates
    timestamps: true 
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// --- Database Indexes (Performance Optimization) ---
userSchema.index({ role: 1 });

// --- Instance Method (Security: Login Verification) ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// --- Instance Method (Data Privacy: Safe Payload) ---
userSchema.methods.toSafeObject = function () {
  const { _id, name, email, role, createdAt } = this.toObject();
  return { _id, name, email, role, createdAt };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;