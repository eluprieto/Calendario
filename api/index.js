// Vercel serverless entry point. Express apps are plain (req, res) => {}
// handlers, so exporting it directly is enough — no app.listen() here.
const app = require('../nail-booking/backend/server');

module.exports = app;
