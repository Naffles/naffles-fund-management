// const redis = require("redis");
const redis = require("ioredis");
const { promisify } = require("util");
const { REDIS_URL, REDIS_PORT } = require("./config");

// Create a standard Redis client.
const client = redis.createClient({
  host: REDIS_URL,
  port: REDIS_PORT,
});

client.on("error", (error) => console.error(`Redis Error: ${error}`));

// Promisify the methods you need
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const incrAsync = promisify(client.incr).bind(client);
const expireAsync = promisify(client.expire).bind(client);
const ttlAsync = promisify(client.ttl).bind(client);
const delAsync = promisify(client.del).bind(client);

// Export the client and the promisified methods
module.exports = {
  client,
  getAsync,
  setAsync,
  incrAsync,
  expireAsync,
  ttlAsync,
  delAsync,
};
