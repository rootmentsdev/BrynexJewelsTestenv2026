import connectMongoDB from '../db/database.js';
import ShoeItem from '../model/ShoeItem.js';
import ItemGroup from '../model/ItemGroup.js';
import Bill from '../model/Bill.js';
import PurchaseReceive from '../model/PurchaseReceive.js';
import TransferOrder from '../model/TransferOrder.js';
import InventoryAdjustment from '../model/InventoryAdjustment.js';
import mongoose from 'mongoose';

await connectMongoDB();
await new Promise(r => setTimeout(r, 2000));

const WAREHOUSE_NAME_MAPPING = {
  'arehouse Branch': 'Warehouse',
  'Warehouse': 'Warehouse',
  'Warehouse Branch': 'Warehouse',
  'MG Road': 'MG Road Branch',
  'MG Road Branch': 'MG Road Branch',
  'SuitorGuy MG Road': 'MG Road Branch',
  'G.Mg Road': 'MG Road Branch',
  'G.MG Road': 'MG Road Branch',
  '858': 'Warehouse',
  '718': 'MG Road Branch'
};

function norm(wh) {
  if (!wh) return 'Warehouse';
  const t = wh.toString().trim();
  return WAREHOUSE_NAME_MAPPING[t] || t;
}

const [bills, receives, transferOrders, adjustments, standaloneItems, itemGroups] = await Promise.all([
  Bill.find({}).lean(),
  PurchaseReceive.find({}).lean(),
  TransferOrder.find({}).lean(),
  InventoryAdjustment.find({}).lean(),
  ShoeItem.find({}).lean(),
  ItemGroup.find({}).lean(),
]);

const inwardHistoryMap = new Map();
const recordInward = (key, date, source) => {
  if (!key || !date) return;
  const d = new Date(date);
  if (isNaN(d.getTime())) return;
  const existing = inwardHistoryMap.get(key);
  if (!existing || d > existing.date) {
    inwardHistoryMap.set(key, { date: d, source });
  }
};

bills.forEach(bill => {
  const bDate = bill.billDate || bill.createdAt;
  const bWh = norm(bill.warehouse || bill.branch || 'Warehouse');
  (bill.items || []).forEach(item => {
    const itemId = (item.itemId || item._id || '').toString();
    const sku = (item.itemSku || item.sku || '').toString().toLowerCase().trim();
    const sourceLabel = 'Purchase Bill #' + (bill.billNumber || 'N/A');
    if (itemId) recordInward(itemId + '_' + bWh, bDate, sourceLabel);
    if (sku) recordInward(sku + '_' + bWh, bDate, sourceLabel);
  });
});

receives.forEach(rcv => {
  const rDate = rcv.receivedDate || rcv.createdAt;
  const rWh = norm(rcv.toWarehouse || 'Warehouse');
  (rcv.items || []).forEach(item => {
    const itemId = (item.itemId || item._id || '').toString();
    const sku = (item.itemSku || item.sku || '').toString().toLowerCase().trim();
    const sourceLabel = 'Purchase Receive #' + (rcv.receiveNumber || 'N/A');
    if (itemId) recordInward(itemId + '_' + rWh, rDate, sourceLabel);
    if (sku) recordInward(sku + '_' + rWh, rDate, sourceLabel);
  });
});

transferOrders.forEach(to => {
  const toDate = to.date || to.createdAt;
  const toWh = norm(to.destinationWarehouse);
  (to.items || []).forEach(item => {
    const itemId = (item.itemId || item._id || '').toString();
    const sku = (item.itemSku || item.sku || '').toString().toLowerCase().trim();
    const sourceLabel = 'Transfer Order #' + (to.transferOrderNumber || 'N/A');
    if (itemId && toWh) recordInward(itemId + '_' + toWh, toDate, sourceLabel);
    if (sku && toWh) recordInward(sku + '_' + toWh, toDate, sourceLabel);
  });
});

const asOf = new Date('2026-09-20');

['Warehouse', 'MG Road'].forEach(targetWh => {
  const targetNorm = norm(targetWh);
  console.log('=== STORE:', targetWh, '===');
  
  const processItem = (item, parentGroup = null) => {
    const itemId = (item._id || item.id || '').toString();
    const sku = (item.sku || '').toString().toLowerCase().trim();
    const name = item.itemName || item.name;
    const createdAt = item.createdAt || parentGroup?.createdAt || asOf;
    
    // Check inward in this store
    let inward = inwardHistoryMap.get(itemId + '_' + targetNorm) ||
                 inwardHistoryMap.get(sku + '_' + targetNorm);
    
    let inwardDate = inward ? inward.date : createdAt;
    let source = inward ? inward.source : 'Opening Stock / Creation';
    
    const diffMs = asOf.getTime() - new Date(inwardDate).getTime();
    const ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    
    const wsList = (item.warehouseStocks || []).filter(ws => norm(ws.warehouse) === targetNorm);
    const stock = wsList.reduce((sum, ws) => sum + (parseFloat(ws.stockOnHand || ws.availableForSale || 0) || 0), 0);
    
    console.log(' - ' + name + ' | Stock: ' + stock + ' | Inward Date: ' + new Date(inwardDate).toISOString().split('T')[0] + ' | Age: ' + ageInDays + ' days | Source: ' + source);
  };
  
  standaloneItems.forEach(i => processItem(i));
  itemGroups.forEach(g => {
    (g.items || []).forEach(v => processItem(v, g));
  });
});

await mongoose.disconnect();
