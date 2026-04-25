import { IMPORT_FIELDS, SAMPLE_HEADERS, SAMPLE_ROWS, VALID_FILE_EXTENSIONS, MAX_IMPORT_FILE_SIZE_BYTES } from "./constants";
import type { CsvRow, FieldMappings } from "./types";

export const normalizeLookupValue = (value: unknown) => String(value || "").trim().toLowerCase();

export const extractApiArray = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.accounts)) return response.data.accounts;
  return [];
};

export const getFileExtension = (fileName: string) =>
  `.${String(fileName.split(".").pop() || "").toLowerCase()}`;

export const validateImportFile = (file: File) => {
  const extension = getFileExtension(file.name);

  if (!VALID_FILE_EXTENSIONS.includes(extension)) {
    return "Please select a valid file format (CSV, TSV, XLS, or XLSX).";
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return "File size must be less than 25 MB.";
  }

  return null;
};

export const shouldSkipAutoMap = (field: string, lowerHeader: string) => {
  if (
    field === "Selling Price" &&
    (lowerHeader.includes("purchase") || lowerHeader.includes("cost") || lowerHeader.includes("expense"))
  ) {
    return true;
  }

  if (
    field === "Purchase Price" &&
    (lowerHeader.includes("selling") || lowerHeader.includes("sales") || lowerHeader.includes("revenue") || lowerHeader.includes("income"))
  ) {
    return true;
  }

  if ((field === "Selling Price" || field === "Purchase Price") && lowerHeader.includes("description")) {
    return true;
  }

  return false;
};

export const buildAutoMappingsFromHeaders = (headers: string[]) => {
  const mappings: FieldMappings = {};

  IMPORT_FIELDS.forEach(({ field, variations }) => {
    const matchingHeader = headers.find((header) => {
      const lowerHeader = header.toLowerCase();
      if (shouldSkipAutoMap(field, lowerHeader)) {
        return false;
      }

      return variations.some((variation) => lowerHeader.includes(variation));
    });

    if (matchingHeader) {
      mappings[field] = matchingHeader;
    }
  });

  return mappings;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const downloadBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadSampleFile = (format: "csv" | "xls") => {
  if (format === "csv") {
    const csvContent = [
      SAMPLE_HEADERS.join(","),
      ...SAMPLE_ROWS.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), "item_sample_import.csv");
    return;
  }

  const headerMarkup = SAMPLE_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowsMarkup = SAMPLE_ROWS.map(
    (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`,
  ).join("");

  const xlsContent =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
    "<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Items</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>" +
    `<body><table><tr>${headerMarkup}</tr>${rowsMarkup}</table></body></html>`;

  downloadBlob(new Blob([xlsContent], { type: "application/vnd.ms-excel" }), "item_sample_import.xls");
};

export const mapFieldValue = (row: CsvRow, mappedField: string) => {
  if (!mappedField) return "";
  if (row[mappedField] !== undefined && row[mappedField] !== null && row[mappedField] !== "") {
    return String(row[mappedField]).trim();
  }

  const lowerMapped = mappedField.toLowerCase();
  for (const key in row) {
    if (key.toLowerCase() === lowerMapped) {
      return String(row[key]).trim();
    }
  }

  return "";
};

export const getMappedValue = (
  row: CsvRow,
  fieldName: string,
  fieldMappings: FieldMappings,
  importedFileHeaders: string[],
) => {
  const mappedField = fieldMappings[fieldName];
  if (mappedField) {
    return mapFieldValue(row, mappedField);
  }

  const lowerField = fieldName.toLowerCase();
  for (const header of importedFileHeaders) {
    if (header.toLowerCase() === lowerField) {
      const value = String(row[header] || "").trim();
      if (value) {
        return value;
      }
    }
  }

  return "";
};
