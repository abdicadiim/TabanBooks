import { useMemo, useState } from "react";

export type TaxQuickCreateTarget = { type: "expense" } | { type: "itemized"; index: number };

export type TaxDropdownOption = {
  id: string;
  name: string;
  rate: number;
  isGroup: boolean;
  isCompound: boolean;
  isComponent: boolean;
  raw: any;
};

export type TaxDropdownGroup = {
  label: string;
  options: TaxDropdownOption[];
};

type UseTaxDropdownStyleOptions = {
  taxes?: any[];
  search?: string;
  selectedTaxId?: string;
};

export const getTaxId = (tax: any) =>
  String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || tax?.name || tax?.taxName || "").trim();

export const getTaxName = (tax: any) =>
  String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim();

export const getTaxDisplayName = (tax: any) =>
  getTaxName(tax)
    .replace(/\s*\(Compound tax\)\s*/ig, " ")
    .replace(/\s*\(Compound Tax\)\s*/ig, " ")
    .replace(/\s*\(Tax Group\)\s*/ig, " ")
    .replace(/\s*\(Tax group\)\s*/ig, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getTaxRate = (tax: any) => {
  const value = Number(tax?.rate ?? tax?.taxPercentage ?? tax?.percentage ?? tax?.tax_rate ?? 0);
  return Number.isFinite(value) ? value : 0;
};

export const isTaxActive = (tax: any) =>
  tax?.isActive !== false && tax?.is_active !== false && String(tax?.status || "").toLowerCase() !== "inactive";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const TAX_GROUP_MARKER = "__taban_tax_group__";

export const taxLabel = (tax: any) => {
  const name = getTaxDisplayName(tax);
  const rate = getTaxRate(tax);
  if (!name) return "";

  // Avoid duplicating percentages when the tax name already includes a percent (e.g. "VAT 20%").
  if (name.includes("%")) return name;

  const rateText = String(rate);
  const rateMatch = new RegExp(`\\b${escapeRegExp(rateText)}\\s*%\\b`, "i");
  if (rateMatch.test(name)) return name;

  return `${name} [${rate}%]`;
};

export const getTaxOptionLabel = (tax: any) => {
  return taxLabel(tax);
};

const toTaxOption = (tax: any): TaxDropdownOption | null => {
  const id = getTaxId(tax);
  const name = getTaxDisplayName(tax);
  if (!id || !name) return null;

  const rawName = getTaxName(tax);
  const typeValue = String(tax?.type || "").toLowerCase();
  const kindValue = String(tax?.kind || "").toLowerCase();
  const taxTypeValue = String(tax?.taxType || tax?.tax_type || "").toLowerCase();
  const descriptionValue = String(tax?.description || "").toLowerCase();
  
  const compoundNamePattern = /compound\s*tax/i;
  const taxGroupPattern = /tax\s*group/i;

  // Determine if it's a Tax Group
  const isGroup =
    String(tax?.description || "") === TAX_GROUP_MARKER ||
    tax?.isGroup === true ||
    tax?.is_group === true ||
    typeValue === "tax-group" ||
    kindValue === "tax-group" ||
    taxTypeValue === "tax-group" ||
    taxGroupPattern.test(rawName) ||
    (Array.isArray(tax?.groupTaxes) && tax.groupTaxes.length > 0) ||
    (Array.isArray(tax?.groupTaxIds) && tax.groupTaxIds.length > 0) ||
    (Array.isArray(tax?.group_taxes) && tax.group_taxes.length > 0) ||
    (Array.isArray(tax?.group_tax_ids) && tax.group_tax_ids.length > 0);

  // Determine if it's a Component/Compound Tax
  const isCompound =
    Boolean(tax?.isCompound || tax?.is_compound) ||
    compoundNamePattern.test(rawName) ||
    descriptionValue.includes("compound tax") ||
    typeValue.includes("compound") ||
    kindValue.includes("compound");

  const isComponent =
    Boolean(tax?.isComponent || tax?.is_component) ||
    typeValue === "component" ||
    kindValue === "component" ||
    taxTypeValue === "component" ||
    taxTypeValue === "child" ||
    taxTypeValue === "subtax" ||
    kindValue === "child" ||
    kindValue === "subtax";

  return {
    id,
    name,
    rate: getTaxRate(tax),
    isGroup,
    isCompound,
    isComponent,
    raw: tax,
  };
};

export const buildTaxOptionGroups = (taxes: any[] = []): TaxDropdownGroup[] => {
  const taxRows: TaxDropdownOption[] = [];
  const componentRows: TaxDropdownOption[] = [];
  const groupRows: TaxDropdownOption[] = [];

  (Array.isArray(taxes) ? taxes : []).filter(isTaxActive).forEach((tax) => {
    const option = toTaxOption(tax);
    if (!option) return;

    if (option.isGroup) {
      groupRows.push(option);
    } else if (option.isCompound || option.isComponent) {
      componentRows.push(option);
    } else {
      taxRows.push(option);
    }
  });

  return [
    { label: "Tax", options: taxRows },
    { label: "Component Tax", options: componentRows },
    { label: "Tax Group", options: groupRows },
  ].filter((group) => group.options.length > 0);
};

export const useTaxDropdownStyle = ({
  taxes = [],
  search = "",
  selectedTaxId = "",
}: UseTaxDropdownStyleOptions = {}) => {
  const activeTaxes = useMemo(
    () => (Array.isArray(taxes) ? taxes : []).filter(isTaxActive),
    [taxes]
  );

  const taxOptions = useMemo(
    () =>
      activeTaxes
        .map(toTaxOption)
        .filter(Boolean) as TaxDropdownOption[],
    [activeTaxes]
  );

  const taxOptionGroups = useMemo(() => buildTaxOptionGroups(activeTaxes), [activeTaxes]);

  const filteredTaxGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return taxOptionGroups;

    return taxOptionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((tax) =>
          `${tax.name} [${tax.rate}%]`.toLowerCase().includes(keyword)
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [search, taxOptionGroups]);

  const selectedTaxOption = useMemo(
    () => taxOptions.find((tax) => tax.id === String(selectedTaxId || "").trim()) || null,
    [selectedTaxId, taxOptions]
  );

  return {
    activeTaxes,
    taxOptions,
    taxOptionGroups,
    filteredTaxGroups,
    selectedTaxOption,
  };
};

export const useTaxQuickCreateState = () => {
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [newTaxTarget, setNewTaxTarget] = useState<TaxQuickCreateTarget | null>(null);

  const openNewTaxModal = (target: TaxQuickCreateTarget) => {
    setNewTaxTarget(target);
    setIsNewTaxModalOpen(true);
  };

  const closeNewTaxModal = () => {
    setIsNewTaxModalOpen(false);
    setNewTaxTarget(null);
  };

  return {
    isNewTaxModalOpen,
    setIsNewTaxModalOpen,
    newTaxTarget,
    setNewTaxTarget,
    openNewTaxModal,
    closeNewTaxModal,
  };
};

export const normalizeCreatedTaxPayload = (payload: any) => {
  const createdTax = payload?.tax || payload?.data || payload || {};
  const name = String(createdTax?.name || createdTax?.taxName || "").trim();
  const rateValue = Number(createdTax?.rate ?? createdTax?.taxPercentage ?? createdTax?.percentage ?? 0);

  return {
    raw: createdTax,
    name,
    rate: Number.isFinite(rateValue) ? rateValue : 0,
    isCompound: createdTax?.isCompound === true || createdTax?.is_compound === true,
    isActive: createdTax?.isActive !== false && createdTax?.is_active !== false,
  };
};

export default useTaxDropdownStyle;
