const mongoose = require('mongoose');

const CATEGORIES = [
  "Music",
  "Sports",
  "Conference",
  "Workshop",
  "Festival",
  "Networking",
  "Other",
];

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide an event title'],
        trim: true,
        minlength: [3,   "Title must be at least 3 characters"],
        maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
        type: String,
        required: [true, 'Please provide an event description'],
        maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    date: {
        type: Date,
        required: [true, 'Please provide an event date'],
        validate: {
        validator: function (value) {
          // Ensure the event is not scheduled in the past
          return value > new Date();
        },
        message: "Event date must be in the future",
      },
    },
    category: {
        type: String,
        required: [true, 'Please provide an event category (e.g., Workshop, Festival, Corporate)'],
        enum: {
        values:  CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(", ")}`,
      },
    },
    totalCapacity: {
        type: Number,
        required: [true, 'Please define the total capacity for this event'],
        min: [1, 'Capacity must be at least 1'],
        max:      [100000, "Total capacity cannot exceed 100,000"],
    },
    availableTickets: {
        type: Number,
        required: true,
        min: [0, 'Available tickets cannot be negative'], // Crucial: Prevents overbooking!
        validate: {
        validator: function (value) {
          // availableTickets can never exceed totalCapacity
          return value <= this.totalCapacity;
        },
        message: "Available tickets cannot exceed total capacity",
      },
    }
}, {
    timestamps: true
});
// --- Indexes ---
eventSchema.index({ date:     1 });
eventSchema.index({ category: 1 });
eventSchema.index({ title: "text", description: "text" }); // Full-text search

// --- Virtual: Percentage of tickets sold ---
eventSchema.virtual("occupancyRate").get(function () {
  if (this.totalCapacity === 0) return 0;
  const sold = this.totalCapacity - this.availableTickets;
  return ((sold / this.totalCapacity) * 100).toFixed(2) + "%";
});

// --- Virtual: Whether the event is sold out ---
eventSchema.virtual("isSoldOut").get(function () {
  return this.availableTickets === 0;
});

// --- Static Method: Find all upcoming events by category ---
eventSchema.statics.getUpcoming = function (category = null) {
  const query = { date: { $gt: new Date() } };
  if (category) query.category = category;
  return this.find(query).sort({ date: 1 });
};

// --- Instance Method: Reduce ticket count after a booking ---
eventSchema.methods.reserveTickets = async function (quantity) {
  if (quantity > this.availableTickets) {
    throw new Error(
      `Only ${this.availableTickets} ticket(s) remaining for this event`
    );
  }
  this.availableTickets -= quantity;
  return await this.save();
};

// --- Instance Method: Restore tickets on booking cancellation ---
eventSchema.methods.releaseTickets = async function (quantity) {
  this.availableTickets = Math.min(
    this.availableTickets + quantity,
    this.totalCapacity
  );
  return await this.save();
};

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
module.exports = Event;
