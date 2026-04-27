// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  X,
  Pencil,
  Mail,
  MoreVertical,
  ChevronDown,
  Download,
  Upload,
  Trash2,
  Copy,
  Plus,
  Search,
  ChevronUp,
  Paperclip,
  MessageSquare,
  FileText,
  Check,
  ChevronRight,
} from "lucide-react";
import { jsPDF } from "jspdf";
import SendPurchaseOrderEmail from "./SendPurchaseOrderEmail";
import { purchaseOrdersAPI, settingsAPI, profileAPI, vendorsAPI, billsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { PURCHASE_ORDER_VIEWS } from "./PurchaseOrders.constants";
import { filterPurchaseOrdersByView, getPurchaseOrdersDisplayText } from "./PurchaseOrders.utils";

const PURCHASE_ORDERS_LIST_CACHE_KEY = "purchase-orders-list-cache";

const mapPurchaseOrderForView = (purchaseOrder: any) => ({
  ...purchaseOrder,
  id: purchaseOrder?._id || purchaseOrder?.id,
});

const readCachedPurchaseOrders = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(PURCHASE_ORDERS_LIST_CACHE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map(mapPurchaseOrderForView) : [];
  } catch (error) {
    console.error("Failed to parse cached purchase orders in detail view:", error);
    return [];
  }
};

