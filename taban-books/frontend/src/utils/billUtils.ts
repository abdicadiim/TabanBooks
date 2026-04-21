export const getBillStatusDisplay = (bill: any) => {
    if (!bill || typeof bill !== "object") {
        return { text: "DUE", color: "text-blue-800 bg-blue-100" };
    }

    const status = (bill.status || "open").toLowerCase();

    // Reset hours for accurate day calc
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const balance = parseFloat(String(bill.balance !== undefined ? bill.balance : (bill.balanceDue !== undefined ? bill.balanceDue : ((bill.total || 0) - (bill.paidAmount || 0)))));
    const total = parseFloat(String(bill.total || 0));
    const due = bill.dueDate ? new Date(bill.dueDate) : null;
    if (due) due.setHours(0, 0, 0, 0);

    // If fully paid
    if (balance <= 0 && total > 0 && status !== 'draft' && status !== 'void' && status !== 'cancelled') {
        return { text: "PAID", color: "text-green-800 bg-green-100" };
    }

    // Check for partially paid logic first
    if (balance < total && balance > 0 && status !== 'draft' && status !== 'void' && status !== 'cancelled') {
        return { text: "PARTIALLY PAID", color: "text-teal-800 bg-teal-100" };
    }

    // Check for overdue if it's not draft/void/cancelled and has balance
    if (due && balance > 0 && status !== 'draft' && status !== 'void' && status !== 'cancelled') {
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            const overdueDays = Math.abs(diffDays);
            return { text: `OVERDUE BY ${overdueDays} DAY${overdueDays !== 1 ? 'S' : ''}`, color: "text-orange-700 bg-orange-100" };
        }
    }

    // Rest of status-based checks
    if (status === "paid") return { text: "PAID", color: "text-green-800 bg-green-100" };
    if (status === "draft") return { text: "DRAFT", color: "text-gray-600 bg-gray-50 border border-gray-100" };
    if (status === "void" || status === "cancelled") return { text: status.toUpperCase(), color: "text-gray-800 bg-gray-100" };

    // Future due dates
    if (due && balance > 0) {
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return { text: "DUE TODAY", color: "text-blue-800 bg-blue-100" };
        } else if (diffDays > 0) {
            return { text: `DUE IN ${diffDays} DAY${diffDays !== 1 ? 'S' : ''}`, color: "text-blue-800 bg-blue-100" };
        }
    }

    // Fallback
    return { text: status === 'open' ? 'DUE' : status.toUpperCase(), color: "text-blue-800 bg-blue-100" };
};
