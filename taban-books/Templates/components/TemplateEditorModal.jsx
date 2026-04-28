import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, X } from "lucide-react";

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const LANGUAGES = ["English", "Japanese", "Arabic", "French", "Spanish", "German", "Chinese", "Hindi", "Somali"];
const COLOR_THEMES = [
  { id: "default", label: "Default", group: "default", swatch: ["#111827", "#ffffff"], accent: "#111827", headerBg: "#34393f", headerText: "#ffffff" },
  { id: "blue", label: "Blue", group: "vibrant", swatch: ["#2563eb", "#bfdbfe"], accent: "#2563eb", headerBg: "#2563eb", headerText: "#ffffff" },
  { id: "green", label: "Green", group: "vibrant", swatch: ["#16a34a", "#bbf7d0"], accent: "#16a34a", headerBg: "#16a34a", headerText: "#ffffff" },
  { id: "orange", label: "Orange", group: "vibrant", swatch: ["#f97316", "#fed7aa"], accent: "#f97316", headerBg: "#f97316", headerText: "#ffffff" },
  { id: "red", label: "Red", group: "vibrant", swatch: ["#dc2626", "#fecaca"], accent: "#dc2626", headerBg: "#dc2626", headerText: "#ffffff" },
  { id: "teal", label: "Teal", group: "vibrant", swatch: ["#0f766e", "#99f6e4"], accent: "#0f766e", headerBg: "#0f766e", headerText: "#ffffff" },
  { id: "purple", label: "Purple", group: "vibrant", swatch: ["#7c3aed", "#ddd6fe"], accent: "#7c3aed", headerBg: "#7c3aed", headerText: "#ffffff" },
  { id: "indigo", label: "Indigo", group: "formal", swatch: ["#1e3a8a", "#bfdbfe"], accent: "#1e3a8a", headerBg: "#1e3a8a", headerText: "#ffffff" },
  { id: "pink", label: "Pink", group: "formal", swatch: ["#db2777", "#fbcfe8"], accent: "#db2777", headerBg: "#db2777", headerText: "#ffffff" },
  { id: "brown", label: "Brown", group: "formal", swatch: ["#8b5e34", "#e7d7c8"], accent: "#8b5e34", headerBg: "#8b5e34", headerText: "#ffffff" },
  { id: "turquoise", label: "Turquoise Green", group: "formal", swatch: ["#0f766e", "#99f6e4"], accent: "#0f766e", headerBg: "#0f766e", headerText: "#ffffff" },
  { id: "bluegrey", label: "Blue Grey", group: "formal", swatch: ["#475569", "#cbd5e1"], accent: "#475569", headerBg: "#475569", headerText: "#ffffff" },
  { id: "greensea", label: "Green Sea", group: "formal", swatch: ["#0f766e", "#5eead4"], accent: "#0f766e", headerBg: "#0f766e", headerText: "#ffffff" },
];
const BG_POSITIONS = [
  "Top left",
  "Top center",
  "Top right",
  "Center left",
  "Center center",
  "Center right",
  "Bottom left",
  "Bottom center",
  "Bottom right",
];
const PDF_FONTS = [
  { id: "Open Sans", desc: "Supports English, German, Spanish, French, Italian, Dutch, Polish, Portuguese, Swedish, Catalan, Czech, Maltese, Russian and Slovenian language characters." },
  { id: "Sacramento", desc: "Support for Digital Signature style." },
  { id: "Helvetica", desc: "Supports all English characters." },
  { id: "Noto Sans", desc: "Supports all European languages." },
  { id: "Times New Roman", desc: "Classic serif font for formal documents." },
];

function LabelRows({ title, value, onChange }) {
  return (
    <div className="space-y-2 rounded border border-slate-200 p-3">
      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {Object.entries(value || {}).map(([key, row]) => (
        <div key={key} className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-2">
          <input
            value={row.label}
            onChange={(e) => onChange(key, { ...row, label: e.target.value })}
            className="h-9 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]"
          />
          <label className="flex items-center justify-end gap-2 text-[12px] text-slate-600">
            Show
            <input type="checkbox" checked={Boolean(row.visible)} onChange={(e) => onChange(key, { ...row, visible: e.target.checked })} />
          </label>
        </div>
      ))}
    </div>
  );
}

