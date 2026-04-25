import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, HelpCircle, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";

export default function ImportValueAdjustments() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const encodingDropdownRef = useRef(null);
  const dropAreaRef = useRef(null);

  const encodingOptions = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
    "Shift_JIS (Japanese)"
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
        setIsEncodingDropdownOpen(false);
      }
    };

    if (isEncodingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      const maxSize = 25 * 1024 * 1024; // 25MB

      if (!validTypes.includes(fileExtension)) {
        toast.error("Please select a valid file format (CSV, TSV, or XLS).");
        event.target.value = "";
        setSelectedFile(null);
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size must be less than 25 MB.");
        event.target.value = "";
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      // Don't auto-navigate, let user click Next button
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDownloadSample = () => {
    // Sample CSV content for Value Adjustments
    const sampleHeaders = [
      "Date",
      "Reference Number",
      "Reason",
      "Item Name",
      "Account",
      "Description",
      "Status",
      "Value Adjusted",
      "Cost Price",
      "SKU",
      "Item Description",
      "Unit"
    ];

    const sampleRows = [
      [
        "2026-01-08",
        "REF-001",
        "Damaged goods",
        "Sample Item 1",
        "Inventory Account",
        "Sample description",
        "DRAFT",
        "255.00",
        "25.50",
        "SKU-001",
        "Item description",
        "pcs"
      ],
      [
        "2026-01-08",
        "REF-002",
        "Stock on fire",
        "Sample Item 2",
        "Inventory Account",
        "",
        "DRAFT",
        "-150.00",
        "30.00",
        "SKU-002",
        "",
        "pcs"
      ]
    ];

    const csvContent = [
      sampleHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create Excel-compatible file with .xls extension
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const excelContent = BOM + csvContent;
    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "value_adjustment_sample.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Sample file downloaded successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Value Adjustment - Select File</h1>
          <button
            onClick={() => navigate("/inventory")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center font-semibold">1</div>
            <span className="font-semibold text-[#156372]">Configure</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-semibold">2</div>
            <span className="text-gray-600">Map Fields</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-semibold">3</div>
            <span className="text-gray-600">Preview</span>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          ref={dropAreaRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6 cursor-pointer hover:border-[#156372] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Download size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 mb-4">Drag and drop file to import</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative inline-block">
            <button className="px-6 py-2 bg-[#156372] text-white rounded-md font-medium hover:bg-[#11525e]">
              Choose File
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">Maximum File Size: 25 MB</p>
          <p className="text-sm text-gray-500">File Format: CSV or TSV or XLS</p>
        </div>

        {selectedFile && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-6">
          Download a{" "}
          <button
            onClick={handleDownloadSample}
            className="text-[#156372] hover:underline font-semibold cursor-pointer"
          >
            sample file
          </button>{" "}
          and compare it to your import file to ensure you have the file perfect for the import.
        </p>

        {/* Character Encoding */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">Character Encoding</label>
            <HelpCircle size={16} className="text-gray-400" />
          </div>
          <div className="relative" ref={encodingDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEncodingDropdownOpen(!isEncodingDropdownOpen);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400"
            >
              <span>{characterEncoding}</span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
            {isEncodingDropdownOpen && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {encodingOptions.map((encoding) => (
                  <div
                    key={encoding}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCharacterEncoding(encoding);
                      setIsEncodingDropdownOpen(false);
                    }}
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${characterEncoding === encoding ? "bg-[#156372]/10 text-[#156372]" : ""
                      }`}
                  >
                    {encoding}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Page Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb size={20} className="text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Page Tips</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.</li>
                <li>You can configure your import settings and save them for future too!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate("/inventory")}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedFile) {
                navigate(`/inventory/import/value/map-fields`, { state: { file: selectedFile, characterEncoding, type: 'Value' } });
              } else {
                toast.error("Please select a file first");
              }
            }}
            className="px-6 py-2 bg-[#156372] text-white rounded-md font-medium hover:bg-[#11525e]"
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

