
// Mock specific logic from sales.controller.ts to test it in isolation
async function testStockLogic() {
    console.log('--- Testing Stock Reduction Logic ---');

    // 1. Simulate payload from frontend (from .lean() + populate)
    const reqBodyItems = [
        {
            _id: "line_id_123",
            item: {
                _id: "item_id_123",
                name: "Test Item",
                rate: 100,
                trackInventory: true,
                stockQuantity: 50
            },
            quantity: 5,
            rate: 100,
            amount: 500
        }
    ];

    console.log('Payload Items:', JSON.stringify(reqBodyItems, null, 2));

    // 2. Logic extraction from controller
    console.log('Running extracted logic...');

    for (const item of reqBodyItems) {
        // --- LOGIC START ---
        const rawItemId = item.item || (item).itemId;
        // Handle if itemId is an object (populated)
        const itemId = (rawItemId && typeof rawItemId === 'object' && '_id' in rawItemId)
            ? rawItemId._id
            : rawItemId;
        const qty = item.quantity;
        // --- LOGIC END ---

        console.log('Resulting itemId:', itemId);
        console.log('Resulting qty:', qty);

        if (itemId === "item_id_123" && qty === 5) {
            console.log('PASS: Logic correctly extracted ID and Quantity.');
        } else {
            console.error('FAIL: Logic failed to extract ID or Quantity.');
        }
    }
}

testStockLogic();
