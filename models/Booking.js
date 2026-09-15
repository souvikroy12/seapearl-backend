const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    // Optional: Agar User model se link karna ho
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true // Normalization ke liye
    },
    phone: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: 'India'
    },
    bookingFor: {
        type: String,
        enum: ['main', 'other'],
        default: 'main'
    },
    // Third-Party Hotel Data Snapshot
    hotelName: {
        type: String,
        required: true
    },
    hotelAddress: {
        type: String,
        required: true
    },
    totalPrice: {
        type: String, // String rakha hai taaki existing frontend price format na tute
        required: true
    },
    hotelImage: {
        type: String,
        required: true
    },
    checkInDate: {
        type: String,
        default: 'Aug 20, 2026'
    },
    checkOutDate: {
        type: String,
        default: 'Aug 23, 2026'
    },
    totalNights: {
        type: Number,
        default: 3
    },
    guests: {
        adults: { type: Number, default: 2 },
        children: { type: Number, default: 0 }
    },
    rooms: {
        type: Number,
        default: 1
    },
    roomType: {
        type: String,
        default: 'Standard Luxury Pass'
    },
    bookedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // createdAt aur updatedAt auto-handle karega
});

//  PRODUCTION INDEXES //
// 1. Fast User Bookings Lookup (User ki recent bookings O(log N) speed me milengi)
BookingSchema.index({ email: 1, bookedAt: -1 });

// 2. Fast sorting for Admin / Reports
BookingSchema.index({ bookedAt: -1 });

module.exports = mongoose.model('Booking', BookingSchema);