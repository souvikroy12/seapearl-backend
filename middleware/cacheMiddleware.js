const redis = require("../config/redis");

const redisCache = (ttlSeconds = 600) => {
  return async (req, res, next) => {
    // Sirf GET requests cache karni hain
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `seapearl:${req.originalUrl || req.url}`;

    try {
      // 1. Check karo cache mein data hai ya nahi
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache HIT]: ${cacheKey}`);
        const parsedData = typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData;
        return res.status(200).json(parsedData);
      }

      console.log(`[Cache MISS]: ${cacheKey}`);

      // 2. Data nahi hai toh response intercept karke Redis mein save karo
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          const dataToStore = typeof body === "object" ? JSON.stringify(body) : body;
          
          redis.set(cacheKey, dataToStore, { ex: ttlSeconds }).catch((err) => {
            console.error("Redis Cache Save Error:", err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Redis Middleware Error (Bypassing):", error.message);
      next();
    }
  };
};

module.exports = redisCache;