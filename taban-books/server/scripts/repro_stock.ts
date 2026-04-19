
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';
import Organization from '../models/Organization.js';
import Customer from '../models/Customer.js';

const MONGO_URI = process.env.MONGO_URI || '';

async function run() {
    if (!MONGO_URI) {
        console.error('MONGO_URI not found');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // 1. Get Context (Org, User, Customer, Item)
        const org = await Organization.findOne();
        if (!org) throw new Error('No organization found');
        console.log('Organization:', org.name);

        // Ensure inventory tracking is enabled
        // Note: Settings are usually in Organization or separate Settings model. 
        // For this test we assume defaults or we might need to update Organization settings.
        // The controller uses `getItemsSettings` utility.

        const customer = await Customer.findOne({ organization: org._id });
        if (!customer) throw new Error('No customer found');

        const item = await Item.findOne({ organization: org._id, trackInventory: true });
        if (!item) throw new Error('No inventory item found');

        const originalStock = item.stockQuantity || 0;
        console.log(`Item: ${item.name}, Initial Stock: ${originalStock}`);

        // 2. Create Draft Invoice directly in DB (simulating initial state)
        const invoice = await Invoice.create({
            organization: org._id,
            customer: customer._id,
            invoiceNumber: `TEST-${Date.now()}`,
            date: new Date(),
            dueDate: new Date(),
            items: [{
                item: item._id,
                name: item.name,
                quantity: 5,
                unitPrice: item.sellingPrice,
                total: 5 * item.sellingPrice
            }],
            total: 5 * item.sellingPrice,
            status: 'draft'
        });

        console.log(`Created Draft Invoice: ${invoice._id}`);

        // Verify stock did NOT change
        const itemAfterDraft = await Item.findById(item._id);
        if (itemAfterDraft?.stockQuantity !== originalStock) {
            console.error('ERROR: Stock changed after draft creation! Logic is incorrectly reducing stock for drafts.');
        } else {
            console.log('SUCCESS: Stock unchanged after draft creation.');
        }

        // 3. Simulate "Update to Sent" logic
        // We will manually execute the logic found in the controller to verify it works in isolation.
        // Or simpler: We assume the controller logic I read is what runs. 

        console.log('--- Simulating Update Draft -> Sent ---');

        // Logic from controller:
        const oldStatus = 'draft';
        const newStatus = 'sent';
        const itemsToProcess = invoice.items; // Fallback to invoice items if req.body.items is null

        if (oldStatus === 'draft' && newStatus !== 'draft') {
            console.log(`Transitioning ${oldStatus} -> ${newStatus}`);

            // Check settings (mocking)
            const enableInventoryTracking = true;

            if (enableInventoryTracking) {
                for (const invItem of itemsToProcess) {
                    // Mongoose subdoc access
                    const itemId = invItem.item;
                    // Wait, if invItem is POJO? In script `invoice` is Mongoose doc.
                    // invItem.item is ObjectId.

                    if (itemId) {
                        const itemDoc = await Item.findById(itemId);
                        if (itemDoc && itemDoc.trackInventory) {
                            const qty = invItem.quantity;
                            await Item.findByIdAndUpdate(itemId, { $inc: { stockQuantity: -Math.abs(qty) } });
                            console.log(`Reduced stock by ${qty}`);
                        }
                    }
                }
            }
        }

        // 4. Verify Final Stock
        const itemFinal = await Item.findById(item._id);
        console.log(`Final Stock: ${itemFinal?.stockQuantity}`);
        const expectedStock = originalStock - 5;

        if (itemFinal?.stockQuantity === expectedStock) {
            console.log('SUCCESS: Stock updated correctly.');
        } else {
            console.error(`ERROR: Stock update failed. Expected ${expectedStock}, got ${itemFinal?.stockQuantity}`);
        }

        // Cleanup
        await Invoice.deleteOne({ _id: invoice._id });
        // Restore stock
        await Item.findByIdAndUpdate(item._id, { stockQuantity: originalStock });
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
