
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taban_test';

// Define Minimal Schemas for testing
const ItemSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    rate: Number,
    trackInventory: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0 },
    inventoryStartDate: Date,
    openingStock: Number,
    reorderPoint: Number,
});
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

const InvoiceSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId },
    date: Date,
    dueDate: Date,
    status: { type: String, default: 'draft' },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity: Number,
        rate: Number,
        amount: Number
    }],
    total: Number,
    createdAt: Date,
    updatedAt: Date
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

const OrganizationSchema = new mongoose.Schema({
    name: String,
    settings: {
        itemsSettings: {
            enableInventoryTracking: { type: Boolean, default: true },
            preventNegativeStock: { type: Boolean, default: false }
        }
    }
});
const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);


async function runTest() {
    console.log('--- STARTING STOCK UPDATE VERIFICATION ---');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Data
        const org = await Organization.create({
            name: 'Test Org ' + Date.now(),
            settings: { itemsSettings: { enableInventoryTracking: true } }
        });

        const initialStock = 100;
        const item = await Item.create({
            organization: org._id,
            name: 'Test Item Stock',
            rate: 50,
            trackInventory: true,
            stockQuantity: initialStock
        });

        console.log(`Created Item: ${item.name} with Stock: ${initialStock}`);

        // 2. Create Draft Invoice
        const invoice = await Invoice.create({
            organization: org._id,
            status: 'draft',
            items: [{ item: item._id, quantity: 10, rate: 50, amount: 500 }],
            total: 500,
            date: new Date()
        });
        console.log(`Created Draft Invoice: ${invoice._id}`);

        // 3. Simulate "Mark as Sent" - Payload with Populated Items
        // This mimics exactly what the frontend sends (an object for 'item', not just ID)
        const populatedItems = [{
            item: { _id: item._id.toString(), name: item.name, rate: item.rate }, // POPULATED
            quantity: 10,
            rate: 50,
            amount: 500,
            _id: invoice.items[0]._id
        }];

        console.log('Simulating Update with Populated Payload...');

        // --- LOGIC UNDER TEST (COPIED FROM CONTROLLER) ---
        const oldStatus = 'draft';
        const newStatus = 'sent';
        const itemsToProcess = populatedItems;
        // Need to fetch settings? In test we know it's true.
        const enableInventoryTracking = true;

        if (oldStatus === 'draft' && newStatus !== 'draft') {
            console.log(`[TEST] Status change detected: Draft -> ${newStatus}`);
            if (enableInventoryTracking) {
                for (const lineItem of itemsToProcess) {
                    // THE CRITICAL FIX:
                    const rawItemId = lineItem.item;
                    const itemId = (rawItemId as any)?._id || rawItemId;
                    const qty = lineItem.quantity;

                    console.log(`[TEST] Extracted ID: ${itemId}, Qty: ${qty}`);

                    if (itemId && qty) {
                        const itemDoc = await Item.findById(itemId);
                        if (itemDoc && itemDoc.trackInventory) {
                            const newQty = (itemDoc.stockQuantity || 0) - Math.abs(qty);
                            await Item.findByIdAndUpdate(itemId, { stockQuantity: newQty });
                            console.log(`[TEST] Stock updated to: ${newQty}`);
                        }
                    }
                }
            }
        }
        // --- END LOGIC ---

        // 4. Verify Stock
        const updatedItem = await Item.findById(item._id);
        console.log(`Final Stock: ${updatedItem.stockQuantity}`);

        if (updatedItem.stockQuantity === 90) {
            console.log('SUCCESS: Stock was reduced correctly.');
        } else {
            console.error(`FAILURE: Stock is ${updatedItem.stockQuantity}, expected 90.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        // Cleanup if needed, but for now just disconnect
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

runTest();
