const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Contact = require('../Smart-Event-Platform/Models/Enquiry');

// Main admin dashboard
const getDashboard = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.userId) {
            return res.render('user_auth', { 
                error: 'Please login to access the admin dashboard',
                showLoginPrompt: true 
            });
        }

        // Check if user is admin
        if (req.session.userRole !== 'Admin') {
            return res.status(403).render('user_auth', { 
                error: 'Access denied. Admin privileges required.',
                showLoginPrompt: true 
            });
        }
        // Basic stats
        const totalEvents = await Event.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const totalEnquiries = await Contact.countDocuments();
        
        // Revenue stats
        const revenueData = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: {
                _id: null,
                totalRevenue: { $sum: '$totalPrice' },
                averageBookingValue: { $avg: '$totalPrice' }
            }}
        ]);
        
        const totalRevenue = revenueData[0]?.totalRevenue || 0;
        const averageBookingValue = revenueData[0]?.averageBookingValue || 0;
        
        // Popular events (by tickets sold)
        const popularEvents = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            {
                $group: {
                    _id: '$event',
                    ticketsSold: { $sum: '$numberOfTickets' },
                    bookingsCount: { $sum: 1 }
                }
            },
            { $sort: { ticketsSold: -1 } },
            { $limit: 5 }
        ]);
        
        // Populate event details
        for (let item of popularEvents) {
            const event = await Event.findById(item._id);
            if (event) {
                item.eventTitle = event.title;
                item.eventDate = event.date;
                item.capacityUsage = (item.ticketsSold / event.totalCapacity) * 100;
            }
        }
        
        // Recent bookings
        const recentBookings = await Booking.find()
            .populate('user', 'username')
            .populate('event', 'title')
            .sort({ bookingDate: -1 })
            .limit(10);
        
        // Capacity usage stats
        const events = await Event.find();
        const capacityStats = {
            totalCapacity: events.reduce((sum, e) => sum + e.totalCapacity, 0),
            totalAvailable: events.reduce((sum, e) => sum + e.availableTickets, 0),
            totalSold: events.reduce((sum, e) => sum + (e.totalCapacity - e.availableTickets), 0)
        };
        capacityStats.percentageSold = (capacityStats.totalSold / capacityStats.totalCapacity) * 100;
        
        // Monthly booking trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyTrend = await Booking.aggregate([
            {
                $match: {
                    bookingDate: { $gte: sixMonthsAgo },
                    status: 'confirmed'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$bookingDate' },
                        month: { $month: '$bookingDate' }
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        
        const enquiries = await Contact.find().sort({ submittedAt: -1 });
        
        res.render('dashboard', {
            stats: {
                totalEvents,
                totalUsers,
                totalBookings,
                totalEnquiries,
                totalRevenue,
                averageBookingValue: averageBookingValue.toFixed(2)
            },
            popularEvents,
            recentBookings,
            capacityStats,
            monthlyTrend,
            enquiries,
            user: req.session.userId
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading dashboard');
    }
};

module.exports = { getDashboard };