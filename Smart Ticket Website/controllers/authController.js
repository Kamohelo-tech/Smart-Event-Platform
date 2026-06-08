const User = require('../models/User');
const bcrypt = require('bcrypt');

// Show registration page
const showRegister = (req, res) => {
    res.render('user_auth', { error: null });
};

// Handle registration
const register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('user_auth', { error: 'Passwords do not match' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('user_auth', { error: 'Email already registered' });
        }

        // Create user — password hashing is handled by the pre-save hook in User model
        const user = new User({
            name,
            email,
            password,
            role: 'User'
        });

        await user.save();
        res.redirect('/auth/login');

    } catch (error) {
        console.error(error);
        res.render('user_auth', { error: 'Registration failed. Please try again.' });
    }
};

// Show login page
const showLogin = (req, res) => {
    res.render('user_auth', { error: null });
};

// Handle login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('user_auth', { error: 'Email and password are required' });
        }

        // Find user by email and explicitly select password (select: false in schema)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.render('user_auth', { error: 'Invalid email or password' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('user_auth', { error: 'Invalid email or password' });
        }

        // Create session
        req.session.userId = user._id;
        req.session.userRole = user.role;
        req.session.loginSuccess = true;

        console.log('Login successful for user:', user.email, 'Role:', user.role);

        // Redirect based on role
        if (user.role === 'Admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/events');

    } catch (error) {
        console.error(error);
        res.render('user_auth', { error: 'Login failed. Please try again.' });
    }
};

// Handle logout
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/auth/login');
    });
};

module.exports = { showRegister, register, showLogin, login, logout };
