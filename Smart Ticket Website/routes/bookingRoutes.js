const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { isAuthenticated } = require('../middleWare/authMiddleware');

// Booking page
router.get('/', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.userId) {
            return res.render('user_auth', { 
                error: 'Please login to view your bookings',
                showLoginPrompt: true 
            });
        }

        // Total bookings
        const totalBookings = await Booking.countDocuments();

        // Upcoming events
        const upcomingEvents = await Event.countDocuments({
            date: { $gte: new Date() }
        });

        // Total tickets purchased
        const ticketsData = await Booking.aggregate([
            {
                $group: {
                    _id: null,
                    totalTickets: { $sum: "$numberOfTickets" }
                }
            }
        ]);

        const ticketsPurchased =
            ticketsData.length > 0
                ? ticketsData[0].totalTickets
                : 0;

        // Get booking list with event info
        const bookings = await Booking.find()
            .populate('event');

        // Format booking data for EJS
        const formattedBookings = bookings.map(booking => ({
            eventName: booking.event?.title || 'Unknown Event',
            tickets: booking.numberOfTickets,
            totalPrice: booking.totalPrice,
            status: booking.status
        }));

        res.render('booking', {
            totalBookings,
            upcomingEvents,
            ticketsPurchased,
            bookings: formattedBookings
        });

    } catch (error) {

        console.error(error);
        res.send('Error loading booking page');

    }

});

// Create booking
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { eventId, numberOfTickets } = req.body;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).send('Event not found');
        }

        // Check capacity
        if (event.availableTickets < numberOfTickets) {
            return res.status(400).send('Not enough tickets available');
        }

        // Calculate price
        const totalPrice = event.price * numberOfTickets;

        // Create booking
        const booking = new Booking({
            user: req.session.userId,
            event: eventId,
            numberOfTickets,
            totalPrice
        });

        await booking.save();

        // Reduce available tickets
        event.availableTickets -= numberOfTickets;
        await event.save();

        res.send('Booking successful');

    } catch (error) {
        console.error(error);
        res.status(500).send('Booking failed');
    }
});

module.exports = router;