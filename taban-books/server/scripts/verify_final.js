
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taban_test';

// Define Minimal Schemas (using mongoose.Schema directly)
const ItemSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    rate: Number,
    trackInventory: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0 },
});
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

const InvoiceSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, default: 'draft' },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity: Number
    }]
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

const OrganizationSchema = new mongoose.Schema({
    name: String,
    settings: {
        itemsSettings: {
            enableInventoryTracking: { type: Boolean, default: true }
        }
    }
});
const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

async function runTest() {
    console.log('--- ESM STOCK VERIFICATION ---');
    try {
        if (!MONGO_URI) throw new Error("MONGO_URI is missing");

        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // Setup
        const orgID = new mongoose.Types.ObjectId();
        const org = await Organization.create({
            _id: orgID,
            name: 'ESM Test ' + Date.now(),
            settings: { itemsSettings: { enableInventoryTracking: true } }
        });

        const initialStock = 100;
        const item = await Item.create({
            organization: org._id,
            name: 'ESM Item',
            stockQuantity: initialStock,
            trackInventory: true
        });

        const invoice = await Invoice.create({
            organization: org._id,
            status: 'draft',
            items: [{ item: item._id, quantity: 10 }]
        });
        console.log('Created Data.');

        // Simulate Controller Logic
        // In the controller, req.body.items might be populated documents
        const populatedItems = [{
            item: { _id: item._id.toString(), name: item.name }, // Populated object
            quantity: 10
        }];

        const itemsToProcess = populatedItems;
        console.log('Running logic on populated items...');

        for (const lineItem of itemsToProcess) {
            // THE FIX LOGIC:
            const rawItemId = lineItem.item;
            const itemId = rawItemId?._id || rawItemId; // JS optional chaining works in Node 16+
            const qty = lineItem.quantity;

            console.log(`Extracted ID: ${itemId}`);

            if (itemId && qty) {
                const itemDoc = await Item.findById(itemId);
                if (itemDoc && itemDoc.trackInventory) {
                    const newQty = (itemDoc.stockQuantity || 0) - Math.abs(qty);
                    await Item.findByIdAndUpdate(itemId, { stockQuantity: newQty });
                    console.log(`Updated Stock to: ${newQty}`);
                }
            }
        }

        const updatedItem = await Item.findById(item._id);
        console.log(`Final Stock: ${updatedItem.stockQuantity}`);

        if (updatedItem.stockQuantity === 90) {
            console.log('SUCCESS: Stock reduced.');
        } else {
            console.error('FAIL: Stock not reduced.');
            process.exit(1);
        }

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
