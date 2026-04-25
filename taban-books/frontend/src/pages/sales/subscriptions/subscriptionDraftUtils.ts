type AnyRecord = Record<string, any>;

const pickFirst = (source: AnyRecord, keys: string[], fallback: any = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const toArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const normalizeItems = (quote: AnyRecord) => {
  const rawItems = toArray(
    pickFirst(quote, ["items", "lineItems", "quoteItems", "subscriptionItems"], []),
  );

  return rawItems.map((item: AnyRecord, index: number) => ({
    id: item?.id ?? item?._id ?? `item-${index + 1}`,
    name: pickFirst(item, ["name", "itemName", "description", "itemDetails"], ""),
    description: pickFirst(item, ["description", "details", "itemDetails"], ""),
    quantity: Number(pickFirst(item, ["quantity", "qty"], 1)) || 1,
    rate: Number(pickFirst(item, ["rate", "price", "amount"], 0)) || 0,
    amount: Number(pickFirst(item, ["amount", "total"], 0)) || 0,
    tax: pickFirst(item, ["tax", "taxName", "salesTax"], ""),
    account: pickFirst(item, ["account", "expenseAccount", "incomeAccount"], ""),
    ...(item && typeof item === "object" ? item : {}),
  }));
};

export const buildSubscriptionDraftFromQuote = (quote: AnyRecord = {}) => {
  const customerId = pickFirst(quote, ["customerId", "customer", "customer_id"], "");
  const customerName = pickFirst(quote, ["customerName", "customer_name", "name"], "");
  const subscriptionNumber = pickFirst(quote, ["subscriptionNumber", "subscriptionNo", "number"], "");

  return {
    sourceQuoteId: pickFirst(quote, ["id", "_id", "quoteId"], ""),
    sourceQuoteNumber: pickFirst(quote, ["quoteNumber", "quoteNo", "referenceNumber"], ""),
    subscriptionNumber,
    customerId,
    customerName,
    customer: customerId || customerName
      ? {
          id: customerId,
          name: customerName,
        }
      : undefined,
    status: "draft",
    plan: pickFirst(quote, ["plan", "subscriptionPlan", "billingPlan"], "custom"),
    billingCycle: pickFirst(quote, ["billingCycle", "interval", "frequency"], "monthly"),
    startDate: pickFirst(quote, ["startDate", "date", "quoteDate"], ""),
    endDate: pickFirst(quote, ["endDate", "expiryDate", "validUntil"], ""),
    notes: pickFirst(quote, ["notes", "description", "memo"], ""),
    termsAndConditions: pickFirst(quote, ["termsAndConditions", "terms", "termsData"], ""),
    currency: pickFirst(quote, ["currency", "currencyCode"], ""),
    location: pickFirst(quote, ["selectedLocation", "location", "locationName"], ""),
    salesperson: pickFirst(quote, ["salesperson", "salespersonName"], ""),
    items: normalizeItems(quote),
    quote,
  };
};

export const buildSubscriptionEditDraft = (draft: AnyRecord = {}) => ({
  ...draft,
  status: String(draft?.status || "draft").toLowerCase(),
  items: Array.isArray(draft?.items) ? draft.items : [],
  metadata: {
    ...(draft?.metadata || {}),
    source: "quote",
    createdFromQuote: true,
  },
});
