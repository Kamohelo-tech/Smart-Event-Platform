const User = require('../models/User');

// Authentication middleware - checks if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    return res.redirect('/auth/login');
};

// Authorization middleware - checks if user is admin
const isAdmin = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }

        const user = await User.findById(req.session.userId);

        if (user && user.role === 'Admin') {
            return next();
        }

        return res.status(403).send('Access denied. Admin only.');
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
    }
};

module.exports = { isAuthenticated, isAdmin };
