import { PURCHASE_ORDER_BULK_UPDATE_FIELD_MAP } from "./PurchaseOrders.constants";

const normalizeValue = (value: unknown) => String(value ?? "").trim().toUpperCase();

export const formatPurchaseOrderDate = (dateString: any) => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
};

export const getPurchaseOrdersDisplayText = (selectedView: string) =>
  selectedView === "All" ? "All Purchase Orders" : selectedView;

export const filterPurchaseOrdersByView = (orders: any[], selectedView: string) => {
  switch (selectedView) {
    case "Draft":
      return orders.filter((order) => normalizeValue(order.status) === "DRAFT");
    case "Pending Approval":
      return orders.filter((order) => normalizeValue(order.status) === "PENDING_APPROVAL");
    case "Approved":
      return orders.filter((order) => normalizeValue(order.status) === "APPROVED");
    case "Issued":
      return orders.filter((order) => normalizeValue(order.status) === "ISSUED");
    case "Billed":
      return orders.filter((order) => normalizeValue(order.billedStatus) === "BILLED");
    case "Partially Billed":
      return orders.filter((order) => normalizeValue(order.billedStatus) === "PARTIALLY_BILLED");
    case "Closed":
      return orders.filter((order) => normalizeValue(order.status) === "CLOSED");
    case "Canceled":
      return orders.filter((order) => {
        const status = normalizeValue(order.status);
        return status === "CANCELED" || status === "CANCELLED";
      });
    default:
      return orders;
  }
};

const getSortValue = (order: any, field: string) => {
  switch (field) {
    case "amount":
      return Number.parseFloat(order.amount ?? order.total ?? 0) || 0;
    case "deliveryDate":
      return new Date(order.deliveryDate || order.expectedDate || 0).getTime();
    case "date":
    case "createdTime":
    case "lastModifiedTime":
      return new Date(order[field] || order.date || 0).getTime();
    default:
      return (order[field] || "").toString().toLowerCase();
  }
};

export const sortPurchaseOrders = (orders: any[], field: string, direction: string) =>
  [...orders].sort((a, b) => {
    const valueA = getSortValue(a, field);
    const valueB = getSortValue(b, field);

    if (valueA === valueB) {
      return 0;
    }

    if (direction === "asc") {
      return valueA > valueB ? 1 : -1;
    }

    return valueA < valueB ? 1 : -1;
  });

export const buildPurchaseOrderBulkUpdatePayload = (selectedField: string, fieldValue: string) => {
  const targetField = PURCHASE_ORDER_BULK_UPDATE_FIELD_MAP[selectedField] || selectedField;
  const normalizedValue =
    targetField === "date" || targetField === "expectedDate"
      ? new Date(fieldValue).toISOString()
      : fieldValue;

  return {
    [targetField]: normalizedValue,
  };
};

export const isDraftPurchaseOrder = (status: string) => normalizeValue(status) === "DRAFT";
