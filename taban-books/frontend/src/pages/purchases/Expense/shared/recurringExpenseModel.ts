export const REPEAT_EVERY_OPTIONS = [
  "Week",
  "2 Weeks",
  "Month",
  "2 Months",
  "3 Months",
  "6 Months",
  "Year",
  "2 Years",
  "3 Years",
  "Custom",
];

export const CUSTOM_REPEAT_UNITS = ["Day(s)", "Week(s)", "Month(s)", "Year(s)"];

export const CATEGORY_OPTIONS = [
  "Advertising And Marketing",
  "Automobile Expense",
  "Consultant Expense",
  "Credit Card Charges",
  "Depreciation Expense",
  "IT and Internet Expenses",
  "Janitorial Expense",
  "Lodging",
  "Meals and Entertainment",
  "Office Supplies",
  "Postage",
  "Printing and Stationery",
  "Purchase Discounts",
  "Rent Expense",
  "Repairs and Maintenance",
  "Salaries and Employee Wages",
  "Telephone Expense",
  "Travel Expense",
  "Goods In Transit",
  "Prepaid Expenses",
];

export const buildRecurringExpensePayload = ({
  formData,
  reportingTagDefinitions,
  reportingTagValues,
}: {
  formData: any;
  reportingTagDefinitions: any[];
  reportingTagValues: Record<string, string>;
}) => {
  const isProbablyObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

  const optionalId = (value: any) => {
    const normalized = String(value || "").trim();
    return normalized || undefined;
  };

  const optionalObjectId = (value: any) => {
    const normalized = optionalId(value);
    if (!normalized) return undefined;
    return isProbablyObjectId(normalized) ? normalized : undefined;
  };

  const resolvedProfileName =
    String(formData.profileName || "").trim() ||
    `${formData.expenseAccount || "Recurring Expense"} - ${formData.startDate}`;

  const repeatEveryValue =
    formData.repeatEvery === "Custom"
      ? `${Math.max(1, Number(formData.customRepeatValue) || 1)} ${formData.customRepeatUnit}`
      : formData.repeatEvery;

  return {
    profile_name: resolvedProfileName,
    repeat_every: repeatEveryValue,
    start_date: formData.startDate,
    end_date: formData.neverExpires ? null : formData.endsOn,
    account_id: optionalObjectId(formData.expenseAccountId) || null,
    account_name: formData.expenseAccount,
    amount: parseFloat(formData.amount),
    currency_code: formData.currency,
    currency_id: optionalObjectId(formData.currencyId),
    paid_through_account_id: optionalObjectId(formData.paidThroughId),
    paid_through_account_name: formData.paidThrough || undefined,
    vendor_id: optionalObjectId(formData.vendor_id),
    vendor_name: formData.vendor || undefined,
    description: formData.description || undefined,
    customer_id: optionalObjectId(formData.customer_id),
    customer_name: formData.customerName || undefined,
    is_billable: Boolean(formData.isBillable && formData.customer_id),
    project_id: optionalObjectId(formData.project_id),
    project_name: formData.projectName || undefined,
    status: "active",
    never_expire: formData.neverExpires,
    tax_id: optionalObjectId(formData.tax || formData.taxId),
    location: formData.location,
    location_id: optionalObjectId(formData.locationId),
    reporting_tags: reportingTagDefinitions
      .slice(0, 2)
      .map((tag: any) => ({
        tagId: tag.tagId,
        name: tag.tagName,
        value: reportingTagValues[tag.tagId] === "None" ? "" : String(reportingTagValues[tag.tagId] || ""),
    })),
  };
};

export const computeRecurringExpenseTaxAmount = (amount: number | string, taxRate = 0, isInclusiveTax = false) => {
  const baseAmount = Number(amount || 0);
  const rate = Number(taxRate || 0) / 100;
  if (!Number.isFinite(baseAmount) || baseAmount <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return isInclusiveTax
    ? baseAmount - (baseAmount / (1 + rate))
    : baseAmount * rate;
};

export const computeRecurringExpenseDisplayAmount = (amount: number | string, taxRate = 0, isInclusiveTax = false) => {
  const baseAmount = Number(amount || 0);
  const rate = Number(taxRate || 0) / 100;
  if (!Number.isFinite(baseAmount) || baseAmount <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return baseAmount;
  }
  const taxAmount = computeRecurringExpenseTaxAmount(baseAmount, taxRate, isInclusiveTax);
  return isInclusiveTax
    ? baseAmount / (1 + rate)
    : baseAmount + taxAmount;
};
