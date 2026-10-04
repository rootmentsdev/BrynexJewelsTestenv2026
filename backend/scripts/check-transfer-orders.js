import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.development') });

// MongoDB Transfer Order Schema (simplified)
const transferOrderSchema = new mongoose.Schema({}, { strict: false, collection: 'transferorders' });
const TransferOrder = mongoose.model('TransferOrder', transferOrderSchema);

async function checkTransferOrders() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI_DEV || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in environment variables');
      console.log('   Looking for: MONGODB_URI_DEV or MONGO_URI');
      console.log('   Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
      return;
    }
    
    console.log(`   Using: ${mongoUri.substring(0, 30)}...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected!\n');

    // Fetch all transfer orders
    const orders = await TransferOrder.find({}).sort({ createdAt: -1 }).limit(20).lean();
    
    console.log(`📦 Found ${orders.length} transfer orders (showing last 20):\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    if (orders.length === 0) {
      console.log('❌ No transfer orders found in database');
    } else {
      orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Transfer Order: ${order.transferOrderNumber || 'N/A'}`);
        console.log(`   Status: ${order.status || 'N/A'}`);
        console.log(`   Source Warehouse: "${order.sourceWarehouse || 'N/A'}"`);
        console.log(`   Destination Warehouse: "${order.destinationWarehouse || 'N/A'}"`);
        console.log(`   Date: ${order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}`);
        console.log(`   Created: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`   Items: ${order.items?.length || 0}`);
        console.log(`   User ID: ${order.userId || 'N/A'}`);
        console.log(`   Created By: ${order.createdBy || 'N/A'}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    
    // Check for Kottayam-related orders specifically
    const kottayamOrders = orders.filter(order => {
      const source = (order.sourceWarehouse || '').toLowerCase();
      const dest = (order.destinationWarehouse || '').toLowerCase();
      return source.includes('kottayam') || dest.includes('kottayam');
    });
    
    if (kottayamOrders.length > 0) {
      console.log(`\n✅ Found ${kottayamOrders.length} Kottayam-related transfer orders:`);
      kottayamOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.transferOrderNumber}: ${order.sourceWarehouse} → ${order.destinationWarehouse} (${order.status})`);
      });
    } else {
      console.log('\n❌ No Kottayam-related transfer orders found');
      console.log('💡 This explains why the Kottayam Branch user sees 0 orders');
    }
    
    // Show unique warehouse names
    const allWarehouses = new Set();
    orders.forEach(order => {
      if (order.sourceWarehouse) allWarehouses.add(order.sourceWarehouse);
      if (order.destinationWarehouse) allWarehouses.add(order.destinationWarehouse);
    });
    
    if (allWarehouses.size > 0) {
      console.log('\n📍 All warehouse names in transfer orders:');
      Array.from(allWarehouses).sort().forEach(warehouse => {
        console.log(`   - "${warehouse}"`);
      });
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

checkTransferOrders();
