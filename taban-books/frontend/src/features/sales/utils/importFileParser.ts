import * as XLSX from "xlsx";

type ParsedImportRow = Record<string, string>;

export type ParsedImportFile = {
  headers: string[];
  rows: ParsedImportRow[];
};

const parseDelimitedText = (text: string): ParsedImportFile => {
  if (text.includes("<table") || text.includes("<TABLE")) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const table = doc.querySelector("table");
      if (table) {
        const htmlRows = Array.from(table.querySelectorAll("tr"));
        if (htmlRows.length > 0) {
          const headers = Array.from(htmlRows[0].querySelectorAll("th,td"))
            .map((cell) => String(cell.textContent || "").trim())
            .filter(Boolean);
          const rows: ParsedImportRow[] = [];
          htmlRows.slice(1).forEach((rowEl) => {
            const cells = Array.from(rowEl.querySelectorAll("td"));
            if (cells.length === 0) return;
            const row: ParsedImportRow = {};
            headers.forEach((header, idx) => {
              row[header] = String(cells[idx]?.textContent || "").trim();
            });
            rows.push(row);
          });
          return { headers, rows };
        }
      }
    } catch (error) {
      console.error("Failed to parse HTML table import file:", error);
    }
  }

  const normalizedText = String(text || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = normalizedText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0] || "";
  const delimiter = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? "\t" : ",";

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (!values.some((value) => value)) continue;

    const row: ParsedImportRow = {};
    headers.forEach((header, index) => {
      row[header] = String(values[index] || "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
};

const parseSpreadsheetFile = async (file: File): Promise<ParsedImportFile> => {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
  if (!Array.isArray(matrix) || matrix.length === 0) return { headers: [], rows: [] };

  const headers = (matrix[0] || []).map((h) => String(h ?? "").trim()).filter(Boolean);
  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const rowArray = matrix[i] || [];
    if (!Array.isArray(rowArray)) continue;
    if (rowArray.every((cell) => String(cell ?? "").trim() === "")) continue;

    const row: ParsedImportRow = {};
    headers.forEach((header, idx) => {
      row[header] = String(rowArray[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
};

export const parseImportFile = async (file: File): Promise<ParsedImportFile> => {
  const extension = String(file.name.split(".").pop() || "").toLowerCase();
  if (extension === "xlsx" || extension === "xls") {
    return parseSpreadsheetFile(file);
  }

  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(String(ev.target?.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });

  return parseDelimitedText(content);
};
