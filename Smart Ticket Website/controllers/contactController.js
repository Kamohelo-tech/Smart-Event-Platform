// controllers/contactController.js
const Contact = require('../Smart-Event-Platform/Models/Enquiry');

// Show contact form
const showContactForm = (req, res) => {
    res.render('contact', { 
        user: req.session ? req.session.userId : null 
    });
};

// Submit contact enquiry (Refactored to return JSON for your frontend fetch API)
const submitEnquiry = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        
        // Create new contact enquiry
        const contact = new Contact({
            name,
            email,
            subject,
            message,
            status: 'Unread' // Matches your strict Schema Enum perfectly
        });
        
        await contact.save();
        
        // Return JSON success response back to contact.ejs
        res.status(201).json({ success: true, message: 'Message sent successfully!' });
        
    } catch (error) {
        console.error("Enquiry Error: ", error.message);
        res.status(500).json({ success: false, error: 'Failed to submit enquiry. Please try again.' });
    }
};

// ... keep your existing getAllEnquiries, markAsRead, markAsResolved, and deleteEnquiry functions down here ...

// ADMIN: Get all enquiries
const getAllEnquiries = async (req, res) => {
    try {
        const enquiries = await Contact.find().sort({ submittedAt: -1 });
        
        const stats = {
            total: enquiries.length,
            unread: enquiries.filter(e => e.status === 'unread').length,
            read: enquiries.filter(e => e.status === 'read').length,
            resolved: enquiries.filter(e => e.status === 'resolved').length
        };
        
        res.render('adminEnquiries', { 
            enquiries, 
            stats,
            user: req.session.userId
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading enquiries');
    }
};

// ADMIN: Mark enquiry as read
const markAsRead = async (req, res) => {
    try {
        const enquiryId = req.params.id;
        await Contact.findByIdAndUpdate(enquiryId, { status: 'read' });
        res.redirect('/contact/admin/enquiries');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating enquiry');
    }
};

// ADMIN: Mark enquiry as resolved
const markAsResolved = async (req, res) => {
    try {
        const enquiryId = req.params.id;
        await Contact.findByIdAndUpdate(enquiryId, { status: 'resolved' });
        res.redirect('/contact/admin/enquiries');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating enquiry');
    }
};

// ADMIN: Delete enquiry
const deleteEnquiry = async (req, res) => {
    try {
        const enquiryId = req.params.id;
        await Contact.findByIdAndDelete(enquiryId);
        res.redirect('/contact/admin/enquiries');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting enquiry');
    }
};

module.exports = {
    showContactForm,
    submitEnquiry,
    getAllEnquiries,
    markAsRead,
    markAsResolved,
    deleteEnquiry
}; 