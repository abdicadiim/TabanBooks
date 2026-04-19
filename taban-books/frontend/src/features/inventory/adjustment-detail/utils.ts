import type { Adjustment, Attachment, Comment, Item, JournalLine } from "./types";

export const DEFAULT_BASE_CURRENCY = "USD";
export const DEFAULT_ITEM_UNIT = "pcs";
export const DEFAULT_DISPLAY_COST = 60;
export const DEFAULT_ADJUSTMENT_ACCOUNT = "Cost of Goods Sold";
export const DEFAULT_INVENTORY_ACCOUNT = "Inventory Asset";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const getRecordText = (value: Record<string, unknown>, key: "name" | "displayName" | "label") => {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : undefined;
};

const firstFiniteNumber = (values: unknown[], fallback = 0) => {
  for (const value of values) {
    const parsed = Number.parseFloat(String(value ?? ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) {
    return "";
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
  } catch {
    return String(value);
  }
};

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return "";
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date);
  } catch {
    return String(value);
  }
};

export const renderSafeValue = (value: unknown, defaultValue = "") => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      getRecordText(record, "name") ??
      getRecordText(record, "displayName") ??
      getRecordText(record, "label") ??
      defaultValue
    );
  }

  return String(value);
};

export const getAdjustmentId = (adjustment?: Adjustment | null) => {
  const rawId = adjustment?._id ?? adjustment?.id;
  return rawId ? String(rawId) : undefined;
};

export const getAdjustmentReference = (adjustment?: Adjustment | null) =>
  adjustment?.adjustmentNumber || adjustment?.referenceNumber || "N/A";

export const getItemRows = (adjustment?: Adjustment | null) => adjustment?.items || adjustment?.itemRows || [];

export const getItemRate = (item: Item, fallback = 0) =>
  firstFiniteNumber([item.costPrice, item.cost, item.rate], fallback);

export const getItemDisplay = (item: Item, rateFallback = DEFAULT_DISPLAY_COST) => {
  const selectedItem = item.item || item.selectedItem || {};
  const quantityAdjusted = toNumber(item.quantityAdjusted);
  const rate = getItemRate(item, rateFallback);

  return {
    selectedItem,
    itemName:
      item.itemName ||
      item.item?.name ||
      item.selectedItem?.name ||
      item.itemDetails ||
      "N/A",
    itemSku: item.itemSku || item.item?.sku || item.selectedItem?.sku || "",
    itemUnit: selectedItem.unit || item.unit || DEFAULT_ITEM_UNIT,
    quantityAdjusted,
    rate,
    totalValue: Math.abs(quantityAdjusted * rate),
  };
};

