const parseCSVLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const parseCSV = (csvText: string): { headers: string[]; rows: Record<string, string>[] } => {
  const normalizedText = String(csvText || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = normalizedText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? "\t" : ",";
  const headers = parseCSVLine(lines[0], delimiter).filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header, idx) => {
      const value = String(values[idx] ?? "").trim();
      row[header] = value;
      if (value) hasValue = true;
    });

    if (hasValue) {
      rows.push(row);
    }
  }

  return { headers, rows };
};

const parseSpreadsheetFile = async (
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
  const XLSX = await import("xlsx");
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => resolve(event.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
  if (!Array.isArray(matrix) || matrix.length === 0) return { headers: [], rows: [] };

  const headers = (matrix[0] || []).map((header) => String(header ?? "").trim()).filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const rowArray = matrix[i] || [];
    if (!Array.isArray(rowArray)) continue;
    if (rowArray.every((cell) => String(cell ?? "").trim() === "")) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = String(rowArray[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
};

export const parseImportFile = async (
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
  const extension = String(file.name.split(".").pop() || "").toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    return parseSpreadsheetFile(file);
  }

  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => resolve(String(event.target?.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });

  return parseCSV(content);
};
