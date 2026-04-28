import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Eye, Plus, Settings, Star, X } from "lucide-react";
import { toast } from "react-toastify";
import { TEMPLATE_TYPES } from "./constants";
import TemplateEditorModal from "./components/TemplateEditorModal";

const STORE_KEY = "pdf_templates_store_v1";
const EXPORT_KEY = "pdf_template_export_name_v1";
const TYPE_ORDER = [
  "sales-orders",
  "sales-returns",
  "package-slips",
  "shipments",
  "invoices",
  "sales-receipts",
  "credit-notes",
  "purchase-orders",
  "purchase-receives",
  "retainer-invoices",
  "payment-receipts",
  "retainer-payment-receipts",
  "customer-statements",
  "bills",
  "vendor-credits",
  "vendor-payments",
  "vendor-statements",
  "quantity-adjustments",
  "value-adjustments",
  "item-barcodes",
];

const GALLERY = [
  { id: "std-1", name: "Standard", family: "standard", preview: "standard" },
  { id: "std-2", name: "Standard - Japanese Style", family: "standard", preview: "standard" },
  { id: "std-3", name: "Standard - European Style", family: "standard", preview: "standard" },
  { id: "ss-1", name: "Spreadsheet", family: "spreadsheet", preview: "spreadsheet" },
  { id: "ss-2", name: "Spreadsheet - Compact", family: "spreadsheet", preview: "spreadsheet" },
  { id: "pr-1", name: "Premium - Clean", family: "premium", preview: "standard" },
  { id: "un-1", name: "Universal - Basic", family: "universal", preview: "standard" },
  { id: "rt-1", name: "Retail - Compact", family: "retail", preview: "spreadsheet" },
];

const GALLERY_TABS = [
  { id: "all", label: "All", family: null },
  { id: "standard", label: "Standard", family: "standard" },
  { id: "spreadsheet", label: "Spreadsheet", family: "spreadsheet" },
  { id: "premium", label: "Premium", family: "premium" },
  { id: "universal", label: "Universal", family: "universal" },
  { id: "retail", label: "Retail", family: "retail" },
];

const LANGUAGES = ["English", "Japanese", "Arabic", "French", "Spanish", "German", "Chinese", "Hindi", "Somali"];
const deepClone = (v) => JSON.parse(JSON.stringify(v));
const nowIso = () => new Date().toISOString();

const moduleDefaults = (type) => {
  if (type === "sales-orders") return { showDeliveryMethod: true, deliveryMethodLabel: "Delivery Method" };
  if (type === "invoices") return { usePaymentStub: false, showStatusStamp: true, showOnlinePaymentLink: true };
  if (type === "purchase-orders") return { showShipmentPreference: true, shipmentPreferenceLabel: "Shipment Preference" };
  if (type === "payment-receipts") return { showPaymentRefund: true, showInvoiceDetails: true };
  if (type === "package-slips") return { showTrackingNumber: true, trackingNumberLabel: "Tracking Number" };
  return {};
};

const buildConfig = (type, label, name) => ({
  general: { templateName: name || "Standard Template", paperSize: "A4", pdfFont: "Helvetica", showOrganizationLogo: true, attentionContent: "", backgroundColor: "#ffffff" },
  headerFooter: { documentTitle: label || "Document", titleFontSize: 18, titleColor: "#0f172a", headerContent: "", applyFirstPageOnly: false, repeatHeader: true, labels: { numberField: { label: "Number Field", visible: true }, dateField: { label: "Date Field", visible: true }, dueDateField: { label: "Due Date", visible: true }, referenceField: { label: "Reference Field", visible: true }, billToField: { label: "Bill To", visible: true }, shipToField: { label: "Ship To", visible: true } } },
  transactionDetails: { fields: { item: { label: "Item", visible: true }, description: { label: "Description", visible: true }, quantity: { label: "Quantity", visible: true }, rate: { label: "Rate", visible: true }, taxPercent: { label: "Tax(%)", visible: true }, amount: { label: "Amount", visible: true } } },
  table: { labels: { subTotal: { label: "Sub Total", visible: true }, taxTotal: { label: "Tax Total", visible: true }, shippingCharges: { label: "Shipping Charges", visible: true }, total: { label: "Total", visible: true } }, currencySymbolPosition: "before" },
  total: { labels: { total: { label: "Total", visible: true }, subTotal: { label: "Sub Total", visible: true }, balanceDue: { label: "Balance Due", visible: true } }, fontSize: 12, fontColor: "#0f172a" },
  moduleSpecific: moduleDefaults(type),
});