export default function TemplateEditorModal({ template, moduleLabel, onClose, onSave }) {
  const [draft, setDraft] = useState(() => deepClone(template));
  const [section, setSection] = useState("general");
  const [openBlocks, setOpenBlocks] = useState({ properties: true, font: false, background: false });
  const [previewSeed, setPreviewSeed] = useState(0);
  const [fontOpen, setFontOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const fontMenuRef = useRef(null);
  const [bgOpen, setBgOpen] = useState(false);
  const [bgQuery, setBgQuery] = useState("");
  const bgMenuRef = useRef(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeMenuRef = useRef(null);

  useEffect(() => {
    setDraft(deepClone(template));
    setSection("general");
  }, [template]);

  useEffect(() => {
    const onDown = (event) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target)) {
        setFontOpen(false);
      }
      if (bgMenuRef.current && !bgMenuRef.current.contains(event.target)) {
        setBgOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const setTop = (k, v) => setDraft((p) => ({ ...p, [k]: v }));
  const setSec = (s, k, v) => setDraft((p) => ({ ...p, config: { ...p.config, [s]: { ...p.config[s], [k]: v } } }));
  const setLabel = (s, k, v) => setDraft((p) => ({ ...p, config: { ...p.config, [s]: { ...p.config[s], labels: { ...p.config[s].labels, [k]: v } } } }));
  const setField = (k, v) => setDraft((p) => ({ ...p, config: { ...p.config, transactionDetails: { ...p.config.transactionDetails, fields: { ...p.config.transactionDetails.fields, [k]: v } } } }));
  const setModule = (k, v) => setDraft((p) => ({ ...p, config: { ...p.config, moduleSpecific: { ...p.config.moduleSpecific, [k]: v } } }));

  const general = draft?.config?.general || {};
  const headerFooter = draft?.config?.headerFooter || {};
  const details = draft?.config?.transactionDetails?.fields || {};
  const table = draft?.config?.table || {};
  const total = draft?.config?.total || {};
  const moduleSpecific = draft?.config?.moduleSpecific || {};
  const margins = general.margins || { top: 0.7, bottom: 0.7, left: 0.55, right: 0.4 };
  const orientation = general.orientation || "portrait";
  const labelColor = general.labelColor || "#333333";
  const fontColor = general.fontColor || "#333333";
  const fontSize = general.fontSize || 9;
  const themeId = general.colorTheme || "default";
  const theme = COLOR_THEMES.find((row) => row.id === themeId) || COLOR_THEMES[0];

  const navItems = [
    { id: "general", label: "General", code: "G" },
    { id: "header", label: "Header & Footer", code: "H" },
    { id: "details", label: "Transaction Details", code: "T" },
    { id: "table", label: "Table", code: "TB" },
    { id: "total", label: "Total", code: "$" },
    { id: "module", label: "Other Details", code: "O" },
  ];

  const toggleBlock = (key) => setOpenBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  const setMargin = (key, value) => {
    const number = Number(value);
    setSec("general", "margins", { ...margins, [key]: Number.isFinite(number) ? number : 0 });
  };
  const labelFor = (obj, key, fallback) => obj?.[key]?.label || fallback;
  const visibleFor = (obj, key, fallback = true) => (typeof obj?.[key]?.visible === "boolean" ? obj[key].visible : fallback);
  const fontOptions = PDF_FONTS.filter((row) => row.id.toLowerCase().includes(fontQuery.toLowerCase()));
  const bgOptions = BG_POSITIONS.filter((row) => row.toLowerCase().includes(bgQuery.toLowerCase()));

  const handleBackgroundFile = (file) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Maximum file size is 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSec("general", "backgroundImage", reader.result);
    reader.readAsDataURL(file);
  };

  const previewRows = [
    { id: 1, item: "Brochure Design", desc: "Brochure Design Single Sided Color", qty: 1, rate: 300, amount: 300 },
    { id: 2, item: "Web Design Package - Basic", desc: "Custom themes for your business.", qty: 1, rate: 250, amount: 250 },
    { id: 3, item: "Print Ad - Basic - Color", desc: "Print Ad 1/8 size Color", qty: 1, rate: 80, amount: 80 },
  ];
  const subTotal = previewRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-200">
      <div className="h-full w-full border-t-[10px] bg-[#efeff1]" style={{ borderTopColor: theme.accent }}>
        <div className="flex items-center justify-between border-b border-slate-300 bg-[#f7f7f8] px-3 py-2.5">
          <h3 className="text-[32px] font-medium text-slate-900">Edit Template</h3>
          <div className="flex items-center gap-3">
            <div ref={themeMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[14px] text-blue-600"
              >
                Select Color Theme
                <ChevronDown className={`h-4 w-4 transition-transform ${themeOpen ? "rotate-180" : ""}`} />
              </button>
              {themeOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-[280px] rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-[340px] overflow-auto p-2">
                    {COLOR_THEMES.filter((t) => t.group === "default").map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setSec("general", "colorTheme", row.id);
                          setThemeOpen(false);
                        }}
                        className={`mb-2 flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-[13px] ${themeId === row.id ? "border-[#3b82f6] bg-[#3b82f6] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="flex h-6 w-10 overflow-hidden rounded border border-slate-200">
                          <span className="h-full w-1/2" style={{ backgroundColor: row.swatch[0] }} />
                          <span className="h-full w-1/2" style={{ backgroundColor: row.swatch[1] }} />
                        </span>
                        <span>{row.label.toLowerCase()}</span>
                      </button>
                    ))}
                    <div className="px-2 pb-1 pt-2 text-[11px] font-semibold text-slate-500">VIBRANT</div>
                    {COLOR_THEMES.filter((t) => t.group === "vibrant").map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setSec("general", "colorTheme", row.id);
                          setThemeOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] ${themeId === row.id ? "bg-[#3b82f6] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="flex h-6 w-10 overflow-hidden rounded border border-slate-200">
                          <span className="h-full w-1/2" style={{ backgroundColor: row.swatch[0] }} />
                          <span className="h-full w-1/2" style={{ backgroundColor: row.swatch[1] }} />
                        </span>
                        <span>{row.label}</span>
                      </button>
                    ))}
                    <div className="px-2 pb-1 pt-3 text-[11px] font-semibold text-slate-500">FORMAL</div>
                    {COLOR_THEMES.filter((t) => t.group === "formal").map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setSec("general", "colorTheme", row.id);
                          setThemeOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] ${themeId === row.id ? "bg-[#3b82f6] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="flex h-6 w-10 overflow-hidden rounded border border-slate-200">
                          <span className="h-full w-1/2" style={{ backgroundColor: row.swatch[0] }} />
                          <span className="h-full w-1/2" style={{ backgroundColor: row.swatch[1] }} />
                        </span>
                        <span>{row.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setPreviewSeed((v) => v + 1)} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[14px] text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4 text-[#156372]" />
              Refresh Preview
            </button>
            <button type="button" onClick={() => onSave(draft)} className="h-10 rounded-md bg-[#156372] px-5 text-[14px] font-semibold text-white hover:bg-[#156372]">
              Save
            </button>
            <button type="button" onClick={onClose} className="p-1 text-[#156372]">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid h-[calc(100%-58px)] grid-cols-[74px_420px_minmax(0,1fr)]">
          <aside className="border-r border-slate-300 bg-[#ebeef3] py-1">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`mb-1 flex w-full flex-col items-center px-1 py-3 text-center transition-colors ${active ? "bg-[#156372] text-white" : "text-slate-600 hover:bg-slate-200"}`}>
                  <span className={`mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${active ? "bg-white/25" : "bg-white"}`}>{item.code}</span>
                  <span className="text-[11px] leading-tight">{item.label}</span>
                </button>
              );
            })}
          </aside>

          <div className="border-r border-slate-300 bg-[#f6f7fa]">
            <div className="h-full overflow-auto">
              {section === "general" ? (
                <>
                  <div className="border-b border-slate-300 px-5 py-4">
                    <button type="button" onClick={() => toggleBlock("properties")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[30px] font-medium text-slate-900">Template Properties</h4>
                      <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${openBlocks.properties ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {openBlocks.properties ? (
                    <div className="space-y-5 border-b border-slate-300 px-5 py-5">
                      <div>
                        <label className="mb-2 block text-[14px] font-medium text-[#156372]">Template Name*</label>
                        <input value={draft.name} onChange={(e) => { setTop("name", e.target.value); setSec("general", "templateName", e.target.value); }} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#156372]" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[14px] font-medium text-slate-800">Paper Size</label>
                        <div className="flex items-center gap-4 text-[14px]">
                          {["A5", "A4", "Letter"].map((size) => <label key={size} className="inline-flex items-center gap-2 text-slate-700"><input type="radio" name="paper-size" checked={(general.paperSize || "A4") === size} onChange={() => setSec("general", "paperSize", size)} />{size}</label>)}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[14px] font-medium text-slate-800">Orientation</label>
                        <div className="flex items-center gap-4 text-[14px]">
                          {["portrait", "landscape"].map((item) => <label key={item} className="inline-flex items-center gap-2 text-slate-700"><input type="radio" name="orientation" checked={orientation === item} onChange={() => setSec("general", "orientation", item)} />{item[0].toUpperCase() + item.slice(1)}</label>)}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[14px] font-medium text-slate-800">Margins (in inches)</label>
                        <div className="grid grid-cols-4 gap-3">
                          {["top", "bottom", "left", "right"].map((edge) => <div key={edge}><div className="mb-1 text-[12px] capitalize text-slate-600">{edge}</div><input type="number" step="0.01" value={margins[edge]} onChange={(e) => setMargin(edge, e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-right text-[13px] outline-none focus:border-[#156372]" /></div>)}
                        </div>
                      </div>
                      {draft.moduleType === "invoices" ? <label className="inline-flex items-center gap-2 text-[14px] text-slate-700"><input type="checkbox" checked={Boolean(moduleSpecific.usePaymentStub)} onChange={(e) => setModule("usePaymentStub", e.target.checked)} />Include Payment Stub</label> : null}
                    </div>
                  ) : null}
                  <div className="border-b border-slate-300 px-5 py-4">
                    <button type="button" onClick={() => toggleBlock("font")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[18px] font-medium text-slate-900">Font</h4>
                      <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${openBlocks.font ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.font ? (
                      <div className="mt-4 space-y-4">
                        <div ref={fontMenuRef} className="relative">
                          <label className="mb-2 block text-[12px] font-medium text-slate-600">PDF Font</label>
                          <button
                            type="button"
                            onClick={() => setFontOpen((v) => !v)}
                            className={`flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-[14px] outline-none ${fontOpen ? "border-[#156372]" : "border-slate-300"}`}
                          >
                            <span>{general.pdfFont || "Helvetica"}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${fontOpen ? "rotate-180" : ""}`} />
                          </button>
                          {fontOpen ? (
                            <div className="absolute z-30 mt-2 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                              <div className="border-b border-slate-200 p-2">
                                <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2">
                                  <input
                                    value={fontQuery}
                                    onChange={(e) => setFontQuery(e.target.value)}
                                    placeholder="Search"
                                    className="h-9 w-full text-[13px] outline-none"
                                  />
                                </div>
                              </div>
                              <div className="max-h-[260px] overflow-auto p-2">
                                {fontOptions.map((row) => (
                                  <button
                                    key={row.id}
                                    type="button"
                                    onClick={() => {
                                      setSec("general", "pdfFont", row.id);
                                      setFontOpen(false);
                                    }}
                                    className={`w-full rounded-md px-3 py-2 text-left text-[13px] ${general.pdfFont === row.id ? "bg-[#3b82f6] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                                  >
                                    <div className="font-medium">{row.id}</div>
                                    <div className={`text-[11px] ${general.pdfFont === row.id ? "text-white/90" : "text-slate-500"}`}>{row.desc}</div>
                                  </button>
                                ))}
                                {!fontOptions.length ? (
                                  <div className="px-3 py-2 text-[12px] text-slate-500">No fonts found</div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-2 block text-[12px] font-medium text-slate-600">Language</label>
                          <select value={draft.language} onChange={(e) => setTop("language", e.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#156372]">
                            {LANGUAGES.map((lang) => <option key={lang}>{lang}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-[12px] font-medium text-slate-600">Label Color</label>
                          <div className="grid grid-cols-[1fr_40px] items-center gap-2">
                            <input value={labelColor} onChange={(e) => setSec("general", "labelColor", e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#156372]" />
                            <input type="color" value={labelColor} onChange={(e) => setSec("general", "labelColor", e.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-slate-300 bg-white p-1" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-2 block text-[12px] font-medium text-slate-600">Font Color</label>
                            <div className="grid grid-cols-[1fr_40px] items-center gap-2">
                              <input value={fontColor} onChange={(e) => setSec("general", "fontColor", e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#156372]" />
                              <input type="color" value={fontColor} onChange={(e) => setSec("general", "fontColor", e.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-slate-300 bg-white p-1" />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-[12px] font-medium text-slate-600">Font Size</label>
                            <div className="grid grid-cols-[1fr_42px] items-center gap-2">
                              <input type="number" min="6" max="20" value={fontSize} onChange={(e) => setSec("general", "fontSize", Number(e.target.value) || 9)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#156372]" />
                              <div className="h-10 rounded-md border border-slate-300 bg-slate-50 px-2 text-center text-[12px] leading-10 text-slate-600">pt</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="border-b border-slate-300 px-5 py-4">
                    <button type="button" onClick={() => toggleBlock("background")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[18px] font-medium text-slate-900">Background</h4>
                      <ChevronRight className={`h-5 w-5 text-slate-600 transition-transform ${openBlocks.background ? "rotate-90" : ""}`} />
                    </button>
                    {openBlocks.background ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="mb-2 block text-[12px] font-medium text-slate-600">Background Image</label>
                          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#156372]">↑</div>
                            <div className="mt-3 text-[13px] text-slate-700">
                              Drag and drop or{" "}
                              <label className="cursor-pointer text-[#3b82f6] hover:underline">
                                Upload file
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleBackgroundFile(e.target.files?.[0])}
                                />
                              </label>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">Maximum size: 1 MB</div>
                            <div className="text-[11px] text-slate-500">Supported Formats: GIF, PNG, JPEG, JPG, BMP</div>
                          </div>
                        </div>

                        <div ref={bgMenuRef} className="relative">
                          <label className="mb-2 block text-[12px] font-medium text-slate-600">Image Position</label>
                          <button
                            type="button"
                            onClick={() => setBgOpen((v) => !v)}
                            className={`flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-[14px] outline-none ${bgOpen ? "border-[#156372]" : "border-slate-300"}`}
                          >
                            <span>{general.backgroundPosition || "Center center"}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${bgOpen ? "rotate-180" : ""}`} />
                          </button>
                          {bgOpen ? (
                            <div className="absolute z-30 mt-2 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                              <div className="border-b border-slate-200 p-2">
                                <input
                                  value={bgQuery}
                                  onChange={(e) => setBgQuery(e.target.value)}
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-slate-200 px-2 text-[13px] outline-none"
                                />
                              </div>
                              <div className="max-h-[220px] overflow-auto p-2">
                                {bgOptions.map((row) => (
                                  <button
                                    key={row}
                                    type="button"
                                    onClick={() => {
                                      setSec("general", "backgroundPosition", row);
                                      setBgOpen(false);
                                    }}
                                    className={`w-full rounded-md px-3 py-2 text-left text-[13px] ${general.backgroundPosition === row ? "bg-[#3b82f6] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                                  >
                                    {row}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="mb-2 block text-[12px] font-medium text-slate-600">Background Color</label>
                          <div className="grid grid-cols-[24px_1fr_40px] items-center gap-2">
                            <input
                              type="checkbox"
                              checked={general.backgroundColorEnabled !== false}
                              onChange={(e) => setSec("general", "backgroundColorEnabled", e.target.checked)}
                            />
                            <input
                              value={general.backgroundColor || "#ffffff"}
                              onChange={(e) => setSec("general", "backgroundColor", e.target.value)}
                              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none focus:border-[#156372]"
                            />
                            <input
                              type="color"
                              value={general.backgroundColor || "#ffffff"}
                              onChange={(e) => setSec("general", "backgroundColor", e.target.value)}
                              className="h-10 w-10 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {section === "header" ? <div className="space-y-4 px-5 py-5"><h4 className="text-[20px] font-medium text-slate-900">Header & Footer</h4><div className="grid gap-3"><input value={headerFooter.documentTitle || ""} onChange={(e) => setSec("headerFooter", "documentTitle", e.target.value)} placeholder="Document title" className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><input type="number" value={headerFooter.titleFontSize || 18} onChange={(e) => setSec("headerFooter", "titleFontSize", Number(e.target.value) || 18)} placeholder="Title font size" className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><input type="color" value={headerFooter.titleColor || "#0f172a"} onChange={(e) => setSec("headerFooter", "titleColor", e.target.value)} className="h-10 rounded border border-slate-300 p-1" /><textarea rows={3} value={headerFooter.headerContent || ""} onChange={(e) => setSec("headerFooter", "headerContent", e.target.value)} placeholder="Header content" className="rounded border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#156372]" /></div><LabelRows title="Header Labels" value={headerFooter.labels} onChange={(k, v) => setLabel("headerFooter", k, v)} /></div> : null}
              {section === "details" ? <div className="space-y-4 px-5 py-5"><h4 className="text-[20px] font-medium text-slate-900">Transaction Details</h4><LabelRows title="Transaction Fields" value={details} onChange={setField} /></div> : null}
              {section === "table" ? <div className="space-y-4 px-5 py-5"><h4 className="text-[20px] font-medium text-slate-900">Table</h4><LabelRows title="Table Labels" value={table.labels} onChange={(k, v) => setLabel("table", k, v)} /><select value={table.currencySymbolPosition || "before"} onChange={(e) => setSec("table", "currencySymbolPosition", e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]"><option value="before">Currency Symbol Before Amount</option><option value="after">Currency Symbol After Amount</option></select></div> : null}
              {section === "total" ? <div className="space-y-4 px-5 py-5"><h4 className="text-[20px] font-medium text-slate-900">Total</h4><LabelRows title="Total Labels" value={total.labels} onChange={(k, v) => setLabel("total", k, v)} /><div className="grid grid-cols-2 gap-3"><input type="number" value={total.fontSize || 12} onChange={(e) => setSec("total", "fontSize", Number(e.target.value) || 12)} className="h-10 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" /><input type="color" value={total.fontColor || "#0f172a"} onChange={(e) => setSec("total", "fontColor", e.target.value)} className="h-10 rounded border border-slate-300 p-1" /></div></div> : null}
              {section === "module" ? <div className="space-y-4 px-5 py-5"><h4 className="text-[20px] font-medium text-slate-900">Other Details</h4>{Object.keys(moduleSpecific).length === 0 ? <p className="text-[13px] text-slate-600">No module-specific options for this template type yet.</p> : <div className="space-y-3 rounded border border-slate-200 p-3">{Object.entries(moduleSpecific).map(([k, v]) => typeof v === "boolean" ? <label key={k} className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={v} onChange={(e) => setModule(k, e.target.checked)} />{k}</label> : <input key={k} value={v} onChange={(e) => setModule(k, typeof v === "number" ? Number(e.target.value) : e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />)}</div>}</div> : null}
            </div>
          </div>

          <div key={previewSeed} className="overflow-auto bg-[#efeff2] p-8">
            <div
              className="mx-auto min-h-[1080px] w-[760px] border border-slate-300 bg-white p-10 shadow-sm"
              style={{
                backgroundColor: general.backgroundColorEnabled === false ? "#ffffff" : (general.backgroundColor || "#ffffff"),
                backgroundImage: general.backgroundImage ? `url(${general.backgroundImage})` : "none",
                backgroundPosition: (general.backgroundPosition || "Center center").toLowerCase(),
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                fontFamily: general.pdfFont || "inherit",
                color: fontColor,
                fontSize: `${fontSize}pt`,
              }}
            >
              <div className="mb-4 flex items-start justify-end text-[20px]" style={{ color: labelColor }}><div className="text-right"><div className="font-semibold" style={{ color: fontColor }}>INV-17</div><div>03 Mar 2026</div></div></div>
              <div className="mb-8 grid grid-cols-2 gap-8"><div><div className="mb-1 text-[14px]" style={{ color: labelColor }}>Bill To</div><div className="text-[28px] font-semibold" style={{ color: fontColor }}>Rob & Joe Traders</div><div className="text-[20px] text-slate-700" style={{ color: fontColor }}>4141 Hacienda Drive</div><div className="text-[20px] text-slate-700" style={{ color: fontColor }}>Pleasanton</div><div className="text-[20px] text-slate-700" style={{ color: fontColor }}>94588 CA</div></div><div className="text-right"><div className="font-medium tracking-wide" style={{ color: headerFooter.titleColor || theme.accent, fontSize: `${Number(headerFooter.titleFontSize || 56)}px` }}>{(headerFooter.documentTitle || moduleLabel || "Invoice").toUpperCase()}</div><div className="mt-4 text-[20px]" style={{ color: labelColor }}>tabarak</div><div className="text-[20px]" style={{ color: labelColor }}>Somalia</div><div className="text-[20px]" style={{ color: labelColor }}>615019798</div></div></div>
              <table className="w-full border-collapse text-[16px]"><thead><tr style={{ backgroundColor: theme.headerBg, color: theme.headerText }}><th className="px-3 py-2 text-left">#</th>{visibleFor(details, "item", true) ? <th className="px-3 py-2 text-left">{labelFor(details, "item", "Item & Description")}</th> : null}{visibleFor(details, "quantity", true) ? <th className="px-3 py-2 text-right">{labelFor(details, "quantity", "Qty")}</th> : null}{visibleFor(details, "rate", true) ? <th className="px-3 py-2 text-right">{labelFor(details, "rate", "Rate")}</th> : null}{visibleFor(details, "amount", true) ? <th className="px-3 py-2 text-right">{labelFor(details, "amount", "Amount")}</th> : null}</tr></thead><tbody>{previewRows.map((row) => <tr key={row.id} className="border-b border-slate-200 text-slate-800"><td className="px-3 py-3 align-top">{row.id}</td>{visibleFor(details, "item", true) ? <td className="px-3 py-3"><div>{row.item}</div>{visibleFor(details, "description", true) ? <div className="text-[13px] text-slate-500">{row.desc}</div> : null}</td> : null}{visibleFor(details, "quantity", true) ? <td className="px-3 py-3 text-right">{row.qty}</td> : null}{visibleFor(details, "rate", true) ? <td className="px-3 py-3 text-right">{row.rate.toFixed(2)}</td> : null}{visibleFor(details, "amount", true) ? <td className="px-3 py-3 text-right">{row.amount.toFixed(2)}</td> : null}</tr>)}</tbody></table>
              <div className="mt-6 ml-auto w-[260px] space-y-2 text-[18px] text-slate-800"><div className="flex justify-between"><span>{labelFor(table.labels, "subTotal", "Sub Total")}</span><span>{subTotal.toFixed(2)}</span></div><div className="flex justify-between border-t border-slate-300 pt-2 text-[22px] font-bold"><span>{labelFor(total.labels, "total", "Total")}</span><span>662.75</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
