import mongoose from 'mongoose';

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    try { await mongoose.connection.close(); } catch { /* ignore */ }
  }
});
