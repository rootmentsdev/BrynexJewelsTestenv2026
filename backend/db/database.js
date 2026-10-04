import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import dns from 'node:dns';

// Fix for querySrv ECONNREFUSED on Windows / local DNS resolvers
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('⚠️ Could not override DNS servers:', dnsErr.message);
}

// 🔁 Load correct .env file based on env (only if not loaded already by server.js)
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const connectMongoDB = async () => {
  const dbURI =
    env === 'production'
      ? process.env.MONGODB_URI_PROD || process.env.MONGODB_URI
      : process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;

  if (!dbURI) {
    console.error('❌ MONGODB_URI is not defined in environment file.');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGODB')));
    return;
  }

  // 🛑 Safety check: Prevent connecting to production DB locally
  if (env !== 'production' && dbURI.includes('rootfin.onrender.com')) {
    console.warn('❌ Aborting: Trying to connect to production DB from non-production env.');
    return;
  }

  // Add connection event listeners for resilience against network drops
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting automatic reconnection...');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully.');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime connection error:', err.message);
  });

  const attemptConnect = async (attempt = 1) => {
    try {
      await mongoose.connect(dbURI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 20,
        minPoolSize: 2,
      });
      console.log(`✅ MongoDB connected successfully [${env}]`);
    } catch (error) {
      console.error(`⚠️ MongoDB connection attempt ${attempt} failed:`, error.message);
      console.log(`⏳ Retrying MongoDB connection in 5 seconds...`);
      setTimeout(() => attemptConnect(attempt + 1), 5000);
    }
  };

  await attemptConnect();
};

export default connectMongoDB;