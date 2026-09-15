const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController'); 
const redisCache = require('../middleware/cacheMiddleware');

// 1. Destination Search (Auto-complete) - 24 ghante (86400s)
router.get('/search-destination', redisCache(86400), hotelController.getDestinationId);

// 2. Hotels List (Main Grid) - 30 minute (1800s)
router.get('/list', redisCache(1800), hotelController.getHotelsByLocation);

// 3. Hotel Photos (Gallery) - 1 ghante (3600s)
router.get('/hotel-photos', redisCache(3600), hotelController.getHotelPhotos); 

// 4. Hotel Description & Facilities - 24 ghante (86400s)
router.get('/hotel-description', redisCache(86400), hotelController.getHotelDescription);

// 5. Real-time Rooms & Pricing - 10 minute (600s)
router.get('/hotel-rooms', redisCache(600), hotelController.getHotelRooms);

module.exports = router;