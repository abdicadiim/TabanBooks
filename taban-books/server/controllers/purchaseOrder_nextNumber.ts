/**
 * Get next purchase order number from transaction series
 * GET /api/purchase-orders/next-number
 */
export const getNextPurchaseOrderNumber = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.organizationId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized - Organization ID required'
            });
            return;
        }

        // Find the default transaction number series for Purchase Orders
        const series = await TransactionNumberSeries.findOne({
            organization: req.user.organizationId,
            module: 'Purchase Order',
            isDefault: true,
            isActive: true
        });

        if (!series) {
            // If no series found, return a default number
            res.json({
                success: true,
                data: {
                    number: 'PO-00001',
                    message: 'No transaction series found, using default'
                }
            });
            return;
        }

        // Get the next number
        const nextNumber = series.currentNumber + 1;
        const formattedNumber = `${series.prefix}${nextNumber.toString().padStart(series.startingNumber.length, '0')}`;

        // Update the current number in the series
        series.currentNumber = nextNumber;
        await series.save();

        res.json({
            success: true,
            data: {
                number: formattedNumber,
                currentNumber: nextNumber
            }
        });

    } catch (error: any) {
        console.error('Error getting next purchase order number:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get next purchase order number',
            error: error.message
        });
    }
};
