const Booking = require('../models/Booking');
const Event = require('../models/Event');

// Show booking form for specific event
const showBookingForm = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).send('Event not found');
        }
        
        res.render('bookingForm', { 
            event, 
            error: null,
            user: req.session.userId
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading booking form');
    }
};

// Process ticket booking
const createBooking = async (req, res) => {
    try {
        const { eventId, numberOfTickets } = req.body;
        const userId = req.session.userId;
        
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        
        
        const ticketsRequested = parseInt(numberOfTickets);
        
        if (ticketsRequested <= 0) {
            return res.render('bookingForm', {
                event,
                error: 'Number of tickets must be at least 1',
                user: userId
            });
        }
        
        if (ticketsRequested > event.availableTickets) {
            return res.render('bookingForm', {
                event,
                error: `Sorry, only ${event.availableTickets} tickets available`,
                user: userId
            });
        }
        
        
        if (new Date(event.date) < new Date()) {
            return res.render('bookingForm', {
                event,
                error: 'Cannot book tickets for past events',
                user: userId
            });
        }
        
        
        const totalPrice = ticketsRequested * event.price;
        
        // Create booking
        const booking = new Booking({
            user: userId,
            event: eventId,
            numberOfTickets: ticketsRequested,
            totalPrice: totalPrice,
            status: 'confirmed'
        });
        
        await booking.save();
        
        // Update event available tickets (Atomic operation)
        event.availableTickets -= ticketsRequested;
        await event.save();
        
        res.redirect(`/bookings/confirmation/${booking._id}`);
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating booking');
    }
};

// Show booking confirmation
const getConfirmation = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const booking = await Booking.findById(bookingId)
            .populate('user')
            .populate('event');
        
        if (!booking) {
            return res.status(404).send('Booking not found');
        }
        
        // Security: Only the booking owner or admin can view
        if (booking.user._id.toString() !== req.session.userId && 
            req.session.userRole !== 'admin') {
            return res.status(403).send('Access denied');
        }
        
        res.render('confirmation', { booking });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading confirmation');
    }
};

// Get user's booking history
const getUserBookings = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const bookings = await Booking.find({ user: userId })
            .populate('event')
            .sort({ bookingDate: -1 });
        
        res.render('userBookings', { 
            bookings, 
            user: req.session.userId 
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading bookings');
    }
};

// Cancel booking (with refund of tickets)
const cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).send('Booking not found');
        }
        
        // Check if booking belongs to user or user is admin
        if (booking.user.toString() !== req.session.userId && 
            req.session.userRole !== 'admin') {
            return res.status(403).send('Access denied');
        }
        
        // Check if event is still in the future
        const event = await Event.findById(booking.event);
        if (new Date(event.date) < new Date()) {
            return res.status(400).send('Cannot cancel past events');
        }
        
        // Return tickets to event
        event.availableTickets += booking.numberOfTickets;
        await event.save();
        
        // Update booking status
        booking.status = 'cancelled';
        await booking.save();
        
        res.redirect('/bookings/my-bookings');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error cancelling booking');
    }
};

// ADMIN: Get all bookings (for dashboard)
const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('user', 'username email')
            .populate('event', 'title date')
            .sort({ bookingDate: -1 });
        
        // Calculate analytics
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
        const popularEvents = await Booking.aggregate([
            {
                $group: {
                    _id: '$event',
                    count: { $sum: 1 },
                    totalTickets: { $sum: '$numberOfTickets' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]).lookup({
            from: 'events',
            localField: '_id',
            foreignField: '_id',
            as: 'eventDetails'
        });
        
        res.render('adminBookings', {
            bookings,
            totalBookings,
            totalRevenue,
            popularEvents
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading admin bookings');
    }
};

module.exports = {
    showBookingForm,
    createBooking,
    getConfirmation,
    getUserBookings,
    cancelBooking,
    getAllBookings
};