const seedTemplates = () =>
  TEMPLATE_TYPES.map((t) => ({
    id: `${t.id}-default`,
    moduleType: t.id,
    name: "Standard Template",
    language: "English",
    status: "active",
    isDefault: true,
    family: "standard",
    preview: "standard",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    config: buildConfig(t.id, t.label, "Standard Template"),
  }));

const readTemplates = () => {
  if (typeof window === "undefined") return seedTemplates();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length ? parsed : seedTemplates();
  } catch {
    return seedTemplates();
  }
};

const readExportNames = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EXPORT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const ensureDefault = (rows, type) => {
  const inType = rows.filter((r) => r.moduleType === type);
  if (!inType.length) return rows;
  if (inType.some((r) => r.isDefault && r.status === "active")) return rows;
  const pick = inType.find((r) => r.status === "active") || inType[0];
  return rows.map((r) => (r.moduleType === type ? { ...r, isDefault: r.id === pick.id } : r));
};

function MiniSheet({ variant = "standard", config }) {
  const rows = variant === "spreadsheet" ? 8 : 4;
  return (
    <div className="h-full w-full rounded-sm border border-slate-300 p-2 text-[6px]" style={{ backgroundColor: config?.general?.backgroundColor || "#fff" }}>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="h-3 w-3 rounded-full bg-[#156372]" />
          <div className="mt-1 h-1 w-12 rounded bg-slate-200" />
          <div className="mt-1 h-1 w-10 rounded bg-slate-200" />
        </div>
        <div>
          <div className="h-1.5 w-10 rounded bg-slate-300" />
          <div className="mt-1 h-1 w-8 rounded bg-slate-200" />
        </div>
      </div>
      <div className="overflow-hidden rounded border border-slate-300">
        <div className="h-2 bg-slate-700" />
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="grid grid-cols-6 border-t border-slate-200">
            {Array.from({ length: 6 }).map((__, col) => (
              <div key={col} className="h-2 border-r border-slate-200 last:border-r-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelRows({ title, value, onChange }) {
  return (
    <div className="space-y-2 rounded border border-slate-200 p-3">
      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {Object.entries(value || {}).map(([key, row]) => (
        <div key={key} className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-2">
          <input value={row.label} onChange={(e) => onChange(key, { ...row, label: e.target.value })} className="h-9 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />
          <label className="flex items-center justify-end gap-2 text-[12px] text-slate-600">
            Show
            <input type="checkbox" checked={Boolean(row.visible)} onChange={(e) => onChange(key, { ...row, visible: e.target.checked })} />
          </label>
        </div>
      ))}
    </div>
  );
}

function EditorModal({ template, moduleLabel, onClose, onSave }) {
  const [draft, setDraft] = useState(() => deepClone(template));
  const [tab, setTab] = useState("general");
  useEffect(() => setDraft(deepClone(template)), [template]);

  const setTop = (k, v) => setDraft((p) => ({ ...p, [k]: v }));
  const setSec = (s, k, v) => setDraft((p) => ({ ...p, config: { ...p.config, [s]: { ...p.config[s], [k]: v } } }));
  const setLabel = (s, k, v) => setDraft((p) => ({ ...p, config: { ...p.config, [s]: { ...p.config[s], labels: { ...p.config[s].labels, [k]: v } } } }));
  const setField = (k, v) => setDraft((p) => ({ ...p, config: { ...p.config, transactionDetails: { ...p.config.transactionDetails, fields: { ...p.config.transactionDetails.fields, [k]: v } } } }));
  const setModule = (k, v) => setDraft((p) => ({ ...p, config: { ...p.config, moduleSpecific: { ...p.config.moduleSpecific, [k]: v } } }));

  const tabs = [
    ["general", "General"],
    ["header", "Header & Footer"],
    ["details", "Transaction Details"],
    ["table", "Table"],
    ["total", "Total"],
    ["module", "Module Specific"],
  ];

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/30" onClick={onClose}>
      <div className="m-4 h-[calc(100vh-32px)] overflow-hidden rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">Edit Template</h3>
            <p className="text-[12px] text-slate-500">{moduleLabel} | {draft.language}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="border-b border-slate-200 px-4"><div className="flex flex-wrap gap-4">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`border-b-2 px-1 py-3 text-[12px] ${tab === id ? "border-[#156372] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>)}</div></div>
        <div className="h-[calc(100%-118px)] overflow-auto p-4">
          {tab === "general" ? <div className="grid gap-4 lg:grid-cols-2"><input value={draft.name} onChange={(e) => { setTop("name", e.target.value); setSec("general", "templateName", e.target.value); }} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><select value={draft.language} onChange={(e) => setTop("language", e.target.value)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]">{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select><select value={draft.config.general.paperSize} onChange={(e) => setSec("general", "paperSize", e.target.value)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]"><option>A4</option><option>Letter</option></select><select value={draft.config.general.pdfFont} onChange={(e) => setSec("general", "pdfFont", e.target.value)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]"><option>Helvetica</option><option>Noto Sans</option><option>Times New Roman</option></select><label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={draft.config.general.showOrganizationLogo} onChange={(e) => setSec("general", "showOrganizationLogo", e.target.checked)} />Show Organization Logo</label><input type="color" value={draft.config.general.backgroundColor} onChange={(e) => setSec("general", "backgroundColor", e.target.value)} className="h-10 rounded border border-slate-300 p-1" /><textarea rows={3} value={draft.config.general.attentionContent} onChange={(e) => setSec("general", "attentionContent", e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#156372] lg:col-span-2" /></div> : null}
          {tab === "header" ? <div className="space-y-4"><div className="grid gap-4 lg:grid-cols-2"><input value={draft.config.headerFooter.documentTitle} onChange={(e) => setSec("headerFooter", "documentTitle", e.target.value)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><input type="number" value={draft.config.headerFooter.titleFontSize} onChange={(e) => setSec("headerFooter", "titleFontSize", Number(e.target.value) || 18)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><input type="color" value={draft.config.headerFooter.titleColor} onChange={(e) => setSec("headerFooter", "titleColor", e.target.value)} className="h-10 rounded border border-slate-300 p-1" /><label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={draft.config.headerFooter.applyFirstPageOnly} onChange={(e) => setSec("headerFooter", "applyFirstPageOnly", e.target.checked)} />Apply to first page only</label><label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={draft.config.headerFooter.repeatHeader} onChange={(e) => setSec("headerFooter", "repeatHeader", e.target.checked)} />Repeat header</label><textarea rows={3} value={draft.config.headerFooter.headerContent} onChange={(e) => setSec("headerFooter", "headerContent", e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#156372] lg:col-span-2" /></div><LabelRows title="Header Labels" value={draft.config.headerFooter.labels} onChange={(k, v) => setLabel("headerFooter", k, v)} /></div> : null}
          {tab === "details" ? <LabelRows title="Transaction Fields" value={draft.config.transactionDetails.fields} onChange={setField} /> : null}
          {tab === "table" ? <div className="space-y-4"><LabelRows title="Table Labels" value={draft.config.table.labels} onChange={(k, v) => setLabel("table", k, v)} /><select value={draft.config.table.currencySymbolPosition} onChange={(e) => setSec("table", "currencySymbolPosition", e.target.value)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]"><option value="before">Currency Symbol Before Amount</option><option value="after">Currency Symbol After Amount</option></select></div> : null}
          {tab === "total" ? <div className="space-y-4"><LabelRows title="Total Labels" value={draft.config.total.labels} onChange={(k, v) => setLabel("total", k, v)} /><div className="grid gap-4 lg:grid-cols-2"><input type="number" value={draft.config.total.fontSize} onChange={(e) => setSec("total", "fontSize", Number(e.target.value) || 12)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><input type="color" value={draft.config.total.fontColor} onChange={(e) => setSec("total", "fontColor", e.target.value)} className="h-10 rounded border border-slate-300 p-1" /></div></div> : null}
          {tab === "module" ? <div className="space-y-3 rounded border border-slate-200 p-3">{Object.keys(draft.config.moduleSpecific || {}).length === 0 ? <p className="text-[13px] text-slate-600">No module-specific options for this template type yet.</p> : Object.entries(draft.config.moduleSpecific).map(([k, v]) => typeof v === "boolean" ? <label key={k} className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={v} onChange={(e) => setModule(k, e.target.checked)} />{k}</label> : typeof v === "string" || typeof v === "number" ? <input key={k} value={v} onChange={(e) => setModule(k, typeof v === "number" ? Number(e.target.value) : e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /> : null)}</div> : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3"><button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => onSave(draft)} className="rounded bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#156372]">Save</button></div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { type: routeType = "invoices" } = useParams();
  const validTypes = TEMPLATE_TYPES.map((row) => row.id);
  const currentType = validTypes.includes(routeType) ? routeType : "invoices";

  const [templates, setTemplates] = useState(() => readTemplates());
  const [exportNames, setExportNames] = useState(() => readExportNames());
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [useMenuId, setUseMenuId] = useState("");
  const [chooseOpen, setChooseOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState("all");
  const [selectedGalleryId, setSelectedGalleryId] = useState("std-1");
  const [createBase, setCreateBase] = useState(null);
  const [createName, setCreateName] = useState("");
  const [createLanguage, setCreateLanguage] = useState("English");
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDraft, setExportDraft] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORE_KEY, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(EXPORT_KEY, JSON.stringify(exportNames));
  }, [exportNames]);

  useEffect(() => {
    const onDown = (event) => {
      if (!event.target.closest(".template-menu-root")) {
        setMenuId("");
        setUseMenuId("");
      }
      if (!event.target.closest(".template-filter-root")) setFilterOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setMenuId("");
        setUseMenuId("");
        setFilterOpen(false);
        setChooseOpen(false);
        setCreateBase(null);
        setEditorTemplate(null);
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const orderedTypes = useMemo(() => {
    const order = TYPE_ORDER.map((id) => TEMPLATE_TYPES.find((row) => row.id === id)).filter(Boolean);
    const rest = TEMPLATE_TYPES.filter((row) => !TYPE_ORDER.includes(row.id));
    return [...order, ...rest];
  }, []);

  const typeLabel = TEMPLATE_TYPES.find((row) => row.id === currentType)?.label || "Templates";
  const singular = typeLabel.endsWith("s") ? typeLabel.slice(0, -1) : typeLabel;
  const filterLabel = { all: `All ${singular} Templates`, active: `Active ${singular} Templates`, inactive: `Inactive ${singular} Templates` };

  const moduleTemplates = useMemo(() => templates.filter((row) => row.moduleType === currentType), [templates, currentType]);
  const visibleTemplates = useMemo(() => {
    const rows = filter === "all" ? moduleTemplates : moduleTemplates.filter((row) => row.status === filter);
    return [...rows].sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1));
  }, [moduleTemplates, filter]);

  const galleryRows = useMemo(() => {
    const tab = GALLERY_TABS.find((row) => row.id === galleryTab);
    return tab?.family ? GALLERY.filter((row) => row.family === tab.family) : GALLERY;
  }, [galleryTab]);

  const galleryCounts = useMemo(() => {
    const map = {};
    GALLERY_TABS.forEach((tab) => {
      map[tab.id] = tab.family ? GALLERY.filter((row) => row.family === tab.family).length : GALLERY.length;
    });
    return map;
  }, []);

  const setDefault = (template) => {
    setTemplates((prev) => prev.map((row) => (row.moduleType === template.moduleType ? { ...row, isDefault: row.id === template.id, status: row.id === template.id ? "active" : row.status } : row)));
    setMenuId("");
    setUseMenuId("");
    toast.success("Default template updated.");
  };

  const cloneTemplate = (template) => {
    const copy = { ...deepClone(template), id: `tpl-${Date.now()}`, name: `${template.name} (Copy)`, isDefault: false, status: "active", createdAt: nowIso(), updatedAt: nowIso() };
    setTemplates((prev) => ensureDefault([...prev, copy], template.moduleType));
    setMenuId("");
    setUseMenuId("");
    toast.success("Template cloned.");
  };

  const toggleStatus = (template) => {
    const next = template.status === "active" ? "inactive" : "active";
    setTemplates((prev) => ensureDefault(prev.map((row) => (row.id === template.id ? { ...row, status: next, isDefault: next === "inactive" ? false : row.isDefault } : row)), template.moduleType));
    setMenuId("");
    setUseMenuId("");
    toast.info(`Template ${next}.`);
  };

  const createTemplate = () => {
    if (!createBase) return;
    const displayName = String(createName || "").trim() || createBase.name;
    const created = { id: `tpl-${Date.now()}`, moduleType: currentType, name: displayName, language: createLanguage, status: "active", isDefault: false, family: createBase.family, preview: createBase.preview, createdAt: nowIso(), updatedAt: nowIso(), config: buildConfig(currentType, typeLabel, displayName) };
    setTemplates((prev) => ensureDefault([...prev, created], currentType));
    setEditorTemplate(created);
    setCreateBase(null);
    toast.success("Template created.");
  };

  const saveTemplate = (draft) => {
    setTemplates((prev) => ensureDefault(prev.map((row) => (row.id === draft.id ? { ...draft, updatedAt: nowIso() } : row)), draft.moduleType));
    setEditorTemplate(null);
    toast.success("Template saved.");
  };

  const openExport = () => {
    setExportDraft(exportNames[currentType] || "{module}-{number}-{date}");
    setExportOpen(true);
  };

  const saveExport = () => {
    setExportNames((prev) => ({ ...prev, [currentType]: exportDraft || "{module}-{number}-{date}" }));
    setExportOpen(false);
    toast.success("Export file name configured.");
  };

  return (
    <div className="min-h-full bg-[#f2f3f5]">
      <div className="grid min-h-full grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-r border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h1 className="text-[16px] font-semibold text-slate-900">Templates</h1>
          </div>
          <div className="max-h-[calc(100vh-88px)] overflow-y-auto">
            {orderedTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => navigate(`/settings/templates/${type.id}`)}
                className={`w-full px-5 py-3 text-left text-[15px] transition-colors ${
                  type.id === currentType
                    ? "border-y border-slate-200 bg-[#f4f5f8] text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex items-center justify-between border-b border-slate-300 bg-[#f0f0f1] px-5 py-3">
            <div className="relative template-filter-root">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex items-center gap-2 text-[16px] font-medium leading-none text-slate-900"
              >
                {filterLabel[filter]}
                <ChevronDown className="h-4 w-4 text-slate-700" />
              </button>
              {filterOpen ? (
                <div className="absolute left-0 top-[50px] z-30 w-[240px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                  {["all", "active", "inactive"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setFilter(key);
                        setFilterOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-[13px] ${
                        filter === key ? "bg-[#156372] text-white" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {key === "all" ? `All ${singular} Templates` : key === "active" ? "Active Templates" : "Inactive Templates"}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={openExport}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#156372] hover:text-[#156372]"
              >
                <Settings className="h-5 w-5" />
                Configure Export File Name
              </button>
              <button
                type="button"
                onClick={() => setChooseOpen(true)}
                className="rounded-md bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#156372]"
              >
                +New
              </button>
            </div>
          </div>

          <div className="overflow-auto p-5">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleTemplates.map((template) => (
                <div key={template.id}>
                  <div className="group relative overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
                    <div className="h-[410px] p-4">
                      <MiniSheet variant={template.preview || "standard"} config={template.config} />
                    </div>
                    {template.isDefault ? (
                      <span className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded bg-[#f2c94c] px-2 py-0.5 text-[10px] font-semibold text-slate-900">
                        DEFAULT
                      </span>
                    ) : null}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[#343b49] opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-4 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditorTemplate(deepClone(template))}
                        className="pointer-events-auto rounded-md bg-[#156372] px-4 py-1.5 text-[12px] font-semibold text-white"
                      >
                        Edit
                      </button>
                      <div className="relative template-menu-root pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId((v) => (v === template.id ? "" : template.id));
                            setUseMenuId("");
                          }}
                          className="rounded-md bg-white px-3 py-1.5 text-slate-700"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        {menuId === template.id ? (
                          <div className="absolute left-0 top-[44px] z-20 w-[190px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setEditorTemplate(deepClone(template));
                                setMenuId("");
                                setUseMenuId("");
                              }}
                              className="flex w-full items-center gap-2 bg-[#156372] px-3 py-2 text-left text-[14px] text-white"
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setUseMenuId((v) => (v === template.id ? "" : template.id))}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                            >
                              Use This Template For
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => cloneTemplate(template)} className="w-full px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50">Clone</button>
                            <button type="button" onClick={() => toggleStatus(template)} className="w-full px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50">{template.status === "active" ? "Deactivate" : "Activate"}</button>
                          </div>
                        ) : null}
                        {menuId === template.id && useMenuId === template.id ? (
                          <div className="absolute left-[194px] top-[72px] z-30 w-[200px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                            <button type="button" onClick={() => setDefault(template)} className="w-full px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50">Set As Default</button>
                            <button type="button" onClick={() => { setMenuId(""); setUseMenuId(""); toast.info("Contact association flow can be linked here."); }} className="w-full px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50">Contact Association</button>
                            <button type="button" onClick={() => { setMenuId(""); setUseMenuId(""); toast.info("Manual apply flow can be linked here."); }} className="w-full px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50">Apply On Transaction</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {template.status === "inactive" ? <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">INACTIVE</span> : null}
                  </div>
                  <div className="mt-2 text-[13px] text-slate-900">{template.name}</div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setChooseOpen(true)}
                className="flex min-h-[470px] flex-col justify-center rounded border border-dashed border-slate-300 bg-white p-6 text-left hover:border-slate-400"
              >
                <h3 className="text-[30px] font-medium text-slate-900">New Template</h3>
                <p className="mt-3 text-[14px] leading-snug text-slate-700">Click to add a template from our gallery. You can customize the template title, columns, and headers in line item table.</p>
                <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white">
                  <Plus className="h-4 w-4" />
                  New
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {chooseOpen ? (
        <div className="fixed inset-0 z-[130] bg-slate-900/20" onClick={() => setChooseOpen(false)}>
          <div className="m-4 h-[calc(100vh-32px)] overflow-hidden rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[18px] font-medium text-slate-900">Choose a Template</h3>
              <button type="button" onClick={() => setChooseOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-200 px-4">
              <div className="flex flex-wrap gap-5">
                {GALLERY_TABS.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setGalleryTab(tab.id)} className={`border-b-2 px-1 py-3 text-[12px] ${galleryTab === tab.id ? "border-[#156372] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    {tab.label} ({galleryCounts[tab.id] || 0})
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[calc(100%-95px)] overflow-auto p-4">
              <div className="rounded border border-[#156372] p-3">
                <div className="flex min-w-max gap-3">
                  {galleryRows.map((row) => (
                    <div key={row.id} className={`group w-[240px] rounded border ${selectedGalleryId === row.id ? "border-[#156372]" : "border-slate-200"} bg-white`}>
                      <div className="relative h-[340px] p-3">
                        <MiniSheet variant={row.preview} />
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-[56px] bg-gradient-to-t from-slate-700/85 to-slate-700/0 opacity-0 transition-opacity group-hover:opacity-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGalleryId(row.id);
                            setCreateBase(row);
                            setCreateName("");
                            setCreateLanguage("English");
                            setChooseOpen(false);
                          }}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-[#156372] px-4 py-1.5 text-[12px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Use This
                        </button>
                      </div>
                      <div className="px-3 pb-3 text-[13px] text-slate-900">{row.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {createBase ? (
        <div className="fixed inset-0 z-[141] bg-slate-900/30" onClick={() => setCreateBase(null)}>
          <div className="mx-auto mt-20 w-full max-w-[560px] rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[16px] font-semibold text-slate-900">Create Template</h3>
              <button type="button" onClick={() => setCreateBase(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
                Base: <span className="font-medium text-slate-900">{createBase.name}</span><br />
                Module: <span className="font-medium text-slate-900">{typeLabel}</span>
              </div>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={createBase.name} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />
              <select value={createLanguage} onChange={(e) => setCreateLanguage(e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]">
                {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" onClick={() => setCreateBase(null)} className="rounded border border-slate-300 px-4 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={createTemplate} className="rounded bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#156372]">Continue</button>
            </div>
          </div>
        </div>
      ) : null}

      {exportOpen ? (
        <div className="fixed inset-0 z-[141] bg-slate-900/30" onClick={() => setExportOpen(false)}>
          <div className="mx-auto mt-24 w-full max-w-[520px] rounded border border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[16px] font-semibold text-slate-900">Configure Export File Name</h3>
              <button type="button" onClick={() => setExportOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-[12px] text-slate-600">Use placeholders: <code className="rounded bg-slate-100 px-1">{`{module}`}</code>, <code className="rounded bg-slate-100 px-1">{`{number}`}</code>, <code className="rounded bg-slate-100 px-1">{`{date}`}</code>.</p>
              <input value={exportDraft} onChange={(e) => setExportDraft(e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" onClick={() => setExportOpen(false)} className="rounded border border-slate-300 px-4 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveExport} className="rounded bg-[#156372] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#156372]">Save</button>
            </div>
          </div>
        </div>
      ) : null}

      {editorTemplate ? (
        <TemplateEditorModal
          template={editorTemplate}
          moduleLabel={TEMPLATE_TYPES.find((row) => row.id === editorTemplate.moduleType)?.label || "Template"}
          onClose={() => setEditorTemplate(null)}
          onSave={saveTemplate}
        />
      ) : null}
    </div>
  );
}
