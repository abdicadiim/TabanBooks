export const getInvoiceStatusDisplay = (inv: any) => {
    const status = (inv.status || "draft").toLowerCase();

    // Reset hours for accurate day calc
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.balance !== undefined ? inv.balance : ((inv.total || 0) - (inv.paidAmount || inv.amountPaid || 0)));
    const total = inv.total || 0;
    const due = inv.dueDate ? new Date(inv.dueDate) : null;
    if (due) due.setHours(0, 0, 0, 0);

    // If fully paid
    if (balance <= 0 && total > 0 && status !== 'draft' && status !== 'void') {
        return { text: "PAID", color: "text-green-800 bg-green-100" };
    }

    // Check for overdue first if it's not draft/void and has balance
    if (due && balance > 0 && status !== 'draft' && status !== 'void') {
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            const overdueDays = Math.abs(diffDays);
            return { text: `OVERDUE BY ${overdueDays} DAY${overdueDays !== 1 ? 'S' : ''}`, color: "text-orange-700 bg-orange-100" };
        }
    }

    // If not overdue, but partially paid
    if (balance < total && balance > 0 && status !== 'draft' && status !== 'void') {
        return { text: "PARTIALLY PAID", color: "text-teal-800 bg-teal-100" };
    }

    // Rest of status-based checks
    if (status === "paid") return { text: "PAID", color: "text-green-800 bg-green-100" };
    if (status === "draft") return { text: "DRAFT", color: "text-blue-600 bg-blue-50 border border-blue-100" };
    if (status === "void") return { text: "VOID", color: "text-gray-800 bg-gray-100" };

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
    return { text: status.toUpperCase(), color: "text-blue-800 bg-blue-100" };
};
