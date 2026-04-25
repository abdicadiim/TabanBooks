const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const parseDisplayDate = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date();

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(raw.replace(/(\d{2}) ([A-Za-z]{3}) (\d{4})/, "$1 $2, $3"));
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

export const computeDueDateFromTerm = (
  invoiceDateValue: any,
  termValue: string,
  termsList: Array<{ value?: string; label?: string; days?: number | string }>
) => {
  const invoiceDate = parseDisplayDate(invoiceDateValue);
  const selectedTerm = termsList.find((term) => term.value === termValue) || termsList[0];
  if (!selectedTerm) return formatDate(invoiceDate);

  const label = String(selectedTerm.label || "").toLowerCase();
  const termDays = Number(selectedTerm.days);
  let dueDate = new Date(invoiceDate);

  if (label.includes("due end of next month")) {
    dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 2, 0);
  } else if (label.includes("due end of the month")) {
    dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0);
  } else if (label.includes("due on receipt")) {
    dueDate = new Date(invoiceDate);
  } else if (!Number.isNaN(termDays) && termDays >= 0) {
    dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + termDays);
  }

  return formatDate(dueDate);
};
