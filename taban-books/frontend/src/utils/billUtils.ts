export const getBillStatusDisplay = (bill: any) => {
    if (!bill || typeof bill !== "object") {
        return { text: "OPEN", color: "text-blue-800 bg-blue-100" };
    }

    const status = (bill.status || "open").toLowerCase();

    const balance = parseFloat(String(bill.balance !== undefined ? bill.balance : (bill.balanceDue !== undefined ? bill.balanceDue : ((bill.total || 0) - (bill.paidAmount || 0)))));
    const total = parseFloat(String(bill.total || 0));

    if (balance <= 0 && total > 0 && status !== 'draft' && status !== 'void' && status !== 'cancelled') {
        return { text: "PAID", color: "text-green-800 bg-green-100" };
    }

    if (status === "paid") return { text: "PAID", color: "text-green-800 bg-green-100" };
    if (status === "draft") return { text: "DRAFT", color: "text-gray-600 bg-gray-50 border border-gray-100" };
    if (status === "void" || status === "cancelled") return { text: status.toUpperCase(), color: "text-gray-800 bg-gray-100" };
    if (balance > 0) return { text: "OPEN", color: "text-blue-800 bg-blue-100" };

    return { text: "OPEN", color: "text-blue-800 bg-blue-100" };
};
