import React, { useState } from 'react';
import { Search, Star, PlusCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface ViewItem {
  id: string;
  label: string;
  isFavorite?: boolean;
}

interface ViewDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  selectedView: string;
  onSelect: (view: string) => void;
}

const views: ViewItem[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'partially_invoiced', label: 'Partially Invoiced' },
  { id: 'invoiced', label: 'Invoiced' },
  { id: 'closed', label: 'Closed' },
  { id: 'void', label: 'Void' },
  { id: 'customer_viewed', label: 'Customer Viewed' },
];

const ViewDropdown: React.FC<ViewDropdownProps> = ({ isOpen, onClose, selectedView, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredViews = views.filter(v => 
    v.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Backdrop to close dropdown when clicking outside */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      
      <div className="absolute top-12 left-6 z-20 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        {/* Search Input */}
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-blue-400 rounded focus:outline-none ring-2 ring-blue-50"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {filteredViews.map((view) => (
            <div
              key={view.id}
              onClick={() => {
                onSelect(view.label);
                onClose();
              }}
              className={`
                group flex items-center justify-between px-4 py-2 text-sm cursor-pointer
                ${selectedView === view.label ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}
              `}
            >
              <span>{view.label}</span>
              <Star 
                size={14} 
                className={`text-gray-300 group-hover:text-gray-400 ${view.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} 
              />
            </div>
          ))}
        </div>

        {/* Footer Action */}
       
      </div>
    </>
  );
};

export default ViewDropdown;