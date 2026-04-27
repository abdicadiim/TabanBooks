import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, ChevronDown } from 'lucide-react';
import ViewDropdown from './ViewDropdown';
import ActionDropdown from './ActionDropdown';
import NewSalesOrder from './newPage/NewSalesOrder'; 
import { salesOrdersAPI } from './salesOrderApi';

const SalesOrderList: React.FC = () => {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedView, setSelectedView] = useState('All Sales Orders');
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSalesOrders = async () => {
    setIsLoading(true);
    try {
      const response = await salesOrdersAPI.getAll({ limit: 100 });
      setSalesOrders(Array.isArray((response as any)?.data) ? (response as any).data : []);
    } catch (error) {
      console.error("Failed to load sales orders:", error);
      setSalesOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSalesOrders();
  }, []);

  // Switch between List and Form
  if (showNewOrder) {
    return (
      <NewSalesOrder
        onCancel={() => setShowNewOrder(false)}
        onSaved={async () => {
          setShowNewOrder(false);
          await loadSalesOrders();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-700">
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="relative">
          <button 
            onClick={() => setIsViewOpen(!isViewOpen)}
            className="flex flex-col items-start focus:outline-none group"
          >
            <div className="flex items-center gap-2 pb-1">
              <h1 className="text-base font-semibold text-[#092a2d]">{selectedView}</h1>
              <ChevronDown size={14} className="text-[#006e74]" />
            </div>
            <div className="h-[2px] w-full bg-[#092a2d]" />
          </button>

          <ViewDropdown 
            isOpen={isViewOpen} 
            onClose={() => setIsViewOpen(false)}
            selectedView={selectedView}
            onSelect={setSelectedView}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNewOrder(true)}
            className="bg-[#007b83] hover:bg-[#006e74] text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>New</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsActionOpen(!isActionOpen)}
              className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <MoreHorizontal size={20} className="text-gray-600" />
            </button>
            <ActionDropdown 
              isOpen={isActionOpen} 
              onClose={() => setIsActionOpen(false)} 
            />
          </div>
        </div>
      </header>

      <main className="p-8">
        {salesOrders.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {salesOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.customerName || order.customer?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {order.date ? new Date(order.date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.status || "draft"}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {Number(order.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[72vh] flex-col items-center justify-center text-center px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No sales orders found, yet</h2>
            <p className="text-gray-600 max-w-md">
              Sales orders will appear here once they are created or match your selected view.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SalesOrderList;
