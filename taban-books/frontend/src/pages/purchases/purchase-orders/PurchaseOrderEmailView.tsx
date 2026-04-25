import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { purchaseOrdersAPI, profileAPI } from "../../../services/api";
import SendPurchaseOrderEmail from "./SendPurchaseOrderEmail";

export default function PurchaseOrderEmailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load organization info
        const orgResponse = await profileAPI.get();
        if (orgResponse && (orgResponse.success || orgResponse.data)) {
          setOrganization(orgResponse.data || orgResponse.organization);
        }

        // Load PO info
        const poResponse = await purchaseOrdersAPI.getById(id);
        if (poResponse && (poResponse.success || poResponse.data)) {
          setPurchaseOrder(poResponse.data || poResponse.purchaseOrder);
        }
      } catch (error) {
        console.error("Error loading email view data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const handleSend = async (emailData: any) => {
    try {
      const response = await purchaseOrdersAPI.sendEmail(id, emailData);
      if (response && response.success) {
        // Trigger update event
        window.dispatchEvent(new Event("purchaseOrdersUpdated"));
        // Success! Navigate to the PO detail page
        navigate(`/purchases/purchase-orders/${id}`);
      } else {
        alert("Failed to send email: " + (response?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error sending PO email:", error);
      alert("An error occurred while sending the email.");
    }
  };

  const handleClose = () => {
    navigate(`/purchases/purchase-orders/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#156372]"></div>
          <p className="text-gray-500 text-sm">Loading purchase order details...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="p-12 text-center h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 border-dashed">
          <p className="text-gray-600 mb-6">Purchase Order not found</p>
          <button
            onClick={() => navigate("/purchases/purchase-orders")}
            className="px-4 py-2 bg-[#156372] text-white rounded hover:bg-[#0D4A52] transition-colors"
          >
            Back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">Preparing email for {purchaseOrder.purchaseOrderNumber}...</p>
      </div>
      <SendPurchaseOrderEmail
        purchaseOrder={purchaseOrder}
        organization={organization}
        onClose={handleClose}
        onSend={handleSend}
      />
    </div>
  );
}
