import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  Download, 
  Upload, 
  Settings, 
  Columns2, 
  RefreshCw, 
  ChevronRight,
  ArrowDown
} from 'lucide-react';

interface ActionDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({ isOpen, onClose }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      
      <div className="absolute top-12 right-0 z-40 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-1 text-sm text-gray-700">
        
        {/* Sort by */}
        <div 
          className="relative group"
          onMouseEnter={() => setHoveredItem('sort')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <ArrowUpDown size={16} className="text-gray-400" />
              <span>Sort by</span>
            </div>
            <ChevronRight size={14} className="text-gray-400" />
          </button>

          {/* Sub-menu: Sort */}
          {hoveredItem === 'sort' && (
            <div className="absolute top-0 right-full mr-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <div className="px-4 py-2 bg-[#4a90e2] text-white flex items-center justify-between">
                <span className="font-medium">Created Time</span>
                <ArrowDown size={14} />
              </div>
              {['Date', 'Sales Order#', 'Reference#', 'Customer Name', 'Amount'].map((item) => (
                <button key={item} className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors">
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors">
          <Download size={16} className="text-blue-500" />
          <span>Import Sales Orders</span>
        </button>

        {/* Export */}
        <div 
          className="relative group"
          onMouseEnter={() => setHoveredItem('export')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Upload size={16} className="text-blue-500" />
              <span>Export</span>
            </div>
            <ChevronRight size={14} className="text-gray-400" />
          </button>

          {/* Sub-menu: Export */}
          {hoveredItem === 'export' && (
            <div className="absolute top-0 right-full mr-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <button className="w-full text-left px-4 py-2 bg-[#4a90e2] text-white font-medium">
                Export Sales Orders
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Export Current View
              </button>
            </div>
          )}
        </div>

        <div className="h-[1px] bg-gray-100 my-1" />

        <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors">
          <Settings size={16} className="text-gray-400" />
          <span>Preferences</span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors">
          <Columns2 size={16} className="text-gray-400" />
          <span>Manage Custom Fields</span>
        </button>

        <div className="h-[1px] bg-gray-100 my-1" />

        <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors">
          <RefreshCw size={16} className="text-gray-400" />
          <span>Refresh List</span>
        </button>
      </div>
    </>
  );
};

export default ActionDropdown;