import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  ShoppingCart,
  RotateCcw,
  Package,
  Truck,
  Receipt,
  FileMinus,
  ShoppingBag,
  PackageCheck,
  CreditCard,
  BarChart,
  TrendingUp,
  Barcode,
} from "lucide-react";
import { TEMPLATE_TYPES } from "../constants";

const iconMap = {
  FileText,
  ShoppingCart,
  RotateCcw,
  Package,
  Truck,
  Receipt,
  FileMinus,
  ShoppingBag,
  PackageCheck,
  CreditCard,
  BarChart,
  TrendingUp,
  Barcode,
};

const TemplateSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentType = location.pathname.split("/").pop() || "invoices";

  const handleTypeClick = (typeId) => {
    navigate(`/settings/templates/${typeId}`);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
      </div>
      <nav className="p-2">
        {TEMPLATE_TYPES.map((type) => {
          const Icon = iconMap[type.icon] || FileText;
          const isActive = currentType === type.id;

          return (
            <button
              key={type.id}
              onClick={() => handleTypeClick(type.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              <span className="text-sm">{type.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default TemplateSidebar;

