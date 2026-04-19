/**
 * Export utilities for Accountant features
 */

/**
 * Format date for export
 */
const formatDateForExport = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
        const date = new Date(String(dateString));
        if (isNaN(date.getTime())) return String(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch (e) {
        return String(dateString);
    }
};

/**
 * Escape CSV field (handles commas, quotes, and newlines)
 */
const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data: any[], filename: string, headers: { key: string, label: string }[]): void => {
    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Build CSV content
    let csvContent = headers.map(h => escapeCSVField(h.label)).join(",") + "\n";

    data.forEach((item: any) => {
        const row = headers.map(h => {
            const val = item[h.key];
            if (h.key.toLowerCase().includes('date')) return formatDateForExport(val);
            return val;
        });
        csvContent += row.map(escapeCSVField).join(",") + "\n";
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Export data to Excel (HTML table approach)
 */
export const exportToExcel = (data: any[], filename: string, headers: { key: string, label: string }[], sheetName: string): void => {
    let htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${sheetName}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #156372; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

    data.forEach((item: any) => {
        htmlContent += `
      <tr>
        ${headers.map(h => {
            let val = item[h.key];
            if (h.key.toLowerCase().includes('date')) val = formatDateForExport(val);
            const displayVal = String(val || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<td>${displayVal}</td>`;
        }).join('')}
      </tr>
    `;
    });

    htmlContent += `
        </tbody>
      </table>
    </body>
    </html>
  `;

    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
