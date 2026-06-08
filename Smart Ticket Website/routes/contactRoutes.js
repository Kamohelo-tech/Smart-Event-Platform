// Routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { isAuthenticated, isAdmin } = require('../middleWare/authMiddleware');

// Public routes
router.get('/', contactController.showContactForm);
router.post('/submit', contactController.submitEnquiry);

// Admin routes
router.get('/admin/enquiries', isAuthenticated, isAdmin, contactController.getAllEnquiries);
router.post('/admin/read/:id', isAuthenticated, isAdmin, contactController.markAsRead);
router.post('/admin/resolved/:id', isAuthenticated, isAdmin, contactController.markAsResolved);
router.post('/admin/delete/:id', isAuthenticated, isAdmin, contactController.deleteEnquiry);

module.exports = router;
