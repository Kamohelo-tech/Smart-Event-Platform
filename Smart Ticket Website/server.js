
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const mongoose = require('mongoose');



// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// Serve CSS from the project-level style folder (used by home.ejs)
const path = require('path');
const stylePath = path.join(__dirname, 'style');
console.log('[boot] stylePath =', stylePath, 'exists=', require('fs').existsSync(stylePath));
console.log('[boot] mounting /Style from', stylePath);
app.use('/Style', express.static(stylePath));

// Serve images from Smart-Event-Platform/Images directory
const imagesPath = path.join(__dirname, 'Smart-Event-Platform', 'Images');
console.log('[boot] imagesPath =', imagesPath, 'exists=', require('fs').existsSync(imagesPath));
app.use('/images', express.static(imagesPath));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    proxy: false
}));

// Middleware to pass user session to all views
app.use((req, res, next) => {
    res.locals.user = req.session.userId || null;
    res.locals.userRole = req.session.userRole || null;
    res.locals.isAuthenticated = !!req.session.userId;
    next();
});


// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');
app.set('views', path.join(__dirname, 'Smart-Event-Platform', 'Views'));
console.log('[boot] viewsDir =', app.get('views'));

 
// Import routes (server.js is the only entry point)
const authRoutes = require('./routes/authRoutes');
const Event = require('./models/Event');

// Define '/' route
app.get('/', async (req, res) => {
    try {
        const events = await Event.getUpcoming();
        console.log(`[home] loaded ${events.length} upcoming event(s)`);
        res.render('home', { events });
    } catch (error) {
        console.error('Error fetching events for home page:', error);
        res.render('home', { events: [] });
    }
});

// Backward-compatible alias: keep /login working but always send users to the real auth route.
// Also helps debugging: if you ever see /login in the address bar, you know this redirect is being triggered.
app.get('/login', (req, res) => {
    return res.redirect('/auth/login');
});

// Extra debug route (safe): list auth routes for troubleshooting
app.get('/__debug/routes', (req, res) => {
    const stack = app._router?.stack || [];
    const routes = [];
    for (const layer of stack) {
        if (layer.route && layer.route.path) {
            routes.push({ method: Object.keys(layer.route.methods).join(','), path: layer.route.path });
        }
    }
    res.json(routes);
});




const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Use routes
// IMPORTANT: don't mount auth/admin on '/', otherwise they can intercept '/' and cause “Cannot GET /”.
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/booking', bookingRoutes);
app.use('/contact', contactRoutes);
app.use('/admin', adminRoutes);


// Startup error logging
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

app.on('error', (err) => {
    console.error('Express error:', err);
});


// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!MONGODB_URI) {
    console.error('Missing MongoDB connection string. Set MONGODB_URI or MONGO_URL in .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        // Start server only after DB is connected
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            // Debug: list registered routes
            const stack = app._router?.stack || [];
            const routes = [];
            for (const layer of stack) {
                if (layer.route && layer.route.path) {
                    routes.push({ method: Object.keys(layer.route.methods).join(','), path: layer.route.path });
                }
            }
            console.log('[routes]', routes);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
