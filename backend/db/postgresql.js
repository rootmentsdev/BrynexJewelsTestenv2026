import dotenv from 'dotenv';
dotenv.config(); // 🔥 MUST BE FIRST - Load .env before reading any env variables

import { Sequelize } from 'sequelize';
import fs from 'fs';

// NOW read NODE_ENV (after .env is loaded)
const env = process.env.NODE_ENV || 'development';

// Get PostgreSQL connection details from environment variables
const getPostgresConfig = () => {
  if (env === 'production') {
    return {
      database: process.env.POSTGRES_DB_PROD || process.env.POSTGRES_DB,
      username: process.env.POSTGRES_USER_PROD || process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD_PROD || process.env.POSTGRES_PASSWORD,
      host: process.env.POSTGRES_HOST_PROD || process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT_PROD || process.env.POSTGRES_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.POSTGRES_LOGGING === 'true' ? console.log : false,
    };
  } else {
    // Development configuration
    return {
      database: process.env.POSTGRES_DB_DEV || process.env.POSTGRES_DB || 'rootfin_dev',
      username: process.env.POSTGRES_USER_DEV || process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD_DEV || process.env.POSTGRES_PASSWORD || 'postgres',
      host: process.env.POSTGRES_HOST_DEV || process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT_DEV || process.env.POSTGRES_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.POSTGRES_LOGGING === 'true' ? console.log : false,
      // Development-specific options
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };
  }
};

// Alternative: Use connection URI if provided
const getConnectionUri = () => {
  if (env === 'production') {
    const uri = process.env.POSTGRES_URI_PROD || process.env.DATABASE_URL;
    // Reject placeholder values
    if (uri && uri.includes('[')) return null;
    return uri || null;
  } else {
    const uri = process.env.POSTGRES_URI_DEV;
    if (uri && uri.includes('[')) return null;
    return uri || null;
  }
};

// Initialize Sequelize instance
let sequelize;

const initializePostgres = () => {
  const connectionUri = getConnectionUri();
  
  if (connectionUri) {
    // Use connection URI (common for cloud providers like Heroku, Render, etc.)
    sequelize = new Sequelize(connectionUri, {
      dialect: 'postgres',
      logging: process.env.POSTGRES_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: env === 'production' ? {
          require: true,
          rejectUnauthorized: false,
        } : false,
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  } else {
    // Use individual connection parameters
    const config = getPostgresConfig();
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: config.logging,
        pool: config.pool,
      }
    );
  }

  return sequelize;
};

// Connect to PostgreSQL database
const connectPostgreSQL = async () => {
  try {
    if (!sequelize) {
      sequelize = initializePostgres();
    }

    await sequelize.authenticate();
    console.log(`✅ PostgreSQL connected [${env}]`);
    console.log(`📊 Database: ${sequelize.getDatabaseName()}`);
    
    // Sync models (use migrations in production for safety)
    if (process.env.SYNC_DB === 'true') {
      console.log('🔄 Syncing database models...');
      // Import all models to ensure they're loaded before sync
      await import('../models/sequelize/index.js');
      
      // Use force: false and alter: false in production to avoid syntax errors
      // Only create tables if they don't exist, don't modify existing ones
      const syncOptions = { 
        force: false,  // Don't drop existing tables
        alter: false   // Don't alter existing tables (prevents UNIQUE constraint syntax errors)
      };
      
      console.log(`📊 Sync mode: safe (create new tables only, don't alter existing)`);
      await sequelize.sync(syncOptions);
      console.log('✅ Database models synced');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    console.error('💡 Make sure PostgreSQL is running and credentials are correct');
    // Don't crash the server - MongoDB-only features will still work
  }
};

// Get the Sequelize instance (for model definitions)
const getSequelize = () => {
  if (!sequelize) {
    sequelize = initializePostgres();
  }
  return sequelize;
};

export { connectPostgreSQL, getSequelize, initializePostgres };
// Default export returns the Sequelize instance getter
export default getSequelize;

