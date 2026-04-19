
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// @ts-ignore
import Invoice from '../models/Invoice.js';
// @ts-ignore
import Item from '../models/Item.js';
// @ts-ignore
import Organization from '../models/Organization.js';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import Customer from '../models/Customer.js';

// We need to mock the request/response for the controller
// @ts-ignore
import { updateInvoice, createInvoice } from '../controllers/sales.controller.js';

// Mock Express Request/Response
const mockRequest = (body: any, params: any, user: any) => ({
    body,
    params,
    user,
    query: {},
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.data = data;
        return res;
    };
    return res;
};

async function run() {
    console.log('--- Invoice Stock Update Payload Repro ---');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI not found in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Data: Org, User, Customer, Item
        const org = await Organization.findOne();
        if (!org) throw new Error('No Organization found');
        const user = await User.findOne({ organization: org._id });
        if (!user) throw new Error('No User found');
        const customer = await Customer.findOne({ organization: org._id });
        if (!customer) throw new Error('No Customer found');

        // Find an item that tracks inventory
        let item = await Item.findOne({ organization: org._id, trackInventory: true, stockQuantity: { $gt: 10 } });
        if (!item) {
            // Create one if not exists
            item = await Item.create({
                organization: org._id,
                name: "Repro Item",
                rate: 100,
                trackInventory: true,
                stockQuantity: 100,
                sku: "REPRO-001"
            });
        }

        const startStock = item.stockQuantity || 0;
        console.log(`Using Item: ${item.name} (${item._id})`);
        console.log(`Initial Stock: ${startStock}`);

        // item object as it might appear in frontend payload (simplified)
        const populatedItem = {
            _id: item._id, // This is usually the ID of the item
            name: item.name,
            rate: item.rate
        };

        // 2. Create Draft Invoice via Controller (or direct DB)
        // Let's create it directly to be sure it's valid first
        const invoice = await Invoice.create({
            organization: org._id,
            customer: customer._id,
            status: 'draft',
            date: new Date(),
            dueDate: new Date(),
            invoiceNumber: `INV-REPRO-${Date.now()}`,
            items: [
                {
                    item: item._id,
                    quantity: 5,
                    rate: 100,
                    amount: 500
                }
            ],
            total: 500,
            subtotal: 500,
            tax: 0
        });
        console.log(`Created Draft Invoice: ${invoice._id}`);

        // Verify stock is unchanged
        let currentItem = await Item.findById(item._id);
        if ((currentItem?.stockQuantity || 0) !== startStock) {
            console.error('Stock changed unexpectedly after draft creation!');
        } else {
            console.log('Stock unchanged after draft creation (Correct).');
        }

        // 3. Simulate "Mark as Sent" payload from frontend
        // The frontend sends the Populate Item Object in the "item" field
        const payloadItems = [
            {
                // Simulate what Mongoose/Frontend often does: 
                // If populated, 'item' is an object.
                // But 'updateInvoice' receives JSON. 
                // If frontend sends { ...invoice }, it sends items array.
                // If invoice was fetched with population, items[0].item is an OBJECT.
                item: populatedItem,
                quantity: 5,
                rate: 100,
                amount: 500,
                _id: invoice.items[0]._id // preserve line item ID
            }
        ];

        const req = mockRequest(
            {
                status: 'sent',
                items: payloadItems, // Sending the populated items back!
                // ... other fields that might comes from ...invoice
                customer: customer._id,
                date: invoice.date
            },
            { id: invoice._id.toString() },
            { organizationId: org._id.toString(), userId: user._id.toString() }
        );
        const res = mockResponse();

        console.log('Calling updateInvoice with status: sent and populated items...');
        await updateInvoice(req, res);

        console.log('Response status:', res.statusCode);
        if (res.data) {
            console.log('Response success:', res.data.success);
            if (!res.data.success) console.log('Message:', res.data.message);
        }

        // 4. Verify Final Stock
        const finalItem = await Item.findById(item._id);
        const expectedStock = startStock - 5;
        console.log(`Final Stock: ${finalItem?.stockQuantity}`);

        if (finalItem?.stockQuantity === expectedStock) {
            console.log('SUCCESS: Stock reduced correctly.');
        } else {
            console.error(`FAILURE: Stock did not reduce. Expected ${expectedStock}, got ${finalItem?.stockQuantity}`);
        }

        // Cleanup
        await Invoice.findByIdAndDelete(invoice._id);

    } catch (error) {
        console.error('Error running repro:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
