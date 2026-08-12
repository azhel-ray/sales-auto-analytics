// Vercel Serverless Function — entry point untuk backend Express.
// Ekspor app Express agar Vercel bisa menjalankannya sebagai fungsi API.
const { app } = require('../backend/src/index');

module.exports = app;
