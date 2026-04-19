import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Plus, ChevronDown } from "lucide-react";
import { getCustomers, saveInvoice } from "../../salesModel";
import { invoicesAPI, projectsAPI, taxesAPI } from "../../../../services/api";

type TaxOption = { id: string; name: string; rate: number };
type ProjectOption = { id: string; name: string; customer?: string };
type LineRow = {
  id: number;
  description: string;
  taxId: string;
  amount: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NewRetailInvoice() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"draft" | "sent" | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("RET-00001");
  const [customerId, setCustomerId] = useState("");
  const [location] = useState("Head Office");
  const [reference, setReference] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [projectId, setProjectId] = useState("");
  const [xcv, setXcv] = useState("None");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [taxes, setTaxes] = useState<TaxOption[]>([]);

  const [rows, setRows] = useState<LineRow[]>([
    { id: Date.now(), description: "", taxId: "", amount: 0 },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [custs, nextNumResp, taxResp, projectResp] = await Promise.all([
          getCustomers(),
          invoicesAPI.getNextNumber("RET-").catch(() => null),
          taxesAPI.getAll({ status: "active" }).catch(() => ({ data: [] })),
          projectsAPI.getAll({ limit: 1000 }).catch(() => ({ data: [] })),
        ]);

        setCustomers(Array.isArray(custs) ? custs : []);

        const nextNumber =
          nextNumResp?.data?.nextNumber || nextNumResp?.nextNumber || nextNumResp?.data?.invoiceNumber;
        if (nextNumber && typeof nextNumber === "string") {
          setInvoiceNumber(nextNumber);
        }

        const taxList = (taxResp?.data || taxResp?.taxes || [])
          .map((t: any) => ({
            id: String(t._id || t.id),
            name: String(t.name || "Tax"),
            rate: Number(t.rate || 0),
          }))
          .filter((t: TaxOption) => t.id);
        setTaxes(taxList);

        const projectList = (projectResp?.data || projectResp?.projects || [])
          .map((p: any) => ({
            id: String(p._id || p.id),
            name: String(p.projectName || p.name || "Project"),
            customer: String(p.customer || p.customerId || p.customer_id || ""),
          }))
          .filter((p: ProjectOption) => p.id);
        setProjects(projectList);
      } catch (error) {
        console.error("Error loading retail invoice page data:", error);
      }
    };

    loadData();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c._id || c.id) === customerId),
    [customers, customerId]
  );

  const customerProjects = useMemo(() => {
    if (!customerId) return [] as ProjectOption[];
    return projects.filter((p) => String(p.customer) === customerId || !p.customer);
  }, [projects, customerId]);

  const taxById = useMemo(() => {
    const map = new Map<string, TaxOption>();
    taxes.forEach((t) => map.set(t.id, t));
    return map;
  }, [taxes]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [rows]
  );

  const totalTax = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const rate = Number(taxById.get(r.taxId)?.rate || 0);
        return sum + (Number(r.amount) || 0) * (rate / 100);
      }, 0),
    [rows, taxById]
  );

  const total = useMemo(() => subtotal + totalTax, [subtotal, totalTax]);

  const setRow = (id: number, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: Date.now(), description: "", taxId: "", amount: 0 }]);
  };

  const removeRow = (id: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleSave = async (status: "draft" | "sent") => {
    if (!customerId) {
      alert("Please select a customer.");
      return;
    }

    const items = rows
      .filter((r) => r.description.trim() || Number(r.amount) > 0)
      .map((r) => {
        const rate = Number(taxById.get(r.taxId)?.rate || 0);
        const amount = Number(r.amount) || 0;
        const taxAmount = amount * (rate / 100);
        return {
          name: r.description || "Item",
          description: r.description,
          quantity: 1,
          unitPrice: amount,
          taxRate: rate,
          taxAmount,
          total: amount + taxAmount,
        };
      });

    setLoading(true);
    setSavingMode(status);

    try {
      await saveInvoice({
        invoiceNumber,
        customer: customerId,
        customerName: selectedCustomer?.displayName || selectedCustomer?.name || "",
        date: invoiceDate,
        dueDate: invoiceDate,
        status,
        items,
        subtotal,
        tax: totalTax,
        total,
        notes: customerNotes,
        terms,
        orderNumber: reference,
        paymentTerms: "Due on Receipt",
        currency: "USD",
      } as any);

      navigate("/sales/invoices");
    } catch (error: any) {
      console.error("Error saving retail invoice:", error);
      alert(error?.message || "Failed to save invoice");
    } finally {
      setLoading(false);
      setSavingMode(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f9] pb-24">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-[32px] leading-none font-normal text-black flex items-center gap-2">New Retainer Invoice</h1>
        <button onClick={() => navigate("/sales/invoices")} className="text-gray-500 hover:text-gray-700">
          <X size={22} />
        </button>
      </div>

      <div className="px-6 py-5">
        <div className="bg-white border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-[220px_1fr] gap-y-4 gap-x-4 max-w-[860px]">
              <label className="text-sm text-[#db4b4b] pt-2">Customer Name*</label>
              <div className="flex">
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setProjectId("");
                  }}
                  className="h-10 w-full rounded-l-md border border-gray-300 px-3 text-sm"
                >
                  <option value="">Select or add a customer</option>
                  {customers.map((c: any) => {
                    const id = String(c._id || c.id);
                    const name = c.displayName || c.name || "Customer";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                <button className="h-10 w-10 bg-[#3b82f6] text-white rounded-r-md flex items-center justify-center">
                  <Search size={16} />
                </button>
              </div>

              <label className="text-sm text-gray-700 pt-2">Location</label>
              <select className="h-10 max-w-[260px] rounded-md border border-gray-300 px-3 text-sm" value={location} readOnly>
                <option>Head Office</option>
              </select>
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-[220px_1fr] gap-y-4 gap-x-4 max-w-[860px]">
              <label className="text-sm text-[#db4b4b] pt-2">Retainer Invoice Number*</label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-10 max-w-[260px] rounded-md border border-gray-300 px-3 text-sm"
              />

              <label className="text-sm text-gray-700 pt-2">Reference#</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-10 max-w-[260px] rounded-md border border-gray-300 px-3 text-sm"
              />

              <label className="text-sm text-[#db4b4b] pt-2">Retainer Invoice Date*</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-10 max-w-[260px] rounded-md border border-gray-300 px-3 text-sm"
              />

              <label className="text-sm text-gray-700 pt-2">Project Name</label>
              <div>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-10 max-w-[260px] w-full rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="">Select a project</option>
                  {customerProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {!customerId && <p className="text-xs text-gray-500 mt-1">Select a customer to associate a project.</p>}
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-[220px_1fr] gap-y-4 gap-x-4 max-w-[860px]">
              <label className="text-sm text-[#db4b4b] pt-2">xcv *</label>
              <select value={xcv} onChange={(e) => setXcv(e.target.value)} className="h-10 max-w-[260px] rounded-md border border-gray-300 px-3 text-sm">
                <option>None</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            <div className="border border-gray-300">
              <table className="w-full text-sm">
                <thead className="bg-[#fafbfc]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-r border-gray-300">Description</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-r border-gray-300 w-[180px]">Tax</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700 w-[180px]">Amount</th>
                    <th className="w-[48px]" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-300">
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          value={row.description}
                          onChange={(e) => setRow(row.id, { description: e.target.value })}
                          placeholder="Description"
                          className="w-full h-9 border-none outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300">
                        <div className="relative">
                          <select
                            value={row.taxId}
                            onChange={(e) => setRow(row.id, { taxId: e.target.value })}
                            className="w-full h-9 rounded border border-gray-200 px-2 pr-8 text-sm"
                          >
                            <option value="">Select a Tax</option>
                            {taxes.map((t) => (
                              <option key={t.id} value={t.id}>{`${t.name} [${t.rate}%]`}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => setRow(row.id, { amount: Number(e.target.value) || 0 })}
                          className="w-full h-9 text-right rounded border border-gray-200 px-2 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700">x</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1.5 text-[#3b82f6] text-sm hover:underline"
              >
                <Plus size={14} /> Add New Row
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_430px] gap-6">
              <div />
              <div className="bg-[#f8fafc] rounded-md border border-gray-200 p-4 text-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Sub Total</span>
                  <span className="font-medium">{subtotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 my-2" />
                <div className="flex items-center justify-between py-2 text-xl font-semibold">
                  <span>Total</span>
                  <span>{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 space-y-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Customer Notes</label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Enter any notes to be displayed in your transaction"
                className="w-full max-w-[560px] h-20 rounded-md border border-gray-300 p-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                className="w-full max-w-[900px] h-20 rounded-md border border-gray-300 p-3 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-3 flex items-center gap-2">
        <button
          onClick={() => handleSave("draft")}
          disabled={loading}
          className="h-9 px-4 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {savingMode === "draft" ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={() => handleSave("sent")}
          disabled={loading}
          className="h-9 px-4 rounded bg-[#3b82f6] text-sm text-white hover:bg-[#2563eb] disabled:opacity-60"
        >
          {savingMode === "sent" ? "Saving..." : "Save and Send"}
        </button>
        <button
          onClick={() => navigate("/sales/invoices")}
          className="h-9 px-4 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
