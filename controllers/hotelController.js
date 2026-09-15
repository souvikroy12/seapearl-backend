const axios = require('axios');

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = process.env.RAPIDAPI_HOST;

// --- 1. Facility Mapping ---
const facilityMap = {
    4: "Free WiFi",
    7: "Parking",
    11: "Room Service",
    109: "24-hour Front Desk",
    442: "Air Conditioning",
    475: "Private Bathroom",
    163: "Terrace/Garden",
    2: "Restaurant",
    418: "Breakfast",
    1: "Clean Rooms"
};

exports.getDestinationId = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(200).json([]);

        const options = {
            method: 'GET',
            url: `https://${API_HOST}/locations/auto-complete`,
            params: { text: name, languagecode: 'en-us' },
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST }
        };

        const response = await axios.request(options);
        const locations = (response.data || []).map(loc => ({
            dest_id: loc.dest_id,
            dest_type: loc.dest_type,
            name: loc.label || loc.name
        }));
        res.status(200).json(locations);
    } catch (error) {
        console.error(" Location Error:", error.message);
        res.status(200).json([]);
    }
};

exports.getHotelsByLocation = async (req, res) => {
    try {
        const { dest_id, dest_type, sort_by = 'popularity', checkinDate, checkoutDate, guests = '2' } = req.query;

        if (!dest_id) return res.status(200).json({ hotels: [], total_count: 0 });

        // FIX 2: Dynamic dates with fallback
        let checkin = checkinDate;
        let checkout = checkoutDate;

        if (!checkin || !checkout) {
            const today = new Date();
            const inDate = new Date(today);
            inDate.setDate(today.getDate() + 10);
            const outDate = new Date(inDate);
            outDate.setDate(inDate.getDate() + 1);

            checkin = inDate.toISOString().split('T')[0];
            checkout = outDate.toISOString().split('T')[0];
        }

        // FIX 1: Single optimized request to eliminate 429 Too Many Requests
        const response = await axios.request({
            method: 'GET',
            url: `https://${API_HOST}/properties/list`,
            params: {
                offset: '0',
                arrival_date: checkin,
                departure_date: checkout,
                guest_qty: String(guests),
                dest_ids: dest_id,
                room_qty: '1',
                search_type: dest_type,
                order_by: sort_by,
                currency_code: 'INR',
                units: 'metric'
            },
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST }
        });

        const allResults = response.data?.result || [];

        const uniqueHotelsMap = new Map();
        allResults.forEach(h => {
            if (!uniqueHotelsMap.has(h.hotel_id)) {
                uniqueHotelsMap.set(h.hotel_id, h);
            }
        });

        const hotels = Array.from(uniqueHotelsMap.values()).map(h => {
            const realPrice = h.min_total_price || h.price_breakdown?.all_inclusive_price || 0;

            let actualAmenities = [];
            if (h.hotel_facilities) {
                actualAmenities = h.hotel_facilities.split(',')
                    .map(id => facilityMap[id.trim()])
                    .filter(name => name !== undefined);
            }

            if (actualAmenities.length === 0) {
                actualAmenities = ["Verified Stay", "Reception", "Daily Housekeeping"];
            }

            return {
                id: h.hotel_id,
                name: h.hotel_name,
                location: `${h.city}, ${h.address}`,
                price: Math.round(realPrice),
                rating: h.review_score ? h.review_score.toFixed(1) : "8.2",
                starCategory: h.class || 3,
                // FIX 3: Safe chaining fallback
                image: h.main_photo_url ? h.main_photo_url.replace('square60', 'max1280x900') : "https://images.unsplash.com/photo-1566073771259-6a8506099945",
                amenities: actualAmenities.slice(0, 3),
                isAvailable: realPrice > 0
            };
        });

        res.status(200).json({
            total_count: hotels.length,
            hotels: hotels
        });

    } catch (error) {
        // FIX 4: Clean error handling
        console.error(" Hotels Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.getHotelPhotos = async (req, res) => {
    try {
        const { hotelId } = req.query;
        if (!hotelId) return res.status(200).json([]);

        const options = {
            method: 'GET',
            url: `https://${API_HOST}/properties/get-hotel-photos`,
            params: { hotel_ids: hotelId, languagecode: 'en-us' },
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST }
        };

        const response = await axios.request(options);
        const photoData = response.data?.data?.[hotelId] || [];

        if (!Array.isArray(photoData) || photoData.length === 0) {
            return res.status(200).json([]);
        }

        const cleanPhotos = photoData.slice(0, 10).map(photoArray => {
            const urlPath = photoArray[4];
            const prefix = response.data.url_prefix || "https://cf.bstatic.com";
            return {
                url: urlPath?.startsWith('http') ? urlPath : `${prefix}${urlPath}`
            };
        });

        res.status(200).json(cleanPhotos);
    } catch (error) {
        console.error(" Photos Error:", error.message);
        res.status(200).json([]);
    }
};

