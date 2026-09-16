const Booking = require('../models/Booking');
const { transporter, emailTemplate } = require('./authController');

// 1. Create Booking & Dispatch Email Invoice
const createBooking = async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            email, 
            phone, 
            country, 
            bookingFor, 
            hotelName, 
            hotelAddress, 
            totalPrice, 
            hotelImage, 
            checkInDate, 
            checkOutDate, 
            totalNights, 
            guests, 
            rooms, 
            roomType 
        } = req.body;

        if (!firstName || !lastName || !phone || !hotelName || !totalPrice || !hotelImage) {
            return res.status(400).json({ success: false, message: "Please fill all required fields." });
        }

        // Server-Side Pricing & Nights Recalculation
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        let calculatedNights = Number(totalNights) || 1;

        if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
            const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
            calculatedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        const validRooms = Math.max(1, Number(rooms) || 1);

        // --- SECURITY PATCH: PRICE TAMPERING GUARD ---
        // Minimum legitimate threshold per night for hotel listings
        const MIN_PRICE_PER_NIGHT = 2500;
        const minimumAllowedTotal = MIN_PRICE_PER_NIGHT * calculatedNights * validRooms;

        const incomingPrice = Number(String(totalPrice).replace(/[^0-9.-]+/g, "")) || 0;

        // Block tampered/manipulated prices (e.g. ₹1, negative values, or zero)
        if (!incomingPrice || incomingPrice < minimumAllowedTotal) {
            return res.status(400).json({ 
                success: false, 
                message: `Security Alert: Invalid price detected. Minimum expected rate for ${calculatedNights} night(s) is ₹${minimumAllowedTotal.toLocaleString('en-IN')}.` 
            });
        }

        const cleanPrice = incomingPrice;
        const targetEmail = (email && email.trim()) || req.user.email;

        // Dynamic booking instance
        const newBooking = new Booking({
            user: req.user?._id,
            firstName,
            lastName,
            email: targetEmail,
            phone,
            country: country || 'India',
            bookingFor: bookingFor || 'main',
            hotelName,
            hotelAddress,
            totalPrice: String(cleanPrice),
            hotelImage,
            checkInDate: checkInDate || "Aug 20, 2026",
            checkOutDate: checkOutDate || "Aug 23, 2026",
            totalNights: calculatedNights,
            guests: guests || { adults: 2, children: 0 },
            rooms: validRooms,
            roomType: roomType || "Standard Luxury Pass"
        });

        const savedBooking = await newBooking.save();

        // Invoice/Voucher setup
        const invoiceRef = `SP-${savedBooking._id.toString().slice(-6).toUpperCase()}`;
        const formattedPrice = `₹ ${cleanPrice.toLocaleString('en-IN')}`;
        // Purani Line:
// const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Nayi Line:
const frontendUrl = process.env.FRONTEND_URL || 'https://seapearl-luxury.vercel.app';

        // Direct standalone invoice view route
        const voucherUrl = `${frontendUrl}/invoice/${savedBooking._id}`;

        const invoiceBody = `
            <div style="border-bottom: 1px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 25px;">
              <span style="background: rgba(198, 166, 117, 0.1); border: 1px solid rgba(198, 166, 117, 0.3); color: #C6A675; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; letter-spacing: 1px;">
                CONFIRMED &amp; VERIFIED
              </span>
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 400; margin: 16px 0 6px 0;">Reservation Voucher</h2>
              <p style="color: #777; font-size: 12px; margin: 0;">Pass ID: <strong style="color: #fff;">${invoiceRef}</strong></p>
            </div>

            <div style="background-color: #141414; border: 1px solid #222; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #C6A675; margin: 0 0 6px 0; font-size: 18px; font-weight: 500;">${hotelName}</h3>
              <p style="color: #888; font-size: 12px; margin: 0 0 16px 0;">${hotelAddress}</p>
              
              <div style="border-top: 1px solid #222; padding-top: 14px; font-size: 12px; color: #bbb;">
                <p style="margin: 4px 0;"><strong>Check-In:</strong> ${savedBooking.checkInDate}</p>
                <p style="margin: 4px 0;"><strong>Check-Out:</strong> ${savedBooking.checkOutDate}</p>
                <p style="margin: 4px 0;"><strong>Duration:</strong> ${calculatedNights} Night(s)</p>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 25px;">
              <tr style="border-bottom: 1px solid #1a1a1a;">
                <td style="padding: 10px 0; color: #777;">Guest</td>
                <td style="padding: 10px 0; text-align: right; color: #fff;">${firstName} ${lastName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #1a1a1a;">
                <td style="padding: 10px 0; color: #777;">Pass Category</td>
                <td style="padding: 10px 0; text-align: right; color: #fff;">${roomType || "Standard Luxury Pass"}</td>
              </tr>
              <tr style="border-bottom: 1px solid #222;">
                <td style="padding: 14px 0; color: #C6A675; font-size: 15px; font-weight: bold;">Total Paid</td>
                <td style="padding: 14px 0; text-align: right; color: #C6A675; font-size: 18px; font-weight: bold;">${formattedPrice}</td>
              </tr>
            </table>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${voucherUrl}" style="display: inline-block; background-color: #C6A675; color: #000; padding: 14px 32px; text-decoration: none; font-weight: bold; font-size: 11px; border-radius: 4px; letter-spacing: 2px; text-transform: uppercase;">View Full Voucher &amp; Invoice</a>
            </div>
        `;

        // Direct async email shoot
        try {
            console.log("Attempting to send email to:", targetEmail);
            const info = await transporter.sendMail({
                from: `"SeaPearl Reservations" <${process.env.EMAIL_USER}>`,
                to: targetEmail,
                subject: `Sanctuary Pass Confirmed: ${hotelName} [${invoiceRef}]`,
                html: emailTemplate(invoiceBody)
            });
            console.log("Email successfully sent! Message ID:", info.messageId);
        } catch (mailErr) {
            console.error("CRITICAL Email Send Error:", mailErr);
        }

        res.status(201).json({ 
            success: true, 
            message: "Reservation confirmed successfully!", 
            booking: savedBooking 
        });

    } catch (error) {
        console.error("Booking Error Backend:", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Booking failed." });
    }
};

// 2. Fetch User Bookings
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ 
            email: { $regex: new RegExp(`^${req.user.email}$`, 'i') } 
        }).sort({ bookedAt: -1 });
        
        res.status(200).json(bookings);
    } catch (error) {
        console.error("Fetch Bookings Backend Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 3. Cancel Booking
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ 
                success: false, 
                message: "Booking not found." 
            });
        }

        if (booking.email.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized: You do not have permission to revoke this reservation." 
            });
        }

        await Booking.findByIdAndDelete(id);

        res.status(200).json({ 
            success: true, 
            message: "Reservation cancelled successfully!" 
        });
    } catch (error) {
        console.error("Delete Booking Backend Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error. Failed to cancel reservation." 
        });
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    cancelBooking
};