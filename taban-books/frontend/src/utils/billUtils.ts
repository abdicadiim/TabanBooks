export const getBillStatusDisplay = (bill: any) => {
    if (!bill || typeof bill !== "object") {
        return { text: "OPEN", color: "text-blue-700 bg-blue-100" };
    }

    const status = (bill.status || "open").toLowerCase();

    const balance = parseFloat(String(bill.balance !== undefined ? bill.balance : (bill.balanceDue !== undefined ? bill.balanceDue : ((bill.total || 0) - (bill.paidAmount || 0)))));
    const total = parseFloat(String(bill.total || 0));

    if (balance <= 0 && total > 0 && status !== 'draft' && status !== 'void' && status !== 'cancelled') {
        return { text: "PAID", color: "text-green-700 bg-green-100" };
    }

    if (status === "paid") return { text: "PAID", color: "text-green-700 bg-green-100" };
    if (status === "draft") return { text: "DRAFT", color: "text-slate-600 bg-slate-100 border border-slate-200" };
    if (status === "void" || status === "cancelled") return { text: status.toUpperCase(), color: "text-slate-700 bg-slate-100" };
    if (balance > 0) return { text: "OPEN", color: "text-blue-700 bg-blue-100" };

    return { text: "OPEN", color: "text-blue-700 bg-blue-100" };
};
