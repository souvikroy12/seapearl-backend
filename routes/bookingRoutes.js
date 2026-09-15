const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const { 
    createBooking, 
    getMyBookings, 
    cancelBooking 
} = require('../controllers/bookingController');

// 1. PUBLIC GET: Email direct link se invoice fetch karne ke liye (No login required)
router.get('/public-invoice/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking voucher not found." });
        }
        res.status(200).json({ success: true, booking });
    } catch (err) {
        console.error("Public invoice fetch error:", err);
        res.status(500).json({ success: false, message: "Server error fetching invoice." });
    }
});

// 2. POST: Hotel booking create karna aur Voucher Email send karna
router.post('/book-hotel', protect, createBooking);

// 3. GET: Logged-in user ki bookings fetch karna
router.get('/my-bookings', protect, getMyBookings);

// 4. DELETE: Booking cancel karna
router.delete('/:id', protect, cancelBooking);

module.exports = router;