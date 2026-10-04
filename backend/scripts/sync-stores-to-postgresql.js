import mongoose from 'mongoose';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rootfinance';

// PostgreSQL connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'rootfinance',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  locCode: String,
  power: String,
});

const User = mongoose.model('User', userSchema);

// PostgreSQL Store Model
const Store = sequelize.define('Store', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  locCode: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: Sequelize.STRING,
    defaultValue: '',
  },
}, {
  tableName: 'Stores',
  timestamps: true,
});

async function syncStores() {
  try {
    console.log('🔄 Starting store sync from MongoDB to PostgreSQL...\n');

    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Connect to PostgreSQL
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Sync the Store model
    await sequelize.sync({ alter: false });
    console.log('✅ Store table ready\n');

    // Fetch all users from MongoDB
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in MongoDB\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Process each user
    for (const user of users) {
      if (!user.locCode) {
        console.log(`⏭️  Skipping user "${user.username}" - no locCode`);
        skipped++;
        continue;
      }

      try {
        // Check if store already exists
        const existingStore = await Store.findOne({
          where: { locCode: user.locCode },
        });

        if (existingStore) {
          // Update if needed
          if (existingStore.name !== user.username || existingStore.email !== (user.email || '')) {
            await existingStore.update({
              name: user.username,
              email: user.email || '',
            });
            console.log(`✏️  Updated store: ${user.username} (${user.locCode})`);
            updated++;
          } else {
            console.log(`✓ Store already exists: ${user.username} (${user.locCode})`);
            skipped++;
          }
        } else {
          // Create new store
          await Store.create({
            name: user.username,
            locCode: user.locCode,
            email: user.email || '',
          });
          console.log(`✨ Created store: ${user.username} (${user.locCode})`);
          created++;
        }
      } catch (error) {
        console.error(`❌ Error processing user "${user.username}":`, error.message);
      }
    }

    console.log(`\n📈 Sync Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${created + updated + skipped}`);

    // Verify the sync
    const allStores = await Store.findAll();
    console.log(`\n✅ Total stores in PostgreSQL: ${allStores.length}`);

    console.log('\n✅ Store sync completed successfully!');
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await sequelize.close();
  }
}

syncStores();
