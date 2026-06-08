const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleWare/authMiddleware');

router.get('/dashboard', isAuthenticated, isAdmin, adminController.getDashboard);

module.exports = router;