exports.getHotelDescription = async (req, res) => {
    try {
        const { hotelId, hotelName, hotelCity } = req.query;

        const descOptions = {
            method: 'GET',
            url: `https://${API_HOST}/properties/get-description`,
            params: { hotel_ids: hotelId, languagecode: 'en-us' },
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST }
        };

        const descRes = await axios.request(descOptions);
        const hotelData = descRes.data?.[0] || {};

        // --- TITLE CLEANUP ---
        let cleanTitle = (hotelName || "Premium Hotel")
            .replace(/#\w+/g, '').replace(/[-|,_]{2,}/g, ' ').replace(/\s+/g, ' ').trim()
            .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        // --- HOUSE RULES EXTRACTION (Naya addition sirf rules ke liye) ---
        const checkinTime = hotelData.arrival_date || "14:00 PM";
        const checkoutTime = hotelData.departure_date || "12:00 PM";

        // --- SMART FACILITIES EXTRACTION ---
        let allFacilities = [];
        if (hotelData.extra && hotelData.extra.facilities) {
            allFacilities = hotelData.extra.facilities.map(f => f.name);
        }

        if (allFacilities.length === 0) {
            const commonAmenities = ["WiFi", "Parking", "Pool", "Gym", "Spa", "Restaurant", "Bar", "Air conditioning", "Laundry"];
            const text = (hotelData.description || "").toLowerCase();
            allFacilities = commonAmenities.filter(amenity => text.includes(amenity.toLowerCase()));
        }

        if (allFacilities.length < 3) {
            const defaultSet = ["Free WiFi", "24-hour Front Desk", "Housekeeping", "Private Bathroom", "Elevator", "Safety deposit box"];
            if (cleanTitle.toLowerCase().includes('taj') || cleanTitle.toLowerCase().includes('resort')) {
                allFacilities = ["Luxury Spa", "Outdoor Pool", "Fine Dining", "Valet Parking", "Fitness Center", "Concierge"];
            } else {
                allFacilities = defaultSet;
            }
        }

        const summaryFacilities = allFacilities.slice(0, 6);
        const intro = `Experience world-class hospitality at ${cleanTitle}. `;
        const facilitiesSentence = allFacilities.length > 0
            ? `This property is equipped with ${summaryFacilities.join(", ")}. `
            : "";

        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({
            title: cleanTitle,
            text: intro + facilitiesSentence + "\n\n" + (hotelData.description || "Welcome to our premium property."),
            facilities: allFacilities,
            checkin: checkinTime,
            checkout: checkoutTime
        });

    } catch (error) {
        console.error(" API Error:", error.message);
        res.status(200).json({
            title: "Luxury Hotel",
            text: "Welcome to our premium property.",
            facilities: ["WiFi", "Service", "Parking"],
            checkin: "14:00 PM",
            checkout: "12:00 PM"
        });
    }
};

// ---  hotelController.js ke niche  ---

exports.getHotelRooms = async (req, res) => {
    try {
        const { hotelId, checkinDate, checkoutDate, guests } = req.query;

        if (!hotelId || !checkinDate || !checkoutDate) {
            return res.status(400).json({ message: "Dates or Hotel ID missing" });
        }

        const options = {
            method: 'GET',
            url: `https://${API_HOST}/properties/v2/get-rooms`,
            params: {
                hotel_id: hotelId,
                arrival_date: checkinDate,
                departure_date: checkoutDate,
                rec_guest_qty: guests || '2',
                rec_room_qty: '1',
                currency_code: 'INR',
                languagecode: 'en-us',
                units: 'metric'
            },
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST
            }
        };

        const response = await axios.request(options);
        const data = response.data;
        let allBlocks = [];

        if (Array.isArray(data)) {
            allBlocks = data.flatMap(item => item.block || []);
        } else if (data.block) {
            allBlocks = data.block;
        }

        if (allBlocks.length === 0) {
            return res.status(200).json([]);
        }

        // Duplicate Rooms ko Filter karne ka logic (Unique ID ke sath)
        const uniqueRooms = {};

        allBlocks.forEach((block) => {
            const roomIdentifier = `${block.room_name}-${block.max_occupancy}`;

            const currentPrice = Math.round(
                block.min_price?.price ||
                block.product_price_breakdown?.all_inclusive_amount?.value ||
                0
            );

            if (!uniqueRooms[roomIdentifier] || currentPrice < uniqueRooms[roomIdentifier].price) {
                uniqueRooms[roomIdentifier] = {
                    id: block.block_id,
                    roomName: block.room_name || "Premium Room",
                    price: currentPrice,
                    capacity: block.max_occupancy || 2,
                    bedConfig: block.room_bed_type || "1 Large Double Bed",
                    benefits: [
                        block.breakfast_included ? "Breakfast included" : "Room only",
                        block.is_free_cancellable ? "Free cancellation" : "Non-refundable",
                        block.is_last_minute_deal ? "Last minute deal" : null,
                        block.is_smart_deal ? "Smart Deal" : null,
                        "Instant Confirmation"
                    ].filter(Boolean),
                    taxes: block.product_price_breakdown?.service_charge?.value || 0
                };
            }
        });

        const finalRooms = Object.values(uniqueRooms);
        res.status(200).json(finalRooms);

    } catch (error) {
        console.error(" API ERROR:", error.response?.data || error.message);
        res.status(500).json({ message: "Failed to fetch rooms" });
    }
};