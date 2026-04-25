import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronDown, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import toast from "react-hot-toast";

export default function ImportValueMapFields() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, characterEncoding, type } = location.state || {};

  const [importedHeaders, setImportedHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [dateFormat, setDateFormat] = useState("yyyy-MM-dd");
  const [isDateFormatDropdownOpen, setIsDateFormatDropdownOpen] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const dateFormatRef = useRef(null);

  const dateFormats = [
    "yyyy/MM/dd",
    "dd.MM.yy",
    "MM/dd/yyyy",
    "dd.MM.yyyy",
    "yyyyMMdd",
    "MM-dd-yyyy",
    "MM.dd.yy",
    "dd MMM yy",
    "yyyy.MM.dd",
    "dd-MM-yy",
    "dd/MMM/yyyy",
    "dd/MM/yyyy",
    "MM.dd.yyyy",
    "dd-MM-yyyy",
    "dd/MM/yy",
    "yyyy-MM-dd",
    "dd MMM yyyy",
    "MM/dd/yy",
    "yy.MM.dd"
  ];

  const allFields = [
    { id: "account", label: "Account", required: true },
    { id: "branchName", label: "Branch Name" },
    { id: "costPrice", label: "Cost Price" },
    { id: "date", label: "Date", required: true },
    { id: "description", label: "Description" },
    { id: "itemDescription", label: "Item Description" },
    { id: "itemName", label: "Item Name", required: true },
    { id: "newQuantityOnHand", label: "Changed Value" },
    { id: "newValue", label: "New Value" },
    { id: "reason", label: "Reason", required: true },
    { id: "referenceNumber", label: "Reference Number", required: true },
    { id: "sku", label: "SKU" },
    { id: "status", label: "Status" },
    { id: "unit", label: "Unit" },
    { id: "quantityAdjusted", label: "Adjusted Value" },
    { id: "valueAdjusted", label: "Value Adjusted" },
    { id: "quantityOnHand", label: "Current Value" },
    { id: "valueOnHand", label: "Value on Hand" },
    { id: "warehouseName", label: "Warehouse Name" }
  ];

  useEffect(() => {
    if (!file) {
      toast.error("No file selected. Please go back and select a file.");
      navigate("/inventory/import/value");
      return;
    }

    parseFile();
  }, [file]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateFormatRef.current && !dateFormatRef.current.contains(event.target)) {
        setIsDateFormatDropdownOpen(false);
      }
    };

    if (isDateFormatDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDateFormatDropdownOpen]);

  const parseFile = async () => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        toast.error("File is empty");
        return;
      }

      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      setImportedHeaders(headers);

      const autoMappings = {};
      // The global 'allFields' array is used directly for auto-mapping.
      // The line 'const allMapped = allFields.filter(field => field.required).every(field => fieldMappings[field.id]);'
      // from the instruction seems to be a check for *after* mapping, not for setting up the fields to be mapped.
      // The original intent was likely to use the globally defined 'allFields' for the auto-mapping loop.
      headers.forEach(header => {
        const headerLower = header.toLowerCase();
        allFields.forEach(field => {
          const fieldLower = field.label.toLowerCase();
          if (headerLower.includes(fieldLower) || fieldLower.includes(headerLower)) {
            if (!autoMappings[field.id]) {
              autoMappings[field.id] = header;
            }
          }
        });
      });

      setFieldMappings(autoMappings);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file");
    }
  };

  const handleMappingChange = (fieldId, header) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldId]: header === "Select" ? "" : header
    }));
  };

  const handleNext = () => {
    // Validation removed as per user request
    const missingFields = allFields.filter(field => field.required && !fieldMappings[field.id]);

    if (missingFields.length > 0) {
      console.warn(`Missing required fields: ${missingFields.map(f => f.label).join(", ")}`);
    }

    navigate("/inventory/import/value/preview", {
      state: {
        file,
        characterEncoding,
        type,
        fieldMappings,
        dateFormat,
        saveSelections
      }
    });
  };

  const handlePrevious = () => {
    navigate("/inventory/import/value", {
      state: { file, characterEncoding, type }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Map Fields</h1>
          <button
            onClick={() => navigate("/inventory")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center font-semibold">✓</div>
            <span className="text-gray-600">Configure</span>
          </div>
          <div className="w-16 h-0.5 bg-[#156372]"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center font-semibold">2</div>
            <span className="font-semibold text-[#156372]">Map Fields</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-semibold">3</div>
            <span className="text-gray-600">Preview</span>
          </div>
        </div>

        {file && (
          <div className="mb-4 p-3 bg-[#156372]/5 border border-[#156372]/20 rounded-lg">
            <p className="text-sm text-[#156372]">
              <strong>Your Selected File:</strong> {file.name}
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-[#156372]/5 border border-[#156372]/20 rounded-lg">
          <p className="text-sm text-[#156372]">
            The best match to each field on the selected file have been auto-selected.
          </p>
        </div>

        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Default Data Formats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Date</label>
              <div className="relative" ref={dateFormatRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDateFormatDropdownOpen(!isDateFormatDropdownOpen);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 text-sm"
                >
                  <span>{dateFormat}</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {isDateFormatDropdownOpen && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {dateFormats.map((format) => (
                      <div
                        key={format}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateFormat(format);
                          setIsDateFormatDropdownOpen(false);
                        }}
                        className={`px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm ${dateFormat === format ? "bg-[#156372]/10 text-[#156372]" : ""
                          }`}
                      >
                        {format}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Select format at field level</p>
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Decimal Format</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm">1234567.89</span>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Edit size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Others</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b border-gray-200">
              <div className="text-sm font-semibold text-gray-700">TABAN FIELD</div>
              <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
            </div>

            {allFields.map((field) => { // Use allFields here
              const isDateField = field.id === "date";
              return (
                <div key={field.id} className="grid grid-cols-2 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={fieldMappings[field.id] || ""}
                        onChange={(e) => handleMappingChange(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[#156372]/20"
                      >
                        <option value="">Select</option>
                        {importedHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                    {isDateField && fieldMappings[field.id] && (
                      <div className="relative">
                        <input
                          type="text"
                          value={dateFormat}
                          readOnly
                          className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm w-32"
                        />
                      </div>
                    )}
                    {fieldMappings[field.id] && (
                      <button
                        onClick={() => handleMappingChange(field.id, "Select")}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveSelections}
              onChange={(e) => setSaveSelections(e.target.checked)}
              className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
            />
            <span className="text-sm text-gray-700">Save these selections for use during future imports.</span>
          </label>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/inventory")}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-[#156372] text-white rounded-md font-medium hover:bg-[#11525e] flex items-center gap-2"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

