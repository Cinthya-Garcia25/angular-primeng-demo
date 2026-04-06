require('dotenv').config();

module.exports = {
  GATEWAY_PORT:        process.env.GATEWAY_PORT        ?? 3000,
  JWT_SECRET:          process.env.JWT_SECRET,
  USERS_SERVICE_URL:   process.env.USERS_SERVICE_URL   ?? 'http://localhost:3001',
  TICKETS_SERVICE_URL: process.env.TICKETS_SERVICE_URL ?? 'http://localhost:3002',
  GROUPS_SERVICE_URL:  process.env.GROUPS_SERVICE_URL  ?? 'http://localhost:3003',
};
