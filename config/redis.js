const { Redis } = require("@upstash/redis");

// Upstash REST client environment variables automatically pick kar leta hai
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = redis;