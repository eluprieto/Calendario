const mongoose = require('mongoose');

// Reused across invocations in the same serverless container instead of
// opening a new connection per request.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI).then(m => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
