const express = require('express');
const connectDB = require('./Smart-Event-Platform/config/db');
const Enquiry = require('./Smart-Event-Platform/Models/Enquiry');
const path = require('path');
require('dotenv').config();

const contactRoutes = require('./Smart-Event-Platform/Routes/contactRoutes');

const app = express();

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Smart-Event-Platform', 'Views'));

// Serve CSS and Images
app.use('/Style', express.static(path.join(__dirname, 'style')));
app.use('/images', express.static(path.join(__dirname, 'style/Images')));

// Connect DB before starting to accept requests
let dbReadyPromise = connectDB();

// Standard Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// API routes
app.use('/api/enquiries', contactRoutes);

// Frontend page routes
app.get('/', (req, res) => {
    res.render('home', { events: [] });
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/login', (req, res) => {
    res.redirect('/auth/login');
});

app.get('/dashboard', async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ createdAt: -1 });
        res.render('dashboard', { enquiries });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading dashboard");
    }
});

app.post('/api/enquiries/:id/read', async (req, res) => {
    try {
        await Enquiry.findByIdAndUpdate(req.params.id, { status: 'Read' });
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating status");
    }
});

app.get('/bookings', (req, res) => {
    res.render('booking', {
        totalBookings: 0,
        upcomingEvents: 0,
        ticketsPurchased: 0,
        bookings: []
    });
});

// Start the Server
const PORT = process.env.PORT || 3000;
dbReadyPromise
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to start server due to MongoDB connection error:', err);
        process.exit(1);
    });
