import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, HelpCircle, Download as DownloadIcon, ChevronRight, Search } from "lucide-react";

export default function ImportAppliedVendorCredits() {
  const navigate = useNavigate();
  const [currentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isDragging, setIsDragging] = useState(false);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const fileInputRef = useRef(null);
  const encodingDropdownRef = useRef(null);

  const encodings = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
  ];

  // Close encoding dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      }
    };

    if (isEncodingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (25 MB)
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25 MB limit.");
        return;
      }
      // Validate file type
      const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25 MB limit.");
        return;
      }
      const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleNext = () => {
    if (selectedFile && currentStep < 3) {
      // Navigate to next step (Map Fields)
      // For now, just alert
      alert("Next step: Map Fields (to be implemented)");
    }
  };

  const filteredEncodings = encodings.filter(encoding =>
    encoding.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 m-0">
            Applied Vendor Credits - Select File
          </h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 1 ? "text-white bg-[#156372]" : "text-gray-500"}`}>
              1 Configure
            </span>
            <ChevronRight size={16} className="text-gray-500" />
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 2 ? "text-white bg-[#156372]" : "text-gray-500"}`}>
              2 Map Fields
            </span>
            <ChevronRight size={16} className="text-gray-500" />
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 3 ? "text-white bg-[#156372]" : "text-gray-500"}`}>
              3 Preview
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/purchases/vendor-credits")}
          className="p-2 bg-transparent border-none cursor-pointer flex items-center justify-center"
        >
          <X size={20} className="text-red-600" strokeWidth={2} />
        </button>
      </div>

      {/* Content */}
      <div className="p-8 overflow-y-auto flex-1 max-w-2xl mx-auto w-full">
        {/* File Upload Section */}
        <div className="mb-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragging ? "border-[#156372] bg-teal-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <DownloadIcon size={48} className="text-gray-500 mx-auto mb-4" />
            <div className="text-base font-medium text-gray-900 mb-2">
              Drag and drop file to import
            </div>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer inline-flex items-center gap-1.5 mt-4"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose File
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-1">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="mt-3 text-xs text-gray-500">
              Maximum File Size: 25 MB • File Format: CSV or TSV or XLS
            </div>
            {selectedFile && (
              <div className="mt-4 p-3 bg-teal-50 rounded-md text-sm text-gray-900">
                Selected: {selectedFile.name}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Sample File Link */}
        <div className="mb-8 text-sm text-gray-900">
          Download a{" "}
          <a
            href="#"
            className="text-teal-700 no-underline hover:underline"
            onClick={(e) => {
              e.preventDefault();
              // Handle sample csv file download
            }}
          >
            sample csv file
          </a>{" "}
          or{" "}
          <a
            href="#"
            className="text-teal-700 no-underline hover:underline"
            onClick={(e) => {
              e.preventDefault();
              // Handle sample xls file download
            }}
          >
            sample xls file
          </a>{" "}
          and compare it to your import file to ensure you have the file perfect for the import.
        </div>

        {/* Character Encoding */}
        <div className="mb-8">
          <label className="flex items-center gap-1.5 mb-3 text-sm font-medium text-gray-900">
            Character Encoding
            <HelpCircle size={16} className="text-gray-500" />
          </label>
          <div
            ref={encodingDropdownRef}
            className="relative max-w-[300px]"
            style={{ zIndex: isEncodingDropdownOpen ? 2000 : "auto" }}
          >
            <div
              onClick={() => {
                setIsEncodingDropdownOpen(!isEncodingDropdownOpen);
                if (!isEncodingDropdownOpen) {
                  setEncodingSearch("");
                }
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-white cursor-pointer flex items-center justify-between"
              style={{
                borderColor: isEncodingDropdownOpen ? "#156372" : "#e5e7eb",
                borderWidth: isEncodingDropdownOpen ? "2px" : "1px",
                boxShadow: isEncodingDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none"
              }}
            >
              <span>{characterEncoding}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{
                  transform: isEncodingDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}
              >
                <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {isEncodingDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ zIndex: 2000 }}
              >
                {/* Search Bar */}
                <div className="p-2.5 border-b border-gray-200 bg-gray-50">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
                      style={{ pointerEvents: "none" }}
                    />
                    <input
                      type="text"
                      placeholder="Q Search"
                      value={encodingSearch}
                      onChange={(e) => setEncodingSearch(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white"
                      onFocus={(e) => e.target.style.borderColor = "#156372"}
                      onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="overflow-y-auto max-h-[240px] bg-white">
                  {filteredEncodings.map((encoding) => (
                    <div
                      key={encoding}
                      onClick={() => {
                        setCharacterEncoding(encoding);
                        setIsEncodingDropdownOpen(false);
                        setEncodingSearch("");
                      }}
                      className="px-3.5 py-2.5 cursor-pointer text-sm transition-all flex items-center justify-between"
                      style={{
                        backgroundColor: characterEncoding === encoding ? "#156372" : "transparent",
                        color: characterEncoding === encoding ? "white" : "#111827",
                        borderLeft: characterEncoding === encoding ? "3px solid #0D4A52" : "3px solid transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (characterEncoding !== encoding) {
                          e.target.style.backgroundColor = "#f3f4f6";
                          e.target.style.borderLeftColor = "#e5e7eb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (characterEncoding !== encoding) {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.borderLeftColor = "transparent";
                        }
                      }}
                    >
                      <span>{encoding}</span>
                      {characterEncoding === encoding && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.5 4.5l-7 7-3.5-3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Tips */}
        <div className="mb-8 p-4 bg-yellow-50 rounded-md border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <span className="text-sm font-medium text-gray-900">Page Tips</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>
              You can download the <a href="#" className="text-teal-700 underline">sample xls file</a> to get detailed information about the data fields used while importing.
            </li>
            <li>
              If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
            </li>
            <li>
              You can configure your import settings and save them for future too!
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={handleNext}
            disabled={!selectedFile}
            className={`px-5 py-2.5 text-sm font-medium text-white border-none rounded-md ${
              selectedFile ? "bg-[#156372] cursor-pointer hover:bg-[#0D4A52]" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Next &gt;
          </button>
          <button
            onClick={() => navigate("/purchases/vendor-credits")}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}