export const resolveJournalLines = (adjustment: Adjustment | null | undefined, itemRows: Item[]) => {
  if (adjustment?.journalEntry?.lines?.length) {
    return adjustment.journalEntry.lines;
  }

  let totalIncreaseAmount = 0;
  let totalDecreaseAmount = 0;

  itemRows.forEach((item) => {
    const quantity = toNumber(item.quantityAdjusted);
    const rate = getItemRate(item);
    const amount = Math.abs(quantity * rate);

    if (quantity > 0) {
      totalIncreaseAmount += amount;
    } else if (quantity < 0) {
      totalDecreaseAmount += amount;
    }
  });

  const inventoryAccount = renderSafeValue(
    adjustment?.inventoryAccount ||
      itemRows[0]?.item?.inventoryAccount ||
      itemRows[0]?.selectedItem?.inventoryAccount,
    DEFAULT_INVENTORY_ACCOUNT,
  );
  const adjustmentAccount = renderSafeValue(
    adjustment?.account || adjustment?.adjustmentAccount,
    DEFAULT_ADJUSTMENT_ACCOUNT,
  );

  const journalLines: JournalLine[] = [];

  if (totalIncreaseAmount > 0) {
    journalLines.push({
      accountName: inventoryAccount,
      account: inventoryAccount,
      debit: totalIncreaseAmount,
      credit: 0,
      description: `Inventory increase: ${itemRows.filter((item) => toNumber(item.quantityAdjusted) > 0).length} item(s) x rate`,
    });
    journalLines.push({
      accountName: adjustmentAccount,
      account: adjustmentAccount,
      debit: 0,
      credit: totalIncreaseAmount,
      description: "Inventory increase offset",
    });
  }

  if (totalDecreaseAmount > 0) {
    journalLines.push({
      accountName: adjustmentAccount,
      account: adjustmentAccount,
      debit: totalDecreaseAmount,
      credit: 0,
      description: `Inventory decrease: ${itemRows.filter((item) => toNumber(item.quantityAdjusted) < 0).length} item(s) x rate`,
    });
    journalLines.push({
      accountName: inventoryAccount,
      account: inventoryAccount,
      debit: 0,
      credit: totalDecreaseAmount,
      description: "Inventory decrease offset",
    });
  }

  if (totalIncreaseAmount > 0 && totalDecreaseAmount > 0) {
    const netAmount = totalIncreaseAmount - totalDecreaseAmount;
    journalLines.length = 0;

    if (netAmount > 0) {
      journalLines.push({
        accountName: inventoryAccount,
        account: inventoryAccount,
        debit: netAmount,
        credit: 0,
      });
      journalLines.push({
        accountName: adjustmentAccount,
        account: adjustmentAccount,
        debit: 0,
        credit: netAmount,
      });
    } else if (netAmount < 0) {
      journalLines.push({
        accountName: adjustmentAccount,
        account: adjustmentAccount,
        debit: Math.abs(netAmount),
        credit: 0,
      });
      journalLines.push({
        accountName: inventoryAccount,
        account: inventoryAccount,
        debit: 0,
        credit: Math.abs(netAmount),
      });
    }
  }

  return journalLines.length > 0 ? journalLines : null;
};

export const calculateJournalTotals = (journalLines: JournalLine[] | null | undefined) =>
  (journalLines || []).reduce(
    (totals, line) => ({
      debit: totals.debit + toNumber(line.debit),
      credit: totals.credit + toNumber(line.credit),
    }),
    { debit: 0, credit: 0 },
  );

export const normalizeComments = (comments?: Adjustment["comments"]) =>
  (comments || []).reduce<Comment[]>((list, comment, index) => {
    if (!comment) {
      return list;
    }

    list.push({
      ...comment,
      id: comment._id || comment.id || `comment_${index}`,
      author: comment.author || "System",
      timestamp: comment.timestamp || new Date().toISOString(),
      text: comment.text || "",
    });

    return list;
  }, []);

export const normalizeAttachments = (attachments?: Adjustment["attachments"]) =>
  (attachments || []).reduce<Attachment[]>((list, attachment, index) => {
    if (!attachment) {
      return list;
    }

    if (typeof attachment === "string") {
      list.push({
        id: `attachment_${index}`,
        name: `attachment_${index + 1}`,
        size: "Unknown",
        type: attachment.startsWith("data:") ? attachment.split(";")[0].split(":")[1] : "application/octet-stream",
        preview: attachment,
      });
      return list;
    }

    list.push({
      ...attachment,
      id: attachment._id || attachment.id || `attachment_${index}`,
      name: attachment.name || `attachment_${index + 1}`,
      size: attachment.size || "Unknown",
      type: attachment.type || "application/octet-stream",
    });

    return list;
  }, []);

export const getAttachmentSource = (attachment: Attachment) => {
  if (typeof attachment.preview === "string" && attachment.preview) {
    return attachment.preview;
  }

  if (typeof attachment.file === "string" && attachment.file) {
    return attachment.file;
  }

  return null;
};

export const isImageAttachment = (attachment: Attachment) =>
  attachment.type.startsWith("image/") || getAttachmentSource(attachment)?.startsWith("data:image/") || false;

export const toAttachmentPayload = (attachments: Attachment[]) =>
  attachments
    .map((attachment) => ({
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      preview: getAttachmentSource(attachment) || "",
    }))
    .filter((attachment) => attachment.preview);

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const triggerDownload = (source: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = source;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