const readCachedOrganization = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem("organization");
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Failed to parse cached organization:", error);
    return null;
  }
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  const initialPurchaseOrder = location.state?.purchaseOrder || null;
  const [purchaseOrder, setPurchaseOrder] = useState(initialPurchaseOrder);
  const [isLoading, setIsLoading] = useState(!initialPurchaseOrder);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(() => {
    const stateOrders = location.state?.purchaseOrders;
    if (Array.isArray(stateOrders) && stateOrders.length > 0) {
      return stateOrders.map(mapPurchaseOrderForView);
    }

    return readCachedPurchaseOrders();
  });
  const [activeTab, setActiveTab] = useState("all");
  const [selectedView, setSelectedView] = useState("All");
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [vendor, setVendor] = useState(
    initialPurchaseOrder?.vendor && typeof initialPurchaseOrder.vendor === "object"
      ? initialPurchaseOrder.vendor
      : initialPurchaseOrder?.vendorName
        ? { name: initialPurchaseOrder.vendorName, displayName: initialPurchaseOrder.vendorName }
        : null
  );
  const [showPdfView, setShowPdfView] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [pdfPrintMenuOpen, setPdfPrintMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [organization, setOrganization] = useState(() => readCachedOrganization());
  const [bills, setBills] = useState([]);
  const [isBillsExpanded, setIsBillsExpanded] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef(null);
  const pdfPrintMenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const printContentRef = useRef<HTMLDivElement | null>(null);

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const loadData = async () => {
    if (!purchaseOrder) {
      setIsLoading(true);
    }
    try {
      if (!id) {
        navigate("/purchases/purchase-orders", { replace: true });
        return;
      }

      // 1) Load selected purchase order first for faster route transition.
      const detailResponse = await purchaseOrdersAPI.getById(id);
      const foundOrder = detailResponse?.data || detailResponse?.purchaseOrder || null;

      if (!foundOrder) {
        navigate("/purchases/purchase-orders", { replace: true });
        return;
      }

      setPurchaseOrder(foundOrder);
      setIsLoading(false);

      // 2) Load secondary data in background (non-blocking).
      Promise.allSettled([
        profileAPI.get(),
        purchaseOrdersAPI.getAll(),
      ]).then(([orgResult, listResult]) => {
        if (orgResult.status === "fulfilled") {
          const orgResponse = orgResult.value;
          if (orgResponse && (orgResponse.success || orgResponse.data)) {
            setOrganization(orgResponse.data || orgResponse.organization);
          }
        }

        if (listResult.status === "fulfilled") {
          const response = listResult.value;
          if (response && (response.code === 0 || response.success)) {
            setPurchaseOrders((response.data || []).map(mapPurchaseOrderForView));
          }
        }
      });

      const vId = foundOrder.vendor_id || (foundOrder.vendor?._id || foundOrder.vendor);
      if (vId && typeof vId === "string") {
        vendorsAPI.getById(vId)
          .then((vResponse) => {
            const vendorData = vResponse.data || vResponse.vendor;
            if (vendorData) setVendor(vendorData);
          })
          .catch((err) => {
            console.error("Error fetching vendor:", err);
          });
      }

      billsAPI.getAll({ purchaseOrderId: id })
        .then((billsResponse) => {
          if (billsResponse && billsResponse.success) {
            setBills(billsResponse.data || []);
          }
        })
        .catch((err) => {
          console.error("Error fetching associated bills:", err);
        });
    } catch (error) {
      console.error("Error loading purchase order data:", error);
      navigate("/purchases/purchase-orders", { replace: true });
      return;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined" || !purchaseOrders.length) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        PURCHASE_ORDERS_LIST_CACHE_KEY,
        JSON.stringify(purchaseOrders)
      );
    } catch (error) {
      console.error("Failed to persist purchase order detail cache:", error);
    }
  }, [purchaseOrders]);

  const handleMarkAsIssued = async () => {
    try {
      // Status 'sent' corresponds to 'Issued' in the UI logic
      const response = await purchaseOrdersAPI.update(purchaseOrder._id || id, { status: 'ISSUED' });
      if (response.success) {
        loadData();
      } else {
        alert("Failed to update status: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error marking as issued:", error);
      alert("An error occurred while updating the status.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (pdfPrintMenuRef.current && !pdfPrintMenuRef.current.contains(event.target)) {
        setPdfPrintMenuOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (moreMenuOpen || pdfPrintMenuOpen || dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuOpen, pdfPrintMenuOpen, dropdownOpen]);

  if (isLoading) {
    return null;
  }

  if (!purchaseOrder) {
    return (
      null
    );
  }

  // Send Email Modal
  {
    sendEmailOpen && (
      <SendPurchaseOrderEmail
        purchaseOrder={purchaseOrder}
        onClose={() => setSendEmailOpen(false)}
        onSend={async (data) => {
          try {
            const response = await purchaseOrdersAPI.sendEmail(purchaseOrder._id || id, data);
            if (response.success) {
              alert("Email sent successfully!");
              setSendEmailOpen(false);
              // Optionally reload data to see status change
              if (typeof loadData === 'function') loadData();
            } else {
              alert("Failed to send email: " + (response.message || "Unknown error"));
            }
          } catch (error) {
            console.error("Error sending email:", error);
            alert("An error occurred while sending the email.");
          }
        }}
      />
    )
  }

  const subTotal = purchaseOrder.items?.reduce((sum, item) => {
    const itemAmount = parseFloat(item.total || item.amount || (item.quantity * item.unitPrice) || 0);
    return sum + itemAmount;
  }, 0) || 0;

  const discount = parseFloat(purchaseOrder.discount || 0);
  const tax = parseFloat(purchaseOrder.tax || 0);
  const total = parseFloat(purchaseOrder.total) || (subTotal - discount + tax);
  const currency = resolvedBaseCurrencySymbol;

  const getPurchaseOrderId = () => String(purchaseOrder?._id || purchaseOrder?.id || id || "");

  const handleDownloadPDF = () => {
    if (!purchaseOrder) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const poNumber = String(purchaseOrder.purchaseOrderNumber || "PO");
    const poVendor = String(
      purchaseOrder.vendorName
      || purchaseOrder.vendor?.displayName
      || purchaseOrder.vendor?.name
      || ""
    );
    pdf.setFontSize(16);
    pdf.text("Purchase Order", 14, 16);
    pdf.setFontSize(10);
    pdf.text(`PO #: ${poNumber}`, 14, 28);
    pdf.text(`Date: ${formatDate(purchaseOrder.date)}`, 14, 34);
    pdf.text(`Vendor: ${poVendor}`, 14, 40);
    pdf.text(`Status: ${String(purchaseOrder.status || "")}`, 14, 46);
    pdf.text(`Total: ${currency}${Number(total || 0).toFixed(2)}`, 14, 52);
    pdf.save(`${poNumber.replace(/[^a-z0-9-]/gi, "_")}.pdf`);
  };

  const handlePrint = () => {
    const content = printContentRef.current;
    if (!content) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const clonedContent = content.cloneNode(true) as HTMLElement;
    clonedContent.querySelectorAll(".no-print").forEach((node) => node.remove());

    const cleanup = () => {
      window.removeEventListener("afterprint", cleanup);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    iframe.onload = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) {
        cleanup();
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${String(purchaseOrder.purchaseOrderNumber || "Purchase Order")}</title>
            <style>
              @page { size: A4; margin: 12mm; }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                font-family: Arial, Helvetica, sans-serif;
                color: #111827;
              }
              * { box-sizing: border-box; }
              .print-shell {
                width: 100%;
              }
              .print-shell .print-content {
                max-width: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none;
                border-radius: 0;
              }
              .print-shell .print-content * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            </style>
          </head>
          <body>
            <div class="print-shell">
              ${clonedContent.outerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();
      win.focus();
      setTimeout(() => {
        win.print();
        cleanup();
      }, 100);
    };

    window.addEventListener("afterprint", cleanup);
    iframe.src = "about:blank";
  };

  const persistPurchaseOrderPatch = async (patch: Record<string, any>) => {
    const poId = getPurchaseOrderId();
    if (!poId) throw new Error("Purchase order ID is missing.");
    const response = await purchaseOrdersAPI.update(poId, patch);
    const updated = response?.data || response?.purchaseOrder || response;
    if (updated && typeof updated === "object") {
      setPurchaseOrder((prev: any) => ({ ...(prev || {}), ...updated }));
    }
    window.dispatchEvent(new Event("purchaseOrdersUpdated"));
  };

  const handleAddComment = async () => {
    const text = window.prompt("Enter comment");
    if (!String(text || "").trim()) return;

    try {
      const existing = Array.isArray(purchaseOrder?.comments) ? purchaseOrder.comments : [];
      const nextComments = [
        ...existing,
        {
          id: `${Date.now()}`,
          text: String(text).trim(),
          author: "User",
          createdAt: new Date().toISOString(),
        },
      ];
      await persistPurchaseOrderPatch({ comments: nextComments });
      alert("Comment saved.");
    } catch (error: any) {
      console.error("Error saving purchase order comment:", error);
      alert(error?.message || "Failed to save comment.");
    }
  };

  const handleExpectedDeliveryDate = async () => {
    const currentValue = formatDate(purchaseOrder.deliveryDate || purchaseOrder.expectedDate);
    const nextValue = window.prompt("Enter expected delivery date (DD/MM/YYYY)", currentValue);
    if (!String(nextValue || "").trim()) return;

    try {
      await persistPurchaseOrderPatch({ deliveryDate: nextValue });
      alert("Expected delivery date updated.");
    } catch (error: any) {
      console.error("Error updating expected delivery date:", error);
      alert(error?.message || "Failed to update expected delivery date.");
    }
  };

  const handleMarkAsCanceled = async () => {
    try {
      await persistPurchaseOrderPatch({ status: "CANCELLED" });
      setMoreMenuOpen(false);
    } catch (error: any) {
      console.error("Error marking purchase order as canceled:", error);
      alert(error?.message || "Failed to mark as canceled.");
    }
  };

  const handleMarkAsReceived = async () => {
    try {
      await persistPurchaseOrderPatch({ status: "RECEIVED" });
      setMoreMenuOpen(false);
    } catch (error: any) {
      console.error("Error marking purchase order as received:", error);
      alert(error?.message || "Failed to mark as received.");
    }
  };

  const handleCancelItems = async () => {
    try {
      await persistPurchaseOrderPatch({ status: "CANCELLED" });
      setMoreMenuOpen(false);
    } catch (error: any) {
      console.error("Error cancelling purchase order items:", error);
      alert(error?.message || "Failed to cancel items.");
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const existing = Array.isArray(purchaseOrder?.attachments) ? purchaseOrder.attachments : [];
      const uploaded = await Promise.all(
        files.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          url: await readFileAsDataUrl(file),
          uploadedAt: new Date().toISOString(),
        }))
      );
      await persistPurchaseOrderPatch({ attachments: [...existing, ...uploaded] });
      alert("Attachment uploaded.");
    } catch (error: any) {
      console.error("Error uploading purchase order attachment:", error);
      alert(error?.message || "Failed to upload attachment.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const handleDeletePurchaseOrder = async () => {
    const poId = getPurchaseOrderId();
    if (!poId) return;
    if (!window.confirm("Are you sure you want to delete this purchase order?")) return;

    try {
      await purchaseOrdersAPI.delete(poId);
      window.dispatchEvent(new Event("purchaseOrdersUpdated"));
      navigateToPurchaseOrdersList();
    } catch (error: any) {
      console.error("Error deleting purchase order:", error);
      alert(error?.message || "Failed to delete purchase order.");
    }
  };

  const toEntityId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return String(value._id || value.id || "");
    return "";
  };

  const toFiniteNumber = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toISODate = (value: any) => {
    if (!value) return new Date().toISOString().split("T")[0];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
    return parsed.toISOString().split("T")[0];
  };

  const navigateToPurchaseOrdersList = () => {
    navigate("/purchases/purchase-orders", {
      state: { purchaseOrders },
    });
  };

  const handleClone = async () => {
    setMoreMenuOpen(false);
    if (!purchaseOrder) return;

    try {
      const sourceId = String(purchaseOrder._id || purchaseOrder.id || id || "");
      if (!sourceId) {
        alert("Cannot clone this purchase order because it has no ID.");
        return;
      }

      const sourceResponse = await purchaseOrdersAPI.getById(sourceId);
      const sourceOrder = sourceResponse?.data || sourceResponse?.purchaseOrder || purchaseOrder;
      if (!sourceOrder) {
        throw new Error("Could not load purchase order details for cloning.");
      }

      const vendorId = toEntityId(sourceOrder.vendor_id || sourceOrder.vendor || sourceOrder.vendorId);
      if (!vendorId) {
        throw new Error("Cannot clone this purchase order because it has no vendor.");
      }

      const nextNumberResponse = await purchaseOrdersAPI.getNextNumber();
      const nextPurchaseOrderNumber = String(nextNumberResponse?.data?.number || nextNumberResponse?.number || "").trim();
      if (!nextPurchaseOrderNumber) {
        throw new Error("Unable to generate purchase order number for clone.");
      }

      const sourceItems = Array.isArray(sourceOrder.items) ? sourceOrder.items : [];
      const clonedItems = sourceItems.map((item: any) => {
        const quantity = Math.max(1, toFiniteNumber(item?.quantity, 1));
        const rate = toFiniteNumber(item?.rate ?? item?.unitPrice ?? item?.price, 0);
        const amount = toFiniteNumber(item?.amount ?? item?.total, quantity * rate);
        const itemId = toEntityId(item?.item || item?.item_id || item?.itemId);

        return {
          item: itemId || undefined,
          name: item?.name || item?.itemDetails || item?.description || "Item",
          description: item?.description || item?.itemDetails || item?.name || "",
          itemDetails: item?.itemDetails || item?.name || item?.description || "Item",
          quantity,
          rate,
          amount,
          tax_id: item?.tax_id || item?.tax || null,
          account_id: item?.account_id || item?.account || "",
        };
      });

      const subTotal = toFiniteNumber(sourceOrder.sub_total ?? sourceOrder.subtotal ?? sourceOrder.subTotal);
      const tax = toFiniteNumber(sourceOrder.tax);
      const discount = toFiniteNumber(sourceOrder.discount);
      const totalFromSource = toFiniteNumber(sourceOrder.total ?? sourceOrder.amount);
      const computedTotal = subTotal - discount + tax;
      const total = totalFromSource > 0 ? totalFromSource : Math.max(0, computedTotal);

      const clonePayload = {
        date: toISODate(sourceOrder.date),
        purchase_order_number: nextPurchaseOrderNumber,
        reference_number: sourceOrder.reference_number || sourceOrder.referenceNumber || "",
        vendor_name:
          sourceOrder.vendor_name
          || sourceOrder.vendorName
          || sourceOrder.vendor?.displayName
          || sourceOrder.vendor?.name
          || "",
        vendor_id: vendorId,
        status: "draft",
        delivery_date: toISODate(sourceOrder.delivery_date || sourceOrder.deliveryDate || sourceOrder.expectedDate || sourceOrder.date),
        total,
        sub_total: subTotal,
        items: clonedItems,
        tax_exclusive: Boolean(sourceOrder.tax_exclusive),
        payment_terms: sourceOrder.payment_terms || sourceOrder.paymentTerms || "",
        shipment_preference: sourceOrder.shipment_preference || sourceOrder.shipmentPreference || "",
        notes: sourceOrder.notes || "",
        terms: sourceOrder.terms || sourceOrder.termsAndConditions || "",
      };

      const cloneResponse = await purchaseOrdersAPI.create(clonePayload);
      if (!cloneResponse || (!cloneResponse.success && cloneResponse.code !== 0)) {
        throw new Error(cloneResponse?.message || "Failed to clone purchase order.");
      }

      const clonedPurchaseOrderId =
        cloneResponse?.data?._id
        || cloneResponse?.data?.id
        || cloneResponse?.purchase_order?._id
        || cloneResponse?.purchase_order?.id;

      window.dispatchEvent(new Event("purchaseOrdersUpdated"));

      if (clonedPurchaseOrderId) {
        navigate(`/purchases/purchase-orders/${clonedPurchaseOrderId}`);
        return;
      }

      alert("Purchase order cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning purchase order:", error);
      alert(error?.message || "Failed to clone purchase order.");
    }
  };

  const viewFilteredOrders = filterPurchaseOrdersByView(purchaseOrders, selectedView);

  // Filter purchase orders based on search
  const filteredOrders = viewFilteredOrders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.purchaseOrderNumber?.toLowerCase().includes(query) ||
      order.vendorName?.toLowerCase().includes(query) ||
      order.referenceNumber?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-content {
            display: block !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
          }
          
          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="flex h-screen bg-white">
        {/* Left Sidebar - No Print */}
        <div className="no-print w-64 border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-gray-700 whitespace-nowrap"
                >
                  {getPurchaseOrdersDisplayText(selectedView)}
                  {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 max-h-[420px] w-[230px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {PURCHASE_ORDER_VIEWS.map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => {
                          setSelectedView(view);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                          selectedView === view
                            ? "border-l-2 border-l-[#156372] bg-[#eff6ff] font-medium text-gray-900"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{view}</span>
                        <span className="text-gray-300">☆</span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
                        <Plus size={12} />
                      </span>
                      <span>New Custom View</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => navigate("/purchases/purchase-orders/new")}
                  className="p-1.5 bg-[#156372] text-white rounded hover:bg-[#0D4A52]"
                >
                  <Plus size={16} />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Purchase Orders List */}
          <div className="flex-1 overflow-y-auto">
            {filteredOrders.map((order) => (
              <div
                key={order._id || order.id}
                onClick={() => navigate(`/purchases/purchase-orders/${order._id || order.id}`)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${String(order._id || order.id) === String(id) ? "bg-[#f1f3ff]" : ""
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-between items-start flex-1">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {order.vendorName || "Vendor"}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {order.purchaseOrderNumber || "PO-00000"} • {formatDate(order.date)}
                    </div>
                    {order.status && (
                      <div className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {order.status.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {resolvedBaseCurrencySymbol}{parseFloat(order.total || order.amount || 0).toFixed(2)}
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - No Print */}
          {/* Header - No Print */}
          <div className="no-print bg-white border-b border-gray-200">
            {/* Top Row: Title and Utility Icons */}
            <div className="px-6 py-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 m-0">
                {purchaseOrder.purchaseOrderNumber || "PO-00001"}
              </h1>

              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                  onClick={() => attachmentInputRef.current?.click()}
                  title="Add Attachment"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                  onClick={handleAddComment}
                  title="Add Comment"
                >
                  <MessageSquare size={18} />
                </button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  onChange={handleAttachmentUpload}
                  style={{ display: "none" }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <div className="w-px h-8 bg-gray-200 mx-1"></div>
                <button
                  onClick={navigateToPurchaseOrdersList}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="px-6 py-2 flex items-center gap-1 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => navigate(`/purchases/purchase-orders/${purchaseOrder._id || purchaseOrder.id || id}/edit`, {
                  state: { editOrder: purchaseOrder, isEdit: true }
                })}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <Pencil size={15} />
                Edit
              </button>

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              <button
                onClick={() => setSendEmailOpen(true)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-2">
                <Mail size={15} />
                Send Email
              </button>

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              <div className="relative" ref={pdfPrintMenuRef}>
                <button
                  onClick={() => setPdfPrintMenuOpen((prev) => !prev)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <Download size={15} />
                  PDF/Print
                  <ChevronDown size={12} />
                </button>
                {pdfPrintMenuOpen && (
                  <div className="absolute left-0 mt-2 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        setPdfPrintMenuOpen(false);
                        handleDownloadPDF();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        setPdfPrintMenuOpen(false);
                        handlePrint();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              {purchaseOrder.billedStatus !== "BILLED" && (
                <button
                  onClick={() => navigate("/purchases/bills/new", {
                    state: {
                      fromPurchaseOrder: true,
                      purchaseOrder: purchaseOrder
                    }
                  })}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-2">
                  <div className="p-0.5 border border-current rounded">
                    <FileText size={12} />
                  </div>
                  Convert to Bill
                </button>
              )}

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                  <MoreVertical size={18} />
                </button>

                {moreMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        void handleExpectedDeliveryDate();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <FileText size={16} />
                      Expected Delivery Date
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        void handleCancelItems();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Trash2 size={16} />
                      Cancel Items
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        void handleMarkAsCanceled();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <X size={16} />
                      Mark as Canceled
                    </button>
                    <button
                      onClick={handleClone}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Copy size={16} />
                      Clone
                    </button>
                    <div className="h-px bg-gray-200" />
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        void handleDeletePurchaseOrder();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        void handleMarkAsReceived();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Check size={16} />
                      Mark as Received
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blue Banner - No Print */}
          {purchaseOrder.billedStatus !== "BILLED" && (
            <div className="no-print bg-teal-50 border-b border-blue-100 px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span className="font-medium">💡 WHAT'S NEXT?</span>
                <span>Convert this to a bill to complete your purchase.</span>
              </div>
              <button
                onClick={() => navigate("/purchases/bills/new", {
                  state: {
                    fromPurchaseOrder: true,
                    purchaseOrder: purchaseOrder
                  }
                })}
                className="px-3 py-1 text-sm font-medium text-white bg-[#156372] rounded hover:bg-[#0D4A52]"
              >
                Convert to Bill
              </button>
            </div>
          )}

          {/* Bills List Section - No Print */}
          {bills.length > 0 && (
            <div className="no-print bg-white border-b border-gray-200">
              <div
                className={`flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isBillsExpanded ? 'border-b border-gray-100 bg-gray-50/30' : ''}`}
                onClick={() => setIsBillsExpanded(!isBillsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Bills</span>
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-100 text-teal-800 text-[10px] font-bold rounded-full">{bills.length}</span>
                </div>
                <div>
                  {isBillsExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                </div>
              </div>

              {isBillsExpanded && (
                <div className="p-4 bg-white overflow-x-auto">
                  <table className="w-full text-sm text-left border border-gray-100 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Bill#</th>
                        <th className="px-4 py-2 font-semibold">Date</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                        <th className="px-4 py-2 font-semibold">Due Date</th>
                        <th className="px-4 py-2 font-semibold">Amount</th>
                        <th className="px-4 py-2 font-semibold">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bills.map((bill) => (
                        <tr key={bill._id} className="hover:bg-teal-50/20 transition-colors group">
                          <td className="px-4 py-2">
                            <button
                              onClick={() => navigate(`/purchases/bills/${bill._id}`)}
                              className="text-teal-700 hover:text-blue-800 font-medium hover:underline"
                            >
                              {bill.billNumber}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{formatDate(bill.date)}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bill.status === 'paid' ? 'bg-green-100 text-green-700' :
                              bill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                bill.status === 'open' ? 'bg-blue-100 text-teal-800' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{formatDate(bill.dueDate)}</td>
                          <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                            {resolvedBaseCurrencySymbol} {bill.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                            {resolvedBaseCurrencySymbol} {bill.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Status Bar - No Print */}
          <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-700">
                Receive Status : <span className={`font-medium ${purchaseOrder.receiveStatus === "RECEIVED" ? "text-green-600" : "text-amber-600"}`}>
                  {purchaseOrder.receiveStatus === "RECEIVED" ? "RECEIVED" : "YET TO BE RECEIVED"}
                </span>
              </span>
              <span className="text-gray-700">
                Bill Status : <span className={`font-medium ${purchaseOrder.billedStatus === "BILLED" ? "text-green-600" : "text-amber-600"}`}>
                  {purchaseOrder.billedStatus === "BILLED" ? "BILLED" : "YET TO BE BILLED"}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 italic">Show PDF View</span>
              <div
                className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${showPdfView ? "bg-[#156372]" : "bg-gray-300"
                  }`}
                onClick={() => setShowPdfView(!showPdfView)}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${showPdfView ? "left-[22px]" : "left-0.5"
                    } shadow-md`}
                />
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex justify-center p-6">
            <div ref={printContentRef} className={`bg-white rounded-lg shadow-sm max-w-4xl w-full relative print-content ${showPdfView ? 'p-12' : 'p-8'}`}>

              {!showPdfView ? (
                /* Standard View Design (Matches User Provided Image) */
                <div className="space-y-8">
                  {/* Header Title Section */}
                  <div className="mb-6">
                    <h1 className="text-3xl font-normal text-gray-900 mb-1">
                      {purchaseOrder.billedStatus === "BILLED" ? "HDA COMFORT BILL" : "PURCHASE ORDER"}
                    </h1>
                    <div className="text-sm text-gray-600 mb-4">
                      Purchase Order# <span className="font-medium text-gray-900">{purchaseOrder.purchaseOrderNumber || "PO-00001"}</span>
                    </div>
                    {purchaseOrder.status === "draft" && (
                      <div className="inline-block px-2 py-0.5 text-xs font-bold bg-[#8e959c] text-white rounded">
                        DRAFT
                      </div>
                    )}
                  </div>

                  {/* Metadata Section - Two Columns */}
                  <div className="grid grid-cols-2 gap-12 border-t border-gray-100 pt-8 mt-4">
                    {/* Left Column: PO Details */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Reference#</span>
                        <span className="text-sm text-gray-900">{purchaseOrder.reference_number || purchaseOrder.referenceNumber || "—"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Order Date</span>
                        <span className="text-sm text-gray-900">{formatDate(purchaseOrder.date) || "—"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Payment Terms</span>
                        <span className="text-sm text-gray-900">{purchaseOrder.terms || "Due on Receipt"}</span>
                      </div>
                    </div>

                    {/* Right Column: Addresses */}
                    <div className="space-y-6">
                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Vendor Address</div>
                        <div className="text-teal-700 font-medium cursor-pointer hover:underline">
                          {vendor?.name || vendor?.displayName || purchaseOrder.vendorName || "Vendor"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {vendor?.address?.city || "—"}
                          {vendor?.address?.country && `, ${vendor.address.country}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Delivery Address</div>
                        <div className="text-sm text-gray-900 font-medium">{organization?.name || "Your Company"}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {organization?.address?.city || "Aland Islands"}{organization?.address?.country && `, ${organization.address.country}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Standard Items Table */}
                  <div className="mt-10 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/80 border-y border-gray-100">
                          <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                          <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Items & Description</th>
                          <th className="py-2 px-4 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ordered</th>
                          <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="py-2 px-4 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="py-2 px-4 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseOrder.items?.map((item, index) => (
                          <tr key={index}>
                            <td className="py-5 px-4 text-sm text-gray-500 align-top">{index + 1}</td>
                            <td className="py-5 px-4 align-top">
                              <div className="text-sm font-medium text-teal-700 cursor-pointer hover:underline mb-1">
                                {item.name || "No Name"}
                              </div>
                              <div className="text-xs text-gray-400 font-normal">{item.description}</div>
                            </td>
                            <td className="py-5 px-4 text-center align-top">
                              <div className="text-sm font-semibold text-gray-900">{item.quantity || "0"}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{item.unit || "dz"}</div>
                            </td>
                            <td className="py-5 px-4 align-top">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900 font-medium">
                                  {purchaseOrder.billedStatus === "BILLED" ? "1" : "0"}
                                </span>
                                <span className="text-sm text-gray-500">Billed</span>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-right text-sm text-gray-600 align-top">
                              {currency}{parseFloat(item.unitPrice || item.rate || 0).toFixed(2)}
                            </td>
                            <td className="py-5 px-4 text-right text-sm text-gray-900 align-top">
                              {parseFloat(item.total || item.amount || (item.quantity * item.unitPrice) || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Standard Totals Section */}
                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <div className="w-80 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-lg font-bold text-gray-900">Sub Total</span>
                          <div className="text-[11px] text-gray-400">
                            Total Quantity : {purchaseOrder.items?.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) || 0}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {currency}{subTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-base text-gray-500">Discount</span>
                        <span className="text-base text-gray-500">
                          {currency}{discount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <span className="text-2xl font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {currency}{total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PDF View Design (Original Design) */
                <>
                  {/* Issued Ribbon */}
                  {purchaseOrder.status === "sent" && (
                    <div className="absolute top-8 left-[-40px] bg-[#156372] text-white px-16 py-2 -rotate-45 text-sm font-bold shadow-md z-10">
                      Issued
                    </div>
                  )}
                  {purchaseOrder.billedStatus === "BILLED" && (
                    <div className="absolute top-8 left-[-40px] bg-green-600 text-white px-16 py-2 -rotate-45 text-sm font-bold shadow-md z-10">
                      BILLED
                    </div>
                  )}

                  {/* Document Header */}
                  <div className="mb-8">
                    <div className="flex justify-between items-start mb-8">
                      {/* Company Info */}
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">{organization?.name || organization?.displayName || "Your Company Name"}</div>
                        <div className="text-sm text-gray-600">
                          {organization?.address?.city || organization?.location || "Aland Islands"}
                          {organization?.address?.country && `, ${organization.address.country}`}
                        </div>
                        <div className="text-sm text-gray-600">{organization?.email || "organization@example.com"}</div>
                      </div>

                      {/* Title */}
                      <div className="text-right">
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                          {purchaseOrder.billedStatus === "BILLED" ? "HDA COMFORT BILL" : "PURCHASE ORDER"}
                        </h1>
                        <div className="text-sm font-medium text-gray-600">
                          # {purchaseOrder.purchaseOrderNumber || "PO-00001"}
                        </div>
                      </div>
                    </div>

                    {/* Vendor and Details */}
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <div className="mb-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Vendor Address</div>
                          <div className="text-teal-700 font-medium cursor-pointer hover:underline">
                            {vendor?.name || vendor?.displayName || purchaseOrder.vendorName || "waryaa"}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {vendor?.address?.street1 && <div>{vendor.address.street1}</div>}
                            {vendor?.address?.city && (
                              <div>{vendor.address.city}{vendor.address.country && `, ${vendor.address.country}`}</div>
                            )}
                            {vendor?.phone && <div>{vendor.phone}</div>}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Deliver To</div>
                          <div className="text-sm text-gray-900 font-medium">{organization?.name || "asc wcs"}</div>
                          <div className="text-sm text-gray-600">{organization?.address?.city || "Aland Islands"}{organization?.address?.country && `, ${organization.address.country}`}</div>
                          <div className="text-sm text-gray-600">{organization?.email || "asscvcs685@gmail.com"}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="mb-2">
                          <span className="text-sm text-gray-700">Date :</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {formatDate(purchaseOrder.date) || formatDate(new Date())}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-700">Ref# :</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {purchaseOrder.reference_number || purchaseOrder.referenceNumber || ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full mb-8">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="text-left py-3 px-4 text-sm font-medium">#</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Item & Description</th>
                        <th className="text-right py-3 px-4 text-sm font-medium">Qty</th>
                        <th className="text-right py-3 px-4 text-sm font-medium">Rate</th>
                        <th className="text-right py-3 px-4 text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrder.items?.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="py-3 px-4 text-sm text-gray-900">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-gray-900">
                              {(!item.name || item.name === "Unknown Item") ? (item.description || "No Name") : item.name}
                            </div>
                            <div className="text-xs text-gray-500">{(item.name && item.name !== "Unknown Item") ? item.description : ""}</div>
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-gray-900">
                            {item.quantity || "0.00"}
                            <div className="text-xs text-gray-500">{item.unit || ""}</div>
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-gray-900">
                            {parseFloat(item.unitPrice || item.rate || 0).toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-gray-900">
                            {parseFloat(item.total || item.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end mb-8">
                    <div className="w-64">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-700">Sub Total</span>
                        <span className="text-sm text-gray-900">{subTotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-700">Discount</span>
                          <span className="text-sm text-red-600">-{discount.toFixed(2)}</span>
                        </div>
                      )}
                      {tax > 0 && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-700">Tax</span>
                          <span className="text-sm text-gray-900">{tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-3 border-t-2 border-gray-800">
                        <span className="text-base font-bold text-gray-900">Total</span>
                        <span className="text-base font-bold text-gray-900">
                          {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      {sendEmailOpen && (
        <SendPurchaseOrderEmail
          purchaseOrder={purchaseOrder}
          organization={organization}
          onClose={() => setSendEmailOpen(false)}
          onSend={async (data) => {
            try {
              const response = await purchaseOrdersAPI.sendEmail(purchaseOrder._id || id, data);
              if (response.success) {
                alert("Email sent successfully!");
                setSendEmailOpen(false);
                // Reload data to see status change
                if (typeof loadData === 'function') {
                  loadData();
                } else {
                  window.location.reload();
                }
              } else {
                alert("Failed to send email: " + (response.error || "Unknown error"));
              }
            } catch (error) {
              console.error("Error sending email:", error);
              alert("An error occurred while sending the email.");
            }
          }}
        />
      )}

    </>
  );
}
