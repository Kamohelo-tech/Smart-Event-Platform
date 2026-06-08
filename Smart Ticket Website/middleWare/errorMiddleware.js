// middleware/errorMiddleware.js

/**
 * 404 Not Found Middleware
 * Handles routes that don't exist
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error); // Pass to the main error handler
};

/**
 * Main Error Handler Middleware
 * Catches all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
    // Log the error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error:', err.message);
        console.error('Stack trace:', err.stack);
    } else {
        // In production, just log the message (no stack trace to users)
        console.error('❌ Error:', err.message);
    }

    // Default error values
    let statusCode = err.status || 500;
    let message = err.message || 'Something went wrong on the server';
    
    // Handle specific Mongoose/MongoDB errors
    switch (err.name) {
        // Duplicate key error (email/username already exists)
        case 'MongoServerError':
            if (err.code === 11000) {
                const field = Object.keys(err.keyPattern)[0];
                statusCode = 400;
                message = `${field} already exists. Please use a different ${field}.`;
            }
            break;
        
        // Validation error (missing required fields, wrong data types)
        case 'ValidationError':
            statusCode = 400;
            message = Object.values(err.errors).map(e => e.message).join(', ');
            break;
        
        // Cast error (invalid MongoDB ID format)
        case 'CastError':
            statusCode = 404;
            message = `Resource not found with id: ${err.value}`;
            break;
        
        // JWT errors (invalid or expired token)
        case 'JsonWebTokenError':
            statusCode = 401;
            message = 'Invalid token. Please login again.';
            break;
        
        case 'TokenExpiredError':
            statusCode = 401;
            message = 'Your session has expired. Please login again.';
            break;
    }
    
    // Check if request expects JSON (API) or HTML (web page)
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        // Send JSON response for API calls
        res.status(statusCode).json({
            success: false,
            message: message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } else {
        // Render error page for regular web requests
        res.status(statusCode).render('error', {
            title: 'Error',
            message: message,
            statusCode: statusCode,
            user: req.session?.userId,
            userRole: req.session?.userRole
        });
    }
};

/**
 * Async Handler - Wraps async functions to avoid try-catch blocks
 * Use this instead of writing try-catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    notFound,
    errorHandler,
    asyncHandler
};