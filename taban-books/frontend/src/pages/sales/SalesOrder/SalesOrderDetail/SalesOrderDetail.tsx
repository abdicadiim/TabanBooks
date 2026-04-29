import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Edit,
  Mail,
  Share2,
  FileText,
  MoreHorizontal,
  X,
  ChevronDown,
  Printer,
  Download,
  Copy,
  Trash2,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Paperclip,
  Settings,
  Send,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { salesOrdersAPI } from "../salesOrderApi";
import { pdfTemplatesAPI, settingsAPI } from "../../../../services/api";
import TransactionPDFDocument from "../../../../components/Transactions/TransactionPDFDocument";
import { toast } from "react-hot-toast";
import { COLOR_THEMES } from "../../../settings/pdfTemplates/constants";

const SalesOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPdfView, setShowPdfView] = useState(true);
  const [activePdfTemplate, setActivePdfTemplate] = useState<any>(null);
  const [activeTheme, setActiveTheme] = useState<any>(COLOR_THEMES[0]);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const salesOrderDocumentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [orderRes, allOrdersRes, templatesRes, orgRes] = await Promise.all([
          salesOrdersAPI.getById(id),
          salesOrdersAPI.getAll({ limit: 50 }),
          pdfTemplatesAPI.get(),
          settingsAPI.getOrganizationProfile()
        ]);

        const order = orderRes?.data || orderRes;
        setSalesOrder(order);
        setAllOrders(Array.isArray(allOrdersRes?.data) ? allOrdersRes.data : []);

        const templates = templatesRes?.data?.templates || [];
        const defaultTemplate = templates.find((t: any) => t.moduleType === "sales-orders" && t.isDefault) || 
                               templates.find((t: any) => t.moduleType === "sales-orders") || 
                               templates[0];
        setActivePdfTemplate(defaultTemplate);

        const org = orgRes?.data || orgRes;
        setOrganizationProfile(org);
        
        if (defaultTemplate?.config?.general?.colorTheme) {
          const theme = COLOR_THEMES.find(t => t.id === defaultTemplate.config.general.colorTheme);
          if (theme) setActiveTheme(theme);
        }
      } catch (error) {
        console.error("Failed to load sales order details:", error);
        toast.error("Failed to load sales order details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleEdit = () => {
    navigate(`/sales/sales-orders/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this sales order?")) return;
    try {
      await salesOrdersAPI.delete(id);
      toast.success("Sales order deleted successfully");
      navigate("/sales/sales-orders");
    } catch (error) {
      toast.error("Failed to delete sales order");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#156372]" />
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white">
        <h2 className="text-xl font-semibold text-gray-900">Sales Order not found</h2>
        <button onClick={() => navigate("/sales/sales-orders")} className="mt-4 text-[#156372] hover:underline">
          Back to Sales Orders
        </button>
      </div>
    );
  }

  const getTotalsMeta = (order: any) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const subTotal = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || (Number(item.quantity || 0) * Number(item.rate || 0))), 0);
    const total = order.total || subTotal;
    return {
      subTotal,
      total,
      taxAmount: 0,
      discount: 0,
      shippingCharges: 0,
      adjustment: 0,
      roundOff: 0
    };
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#f8fafc]">
      {/* Left Sidebar - List of Orders */}
      <aside className="w-[320px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="h-[74px] px-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/sales/sales-orders")} className="p-1 hover:bg-gray-100 rounded-md">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-gray-900">Sales Orders</h2>
          </div>
          <button 
            onClick={() => navigate("/sales/sales-orders/new")}
            className="p-1.5 bg-[#156372] text-white rounded-md hover:bg-[#0d4a52]"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {allOrders.map((order) => (
            <div
              key={order._id || order.id}
              onClick={() => navigate(`/sales/sales-orders/${order._id || order.id}`)}
              className={`p-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50 ${
                id === (order._id || order.id) ? "bg-blue-50/50 border-l-4 border-l-[#156372]" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-semibold text-gray-900">{order.customerName || "Unnamed Customer"}</span>
                <span className="text-xs font-medium text-gray-500">{order.total?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{order.orderNumber}</span>
                <span>{new Date(order.date).toLocaleDateString()}</span>
              </div>
              <div className="mt-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  order.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                }`}>
                  {order.status?.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Header / Action Bar */}
        <header className="h-[74px] flex items-center justify-between px-6 border-b border-gray-200 bg-white z-20">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {salesOrder.orderNumber}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded uppercase tracking-wider">
                {salesOrder.status}
              </span>
            </h1>
            <p className="text-xs text-gray-500">{salesOrder.customerName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit size={16} />
              Edit
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md" title="Email">
              <Mail size={18} />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md" title="Print" onClick={() => window.print()}>
              <Printer size={18} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMoreDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Copy size={14} /> Clone
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
            <button className="ml-2 px-4 py-1.5 bg-[#156372] text-white rounded-md text-sm font-bold hover:bg-[#0d4a52] transition-colors shadow-sm">
              Convert to Invoice
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-8">
          <div className="max-w-4xl mx-auto">
            {/* Design Preview Section */}
            <div 
              ref={salesOrderDocumentRef}
              className="bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden transition-all duration-300"
              style={{ minHeight: '1123px' }} // A4 aspect ratio height
            >
              <TransactionPDFDocument
                data={{
                  ...salesOrder,
                  number: salesOrder.orderNumber,
                  date: salesOrder.date,
                  items: (salesOrder.items || []).map((item: any) => ({
                    ...item,
                    name: item.name || item.item?.name || "Item",
                    rate: item.unitPrice || item.rate || 0,
                    amount: item.total || item.amount || 0
                  }))
                }}
                organization={organizationProfile}
                config={activePdfTemplate?.config || {}}
                moduleType="sales_orders"
                totalsMeta={getTotalsMeta(salesOrder)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SalesOrderDetail;
