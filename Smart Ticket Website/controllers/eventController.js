const Event = require('../models/Event');

// Show all events (with search & filter)
const getAllEvents = async (req, res) => {
    try {
        let query = {};
        
        // Search by title or description
        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        // Filter by category
        if (req.query.category && req.query.category !== 'all') {
            query.category = req.query.category;
        }
        
        // Filter by date (upcoming events only)
        if (req.query.date === 'upcoming') {
            query.date = { $gte: new Date() };
        }
        
        // Get events
        const events = await Event.find(query).sort({ date: 1 });
        
        // Check if user is admin
        const isAdmin = req.session.userRole === 'Admin';
        
        // Check for login success message
        const loginSuccess = req.session.loginSuccess || false;
        console.log('Login success flag:', loginSuccess, 'Session userId:', req.session.userId);
        if (req.session.loginSuccess) {
            delete req.session.loginSuccess; // Clear flag after retrieving
        }
        
        res.render('events', { 
            events, 
            search: req.query.search || '',
            category: req.query.category || 'all',
            isAdmin,
            user: req.session.userId,
            loginSuccess
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching events');
    }
};

// Show single event details
const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        
        res.render('eventDetails', { event, user: req.session.userId });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching event');
    }
};

// Show create event form (admin only)
const showCreateForm = (req, res) => {
    res.render('createEvent', { error: null });
};

// Create new event (admin only)
const createEvent = async (req, res) => {
    try {
        const { title, description, date, category, totalCapacity, price, location } = req.body;
        
        const event = new Event({
            title,
            description,
            date,
            category,
            totalCapacity: parseInt(totalCapacity),
            availableTickets: parseInt(totalCapacity), // initially same as total
            price: parseFloat(price),
            location,
            createdBy: req.session.userId
        });
        
        await event.save();
        res.redirect('/events');
        
    } catch (error) {
        console.error(error);
        res.render('createEvent', { error: 'Failed to create event. Please check your inputs.' });
    }
};

// Show edit event form (admin only)
const showEditForm = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        res.render('editEvent', { event, error: null });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading edit form');
    }
};

// Update event (admin only)
const updateEvent = async (req, res) => {
    try {
        const { title, description, date, category, totalCapacity, price, location } = req.body;
        
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        
        // Calculate new available tickets if capacity changed
        const capacityDifference = parseInt(totalCapacity) - event.totalCapacity;
        
        let newAvailableTickets = event.availableTickets + capacityDifference;

        if (newAvailableTickets < 0) {
            newAvailableTickets = 0;
        }
        
        // Update event
        event.title = title;
        event.description = description;
        event.date = date;
        event.category = category;
        event.totalCapacity = parseInt(totalCapacity);
        event.availableTickets = newAvailableTickets;
        event.price = parseFloat(price);
        event.location = location;
        
        await event.save();
        res.redirect('/events');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating event');
    }
};

// Delete event (admin only)
const deleteEvent = async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.redirect('/events');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting event');
    }
};


const Booking = require('../models/Booking');

// Admin dashboard analytics
const getDashboard = async (req, res) => {
    try {
        const totalEvents = await Event.countDocuments();
        const totalBookings = await Booking.countDocuments();

        // Most popular events
        const popularEvents = await Booking.aggregate([
            {
                $group: {
                    _id: "$event",
                    totalBookings: { $sum: 1 }
                }
            },
            { $sort: { totalBookings: -1 } },
            { $limit: 5 }
        ]);

        res.render('dashboard', {
            totalEvents,
            totalBookings,
            popularEvents
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Dashboard error');
    }
};

module.exports = { 
    getAllEvents, 
    getEventById, 
    showCreateForm, 
    createEvent, 
    showEditForm, 
    updateEvent, 
    deleteEvent ,
    getDashboard
};
