const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const Event = require('../models/Event');

// home route
router.get('/home', async (req, res) => {
    try {

        const events = await Event.find();

        res.render('home', { events });

    } catch (error) {

        console.error(error);
        res.send('Error loading home page');

    }
});

// Registration routes
router.get('/register', authController.showRegister);
router.post('/register', authController.register);

// Login routes
router.get('/login', authController.showLogin);
router.post('/login', authController.login);

// Logout route
router.get('/logout', authController.logout);


module.exports = router;