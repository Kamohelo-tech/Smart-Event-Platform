const mongoose = require('mongoose');
const BOOKING_STATUSES = ["Confirmed", "Cancelled", "Pending"];

const bookingSchema = new mongoose.Schema({
    // Link to the User who bought the ticket
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Must match the exact name you gave your User model
        required: [true, 'A booking must be linked to a user']
    },
    // Link to the specific Event they are attending
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event', // Must match the exact name you gave your Event model
        required: [true, 'A booking must be linked to an event']
    },
    numberOfTickets: {
        type: Number,
        required: [true, 'Please specify the number of tickets'],
        min: [1, 'Must book at least 1 ticket'],
         max:      [20, "You cannot book more than 20 tickets per booking"],
    
    },
    status: {
        type: String,
        enum: {
        values:  BOOKING_STATUSES,
        message: `Status must be one of: ${BOOKING_STATUSES.join(", ")}`,
      },
      default: "Confirmed",
    },
    totalPrice: {
      type: Number,
      min:  [0, "Total price cannot be negative"],
    },
}, 
    
{
    timestamps: true,
    toJSON:     { virtuals: true }, // Include virtuals when serialising
    toObject:   { virtuals: true },
});

// --- Indexes ---
bookingSchema.index({ user:  1 });           // "My bookings" lookups
bookingSchema.index({ event: 1 });           // "Who booked this event?" lookups
bookingSchema.index({ user:  1, event: 1 }); // Compound: prevent duplicate bookings
bookingSchema.index({ status: 1 });

// --- Virtual: Booking summary label ---
bookingSchema.virtual("summary").get(function () {
  return `Booking #${this._id} — ${this.numberOfTickets} ticket(s) [${this.status}]`;
});

// --- Pre-save Hook: Prevent duplicate active bookings ---
bookingSchema.pre("save", async function (next) {
  if (!this.isNew) return next(); // Only check on creation

  const existing = await mongoose.model("Booking").findOne({
    user:   this.user,
    event:  this.event,
    status: { $ne: "Cancelled" }, // Allow re-booking after cancellation
  });

  if (existing) {
    return next(
      new Error("User already has an active booking for this event")
    );
  }
  next();
});

// --- Static Method: Get all bookings for a specific user ---
bookingSchema.statics.getByUser = function (userId) {
  return this.find({ user: userId })
    .populate("event", "title date category availableTickets")
    .sort({ createdAt: -1 });
};

// --- Static Method: Get all bookings for a specific event ---
bookingSchema.statics.getByEvent = function (eventId) {
  return this.find({ event: eventId, status: { $ne: "Cancelled" } })
    .populate("user", "name email")
    .sort({ createdAt: -1 });
};

// --- Instance Method: Cancel a booking and restore event tickets ---
bookingSchema.methods.cancel = async function () {
  if (this.status === "Cancelled") {
    throw new Error("This booking is already cancelled");
  }

  const Event = mongoose.model("Event");
  const event = await Event.findById(this.event);

  if (event) {
    await event.releaseTickets(this.numberOfTickets);
  }

  this.status = "Cancelled";
  return await this.save();
};

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;