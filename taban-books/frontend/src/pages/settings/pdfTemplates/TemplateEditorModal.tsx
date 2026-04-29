import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Plus, X, Settings2, PanelTop, FileText, TableProperties, Sigma, FileCog } from "lucide-react";

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const LANGUAGES = ["English", "Japanese", "Arabic", "French", "Spanish", "German", "Chinese", "Hindi", "Somali"];
import { COLOR_THEMES } from "./constants";
const BG_POSITIONS = ["Top left", "Top center", "Top right", "Center left", "Center center", "Center right", "Bottom left", "Bottom center", "Bottom right"];
const PDF_FONTS = [
  { id: "Open Sans", desc: "Supports many Latin-based document languages." },
  { id: "Helvetica", desc: "Supports standard English characters." },
  { id: "Noto Sans", desc: "Broad multilingual support." },
  { id: "Times New Roman", desc: "Classic serif font for formal documents." },
];

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  A5: { width: 559, height: 794 },
  Letter: { width: 816, height: 1056 },
};

const GALLERY_IMAGES = [
  {
    category: "Featured Templates",
    images: [
      "file:///C:/Users/Taban-pc/.gemini/antigravity/brain/be7b475f-4c11-4583-b892-eb886ea72fdd/happy_new_year_header_generic_1777356836488.png",
      "file:///C:/Users/Taban-pc/.gemini/antigravity/brain/be7b475f-4c11-4583-b892-eb886ea72fdd/eid_mubarak_header_clean_1777356866144.png",
    ]
  },
  {
    category: "General",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1554034483-04fda0d3507b?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=400&h=100&q=80",
    ]
  },
  {
    category: "Patterns",
    images: [
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=400&h=100&q=80",
      "https://images.unsplash.com/photo-1634117622592-114e3024ff27?auto=format&fit=crop&w=400&h=100&q=80",
    ]
  }
];

function LabelRows({ fields, path, updateConfig }: { fields: Record<string, any>; path: string; updateConfig: (path: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      {Object.entries(fields || {}).map(([key, f]) => (
        <div key={key} className="flex items-center justify-between">
          <div className="flex-1">
            <input
              value={f.label}
              onChange={(e) => updateConfig(`${path}.${key}.label`, e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none focus:text-[#156372]"
            />
          </div>
          <button
            type="button"
            onClick={() => updateConfig(`${path}.${key}.visible`, !f.visible)}
            className={`p-1 transition-colors ${f.visible ? "text-[#156372]" : "text-gray-300"}`}
          >
            {f.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function TemplateEditorModal({
  template,
  moduleLabel,
  organization,
  onClose,
  onSave,
}: {
  template: any;
  moduleLabel: string;
  organization?: any;
  onClose: () => void;
  onSave: (draft: any) => void;
}) {
  const [draft, setDraft] = useState(() => deepClone(template));
  const [section, setSection] = useState("general");
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({ 
    properties: true, 
    font: false, 
    background: false, 
    header: true, 
    footer: false,
    orgDetails: true,
    custDetails: false,
    docDetails: false
  });
  const [fontOpen, setFontOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const fontMenuRef = useRef<HTMLDivElement | null>(null);
  const [bgOpen, setBgOpen] = useState(false);
  const [bgQuery, setBgQuery] = useState("");
  const [tableSubTab, setTableSubTab] = useState<"labels" | "layout">("labels");
  const [totalSubTab, setTotalSubTab] = useState<"labels" | "layout">("labels");
  const bgMenuRef = useRef<HTMLDivElement | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<"header" | "footer">("header");

  useEffect(() => {
    setDraft(deepClone(template));
    setSection("general");
  }, [template]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fontMenuRef.current && !fontMenuRef.current.contains(target)) setFontOpen(false);
      if (bgMenuRef.current && !bgMenuRef.current.contains(target)) setBgOpen(false);
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) setThemeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
                }, []);

  const updateConfig = (path: string, value: any) => {
    setDraft((prev: any) => {
      const next = deepClone(prev);
      const keys = path.split(".");
      let current = next.config;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const toNumber = (val: any) => parseFloat(String(val || 0)) || 0;
  const setTop = (key: string, value: any) => setDraft((prev: any) => ({ ...prev, [key]: value }));
  const setSec = (sectionKey: string, key: string, value: any) => updateConfig(`${sectionKey}.${key}`, value);
  const setModule = (key: string, value: any) => updateConfig(`moduleSpecific.${key}`, value);

  const general = draft?.config?.general || {};
  const headerFooter = draft?.config?.headerFooter || {};
  const table = draft?.config?.table || {};
  const total = draft?.config?.total || {};
  const moduleSpecific = draft?.config?.moduleSpecific || {};
  const margins = general.margins || { top: 0.7, bottom: 0.7, left: 0.55, right: 0.4 };
  const orientation = general.orientation || "portrait";
  const themeId = general.colorTheme || "default";
  const theme = COLOR_THEMES.find((row) => row.id === themeId) || COLOR_THEMES[0];
  const fontOptions = PDF_FONTS.filter((row) => row.id.toLowerCase().includes(fontQuery.toLowerCase()));
  const bgOptions = BG_POSITIONS.filter((row) => row.toLowerCase().includes(bgQuery.toLowerCase()));

  const paperSize = general.paperSize || "A4";
  const baseDim = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const previewWidth = orientation === "portrait" ? baseDim.width : baseDim.height;
  const previewHeight = orientation === "portrait" ? baseDim.height : baseDim.width;

  const toggleBlock = (key: string) => setOpenBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  const setMargin = (key: string, value: string) => {
    const nextValue = Number(value);
    updateConfig(`general.margins.${key}`, Number.isFinite(nextValue) ? nextValue : 0);
  };
  const handleBackgroundFile = (file: File | undefined, sectionKey: string, key: string) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Image size should be less than 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSec(sectionKey, key, url);
    };
    reader.readAsDataURL(file);
  };

  const labelFor = (obj: Record<string, any>, key: string, fallback: string) => (typeof obj?.[key] === "string" ? obj[key] : obj?.[key]?.label || fallback);
  const visibleFor = (obj: Record<string, any>, key: string, fallback = true) => {
    if (!obj || obj[key] === undefined) return fallback;
    if (typeof obj[key] === "boolean") return obj[key];
    if (typeof obj[key]?.visible === "boolean") return obj[key].visible;
    return fallback;
  };



  const previewRows = [
    { id: 1, item: "Brochure Design", desc: "Brochure Design Single Sided Color", qty: 1, rate: 300, amount: 300 },
    { id: 2, item: "Web Design Package - Basic", desc: "Custom themes for your business.", qty: 1, rate: 250, amount: 250 },
    { id: 3, item: "Print Ad - Basic - Color", desc: "Print Ad 1/8 size Color", qty: 1, rate: 80, amount: 80 },
  ];
  const subTotal = previewRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-slate-200">
      <div className="h-full w-full border-t-[10px] bg-[#efeff1]" style={{ borderTopColor: theme.accent }}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <h3 className="text-[20px] font-bold text-gray-900">Edit Template</h3>
          <div className="flex items-center gap-3">
            <div ref={themeMenuRef} className="relative">
              <button type="button" onClick={() => setThemeOpen((v) => !v)} className="inline-flex h-8 items-center gap-2 rounded border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-600 hover:bg-blue-50">
                Select Color Theme
                <ChevronDown className={`h-3 w-3 transition-transform ${themeOpen ? "rotate-180" : ""}`} />
              </button>
              {themeOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-[280px] rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="max-h-[340px] overflow-auto p-2">
                    {COLOR_THEMES.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setSec("general", "colorTheme", row.id);
                          setThemeOpen(false);
                        }}
                        className={`mb-2 flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-[13px] ${themeId === row.id ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                      >
                        <span className="flex h-6 w-10 overflow-hidden rounded border border-gray-200">
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
            <button type="button" className="flex h-8 items-center gap-2 rounded border border-gray-300 bg-white px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50">
              <span className="h-4 w-4 rotate-0 transition-transform hover:rotate-180">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
              </span>
              Refresh Preview
            </button>
            <button type="button" onClick={() => onSave(draft)} className="h-8 rounded bg-[#156372] px-6 text-[12px] font-semibold text-white hover:bg-[#0f4f5c]">
              Save
            </button>
            <button type="button" onClick={onClose} className="p-1 text-red-500 hover:text-red-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="grid h-[calc(100%-61px)] grid-cols-[68px_380px_minmax(0,1fr)]">
          <aside className="border-r border-slate-200 bg-[#156372] py-3 overflow-y-auto min-h-0">
            {[
              { id: "general", label: "General", Icon: Settings2 },
              { id: "header", label: "Header & Footer", Icon: PanelTop },
              { id: "details", label: "Transaction Details", Icon: FileText },
              { id: "table", label: "Table", Icon: TableProperties },
              { id: "total", label: "Total", Icon: Sigma },
            ].map((item) => {
              const active = section === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`mx-2 mb-3 flex flex-col items-center justify-center rounded-xl px-1 py-3 text-center transition-colors ${active ? "bg-white text-[#156372] shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                  <item.Icon className="mb-1.5 h-6 w-6 stroke-[1.5]" />
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </button>
              );
            })}
          </aside>

          <div className="border-r border-slate-200 bg-white min-h-0">
            <div className="h-full overflow-y-auto custom-scroll">
              {section === "general" ? (
                <>
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("properties")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Template Properties</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.properties ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {openBlocks.properties ? (
                    <div className="space-y-6 border-b border-slate-100 px-6 py-6">
                      <div>
                        <label className="mb-2 block text-[12px] font-medium text-red-500">Template Name*</label>
                        <input value={draft.name} onChange={(e) => { setTop("name", e.target.value); setSec("general", "templateName", e.target.value); }} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[13px] font-medium text-gray-800">Paper Size</label>
                        <div className="flex items-center gap-4 text-[13px]">{["A5", "A4", "Letter"].map((size) => <label key={size} className="inline-flex items-center gap-2 text-gray-700"><input type="radio" name="paper-size" checked={(general.paperSize || "A4") === size} onChange={() => setSec("general", "paperSize", size)} />{size}</label>)}</div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[13px] font-medium text-gray-800">Orientation</label>
                        <div className="flex items-center gap-4 text-[13px]">{["portrait", "landscape"].map((item) => <label key={item} className="inline-flex items-center gap-2 text-gray-700"><input type="radio" name="orientation" checked={orientation === item} onChange={() => setSec("general", "orientation", item)} />{item[0].toUpperCase() + item.slice(1)}</label>)}</div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[12px] font-medium text-gray-400">Margins (in inches)</label>
                        <div className="grid grid-cols-4 gap-2">{["top", "bottom", "left", "right"].map((edge) => <div key={edge}><div className="mb-1 text-[11px] capitalize text-gray-500">{edge === "right" ? "Right" : edge}</div><input type="number" step="0.01" value={margins[edge]} onChange={(e) => setMargin(edge, e.target.value)} className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-center text-[12px] outline-none focus:border-[#156372]" /></div>)}</div>
                      </div>
                    </div>
                  ) : null}
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("font")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Font</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.font ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.font && (
                      <div className="mt-6 space-y-6">
                        <div ref={fontMenuRef} className="relative">
                          <label className="mb-2 block text-[13px] font-medium text-gray-800">PDF Font</label>
                          <button type="button" onClick={() => setFontOpen((v) => !v)} className={`flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-[14px] outline-none ${fontOpen ? "border-[#156372]" : "border-gray-300"}`}>
                            <span>{general.pdfFont || "Helvetica"}</span>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${fontOpen ? "rotate-180" : ""}`} />
                          </button>
                          {fontOpen && (
                            <div className="absolute z-30 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                              <div className="border-b border-gray-100 p-2">
                                <input value={fontQuery} onChange={(e) => setFontQuery(e.target.value)} placeholder="Search fonts..." className="h-9 w-full rounded border border-gray-200 px-3 text-[13px] outline-none" />
                              </div>
                              <div className="max-h-[200px] overflow-auto py-1">
                                {fontOptions.map((f) => (
                                  <button key={f.id} type="button" onClick={() => { setSec("general", "pdfFont", f.id); setFontOpen(false); }} className={`flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50 ${general.pdfFont === f.id ? "bg-blue-50" : ""}`}>
                                    <span className="text-[14px] font-medium text-gray-900">{f.id}</span>
                                    <span className="text-[11px] text-gray-500">{f.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                            <input type="number" value={general.fontSize || 9} onChange={(e) => setSec("general", "fontSize", Number(e.target.value))} className="h-10 w-full rounded border border-gray-300 px-3 text-[13px] outline-none" />
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Text Color</label>
                            <div className="flex items-center gap-2 rounded border border-gray-300 px-2 h-10">
                              <input type="color" value={general.fontColor || "#333333"} onChange={(e) => setSec("general", "fontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] uppercase">{general.fontColor || "#333333"}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-medium text-gray-800">Label Color</label>
                          <div className="flex items-center gap-2 rounded border border-gray-300 px-2 h-10 w-full">
                            <input type="color" value={general.labelColor || "#334155"} onChange={(e) => setSec("general", "labelColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                            <span className="text-[12px] uppercase">{general.labelColor || "#334155"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("background")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Background</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.background ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.background && (
                      <div className="mt-6 space-y-6">
                        <div>
                          <label className="mb-2 block text-[13px] font-medium text-gray-800">Background Color</label>
                          <div className="flex items-center gap-2 rounded border border-gray-300 px-2 h-10">
                            <input type="color" value={general.backgroundColor || "#ffffff"} onChange={(e) => setSec("general", "backgroundColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                            <span className="text-[12px] uppercase">{general.backgroundColor || "#ffffff"}</span>
                          </div>
                        </div>
                        <div ref={bgMenuRef} className="relative">
                          <label className="mb-2 block text-[13px] font-medium text-gray-800">Position</label>
                          <button type="button" onClick={() => setBgOpen((v) => !v)} className={`flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-[14px] outline-none ${bgOpen ? "border-[#156372]" : "border-gray-300"}`}>
                            <span>{general.backgroundPosition || "Center center"}</span>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${bgOpen ? "rotate-180" : ""}`} />
                          </button>
                          {bgOpen && (
                            <div className="absolute z-30 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                              <div className="border-b border-gray-100 p-2">
                                <input value={bgQuery} onChange={(e) => setBgQuery(e.target.value)} placeholder="Search positions..." className="h-9 w-full rounded border border-gray-200 px-3 text-[13px] outline-none" />
                              </div>
                              <div className="max-h-[160px] overflow-auto py-1">
                                {bgOptions.map((pos) => (
                                  <button key={pos} type="button" onClick={() => { setSec("general", "backgroundPosition", pos); setBgOpen(false); }} className={`w-full px-4 py-2 text-left text-[14px] hover:bg-gray-50 ${general.backgroundPosition === pos ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}>
                                    {pos}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                          <input type="file" id="bg-upload" className="hidden" accept="image/*" onChange={(e) => handleBackgroundFile(e.target.files?.[0], "general", "backgroundImage")} />
                          <label htmlFor="bg-upload" className="cursor-pointer">
                            <Plus className="mx-auto mb-2 h-6 w-6 text-gray-400" />
                            <span className="text-[13px] font-medium text-[#156372]">Upload Background Image</span>
                            <p className="mt-1 text-[11px] text-gray-500">Max size 1MB. PDF Background only.</p>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
              {section === "header" ? (
                <>
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("header")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Header</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.header ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.header && (
                      <>
                        <div className="mt-6 space-y-6">
                          <div>
                            <label className="mb-2 block text-[13px] font-bold text-gray-800">Background Image</label>
                            {headerFooter.bgImage ? (
                              <div className="space-y-4">
                                <div className="rounded border border-orange-100 bg-orange-50 px-4 py-2 text-[12px] text-orange-700">
                                  Click Save to apply the selected background image
                                </div>
                                <div className="relative group overflow-hidden rounded-lg border border-gray-200">
                                  <img src={headerFooter.bgImage} alt="Header background" className="h-16 w-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setSec("headerFooter", "bgImage", null)}
                                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-500 shadow-sm hover:bg-white"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <button type="button" onClick={() => { setGalleryTarget("header"); setIsGalleryOpen(true); }} className="w-full rounded border border-gray-300 bg-white py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                                  Change from Gallery
                                </button>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-blue-200 p-6 text-center bg-[#f8fbff]">
                                <input type="file" id="header-bg-upload" className="hidden" accept="image/*" onChange={(e) => handleBackgroundFile(e.target.files?.[0], "headerFooter", "bgImage")} />
                                <label htmlFor="header-bg-upload" className="cursor-pointer flex flex-col items-center">
                                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                    <Plus className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <span className="text-[14px] font-medium text-gray-800">Drag and drop or <span className="text-blue-600">Upload file</span></span>
                                  <p className="mt-1 text-[12px] text-gray-500">Maximum size: 1 MB</p>
                                </label>
                                <button type="button" onClick={() => { setGalleryTarget("header"); setIsGalleryOpen(true); }} className="mt-4 rounded border border-gray-300 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                                  Choose from Gallery
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 flex items-center gap-2 text-[13px] font-bold text-gray-800">
                              <input type="checkbox" checked={!!headerFooter.headerBgColor} onChange={(e) => setSec("headerFooter", "headerBgColor", e.target.checked ? "#ffffff" : null)} className="rounded border-gray-300" />
                              Background Color
                            </label>
                            <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2">
                              <input type="color" value={headerFooter.headerBgColor || "#ffffff"} onChange={(e) => setSec("headerFooter", "headerBgColor", e.target.value)} disabled={!headerFooter.headerBgColor} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{headerFooter.headerBgColor || "#ffffff"}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("footer")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Footer</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.footer ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.footer && (
                      <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-bold text-gray-800">Font Size</label>
                            <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                              <input type="number" value={headerFooter.footerFontSize || 8} onChange={(e) => setSec("headerFooter", "footerFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                              <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-bold text-gray-800">Font Color</label>
                            <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2">
                              <input type="color" value={headerFooter.footerFontColor || "#6C718A"} onChange={(e) => setSec("headerFooter", "footerFontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{headerFooter.footerFontColor || "#6C718A"}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="mb-2 block text-[13px] font-bold text-gray-800">Background Image</label>
                          {headerFooter.footerBgImage ? (
                            <div className="space-y-4">
                              <div className="rounded border border-orange-100 bg-orange-50 px-4 py-2 text-[12px] text-orange-700">
                                Click Save to apply the selected background image
                              </div>
                              <div className="relative group overflow-hidden rounded-lg border border-gray-200">
                                <img src={headerFooter.footerBgImage} alt="Footer background" className="h-16 w-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => setSec("headerFooter", "footerBgImage", null)}
                                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-500 shadow-sm hover:bg-white"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <button type="button" onClick={() => { setGalleryTarget("footer"); setIsGalleryOpen(true); }} className="w-full rounded border border-gray-300 bg-white py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                                Change from Gallery
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-blue-200 p-6 text-center bg-[#f8fbff]">
                              <input type="file" id="footer-bg-upload" className="hidden" accept="image/*" onChange={(e) => handleBackgroundFile(e.target.files?.[0], "headerFooter", "footerBgImage")} />
                              <label htmlFor="footer-bg-upload" className="cursor-pointer flex flex-col items-center">
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                  <Plus className="h-5 w-5 text-blue-600" />
                                </div>
                                <span className="text-[14px] font-medium text-gray-800">Drag and drop or <span className="text-blue-600">Upload file</span></span>
                                <p className="mt-1 text-[12px] text-gray-500">Maximum size: 1 MB</p>
                              </label>
                              <button type="button" onClick={() => { setGalleryTarget("footer"); setIsGalleryOpen(true); }} className="mt-4 rounded border border-gray-300 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                                Choose from Gallery
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-[13px] font-bold text-gray-800">
                            <input type="checkbox" checked={!!headerFooter.footerBgColor} onChange={(e) => setSec("headerFooter", "footerBgColor", e.target.checked ? "#ffffff" : null)} className="rounded border-gray-300" />
                            Background Color
                          </label>
                          <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2">
                            <input type="color" value={headerFooter.footerBgColor || "#ffffff"} onChange={(e) => setSec("headerFooter", "footerBgColor", e.target.value)} disabled={!headerFooter.footerBgColor} className="h-6 w-6 border-none bg-transparent" />
                            <span className="text-[12px] text-gray-600 uppercase">{headerFooter.footerBgColor || "#ffffff"}</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-[13px] font-bold text-gray-800">
                            <input type="checkbox" checked={headerFooter.showPageNumber !== false} onChange={(e) => setSec("headerFooter", "showPageNumber", e.target.checked)} className="rounded border-gray-300" />
                            Page Number
                          </label>
                        </div>
                        
                        {headerFooter.showPageNumber !== false && (
                          <>
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Page Number Position</label>
                              <select value={headerFooter.pageNumberPosition || "Right"} onChange={(e) => setSec("headerFooter", "pageNumberPosition", e.target.value)} className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]">
                                <option>Left</option>
                                <option>Center</option>
                                <option>Right</option>
                              </select>
                            </div>

                          </>
                        )}
                        
                      </div>
                    )}
                  </div>
                </>
              ) : null}
              {section === "details" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Organization Details */}
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("orgDetails")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Organization Details</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.orgDetails ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.orgDetails && (
                      <div className="mt-6 space-y-6">
                        <label className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                          <input type="checkbox" checked={visibleFor(draft.config.transactionDetails, "showOrgLogo")} onChange={(e) => setSec("transactionDetails", "showOrgLogo", e.target.checked)} className="rounded border-gray-300" />
                          Show Organization Logo
                        </label>
                        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                          <input type="file" id="org-logo-upload" className="hidden" accept="image/*" onChange={(e) => handleBackgroundFile(e.target.files?.[0], "transactionDetails", "orgLogo")} />
                          <label htmlFor="org-logo-upload" className="cursor-pointer flex flex-col items-center">
                            <Plus className="mx-auto mb-2 h-5 w-5 text-gray-400" />
                            <span className="text-[13px] font-medium text-[#156372]">Upload your Files</span>
                          </label>
                        </div>
                        <label className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                          <input type="checkbox" checked={visibleFor(draft.config.transactionDetails, "showOrgName")} onChange={(e) => setSec("transactionDetails", "showOrgName", e.target.checked)} className="rounded border-gray-300" />
                          Show Organization Name
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Color</label>
                            <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2">
                              <input type="color" value={draft.config.transactionDetails.orgNameColor || "#333333"} onChange={(e) => setSec("transactionDetails", "orgNameColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{draft.config.transactionDetails.orgNameColor || "#333333"}</span>
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                            <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                              <input type="number" value={draft.config.transactionDetails.orgNameFontSize || 10} onChange={(e) => setSec("transactionDetails", "orgNameFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                              <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                            </div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                          <input type="checkbox" checked={visibleFor(draft.config.transactionDetails, "showOrgAddress")} onChange={(e) => setSec("transactionDetails", "showOrgAddress", e.target.checked)} className="rounded border-gray-300" />
                          Show Organization Address
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Customer Details */}
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("custDetails")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Customer Details</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.custDetails ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.custDetails && (
                      <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Color</label>
                            <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2">
                              <input type="color" value={draft.config.transactionDetails.custNameColor || "#333333"} onChange={(e) => setSec("transactionDetails", "custNameColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{draft.config.transactionDetails.custNameColor || "#333333"}</span>
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                            <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                              <input type="number" value={draft.config.transactionDetails.custNameFontSize || 9} onChange={(e) => setSec("transactionDetails", "custNameFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                              <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-gray-700">
                            <input type="checkbox" checked={visibleFor(headerFooter.labels, "billToField")} onChange={(e) => setSec("headerFooter.labels", "billToField", { ...headerFooter.labels.billToField, visible: e.target.checked })} className="rounded border-gray-300" />
                            Bill To
                          </label>
                          <input value={labelFor(headerFooter.labels, "billToField", "Bill To")} onChange={(e) => setSec("headerFooter.labels", "billToField", { ...headerFooter.labels.billToField, label: e.target.value })} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" />
                        </div>
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-gray-700">
                            <input type="checkbox" checked={visibleFor(headerFooter.labels, "shipToField")} onChange={(e) => setSec("headerFooter.labels", "shipToField", { ...headerFooter.labels.shipToField, visible: e.target.checked })} className="rounded border-gray-300" />
                            Ship To
                          </label>
                          <input value={labelFor(headerFooter.labels, "shipToField", "Ship To")} onChange={(e) => setSec("headerFooter.labels", "shipToField", { ...headerFooter.labels.shipToField, label: e.target.value })} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Details */}
                  <div className="border-b border-slate-100 px-6 py-4">
                    <button type="button" onClick={() => toggleBlock("docDetails")} className="flex w-full items-center justify-between text-left">
                      <h4 className="text-[16px] font-bold text-gray-900">Document Details</h4>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${openBlocks.docDetails ? "rotate-180" : ""}`} />
                    </button>
                    {openBlocks.docDetails && (
                      <div className="mt-6 space-y-6">
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-gray-700">
                            <input type="checkbox" checked={visibleFor(headerFooter, "showDocumentTitle")} onChange={(e) => setSec("headerFooter", "showDocumentTitle", e.target.checked)} className="rounded border-gray-300" />
                            Show Document Title
                          </label>
                          <input value={headerFooter.documentTitle || ""} onChange={(e) => setSec("headerFooter", "documentTitle", e.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" placeholder="Quote" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                            <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                              <input type="number" value={headerFooter.titleFontSize || 28} onChange={(e) => setSec("headerFooter", "titleFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                              <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Color</label>
                            <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2">
                              <input type="color" value={headerFooter.titleFontColor || "#000000"} onChange={(e) => setSec("headerFooter", "titleFontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{headerFooter.titleFontColor || "#000000"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Phone</label>
                            <input value={headerFooter.phoneLabel || "Phone"} onChange={(e) => setSec("headerFooter", "phoneLabel", e.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" />
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-medium text-gray-800">Fax Number</label>
                            <input value={headerFooter.faxLabel || "Fax"} onChange={(e) => setSec("headerFooter", "faxLabel", e.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h5 className="text-[14px] font-bold text-gray-900">Document Information</h5>
                          <div className="space-y-3">
                            {[
                              { key: "numberField", default: "#", path: "headerFooter.labels" },
                              { key: "dateField", default: "Quote Date", path: "headerFooter.labels" },
                              { key: "expiryDate", default: "Expiry Date", path: "headerFooter.labels" },
                              { key: "referenceField", default: "Reference#", path: "headerFooter.labels" },
                              { key: "salesperson", default: "Sales person", path: "headerFooter.labels" },
                              { key: "project", default: "Project Name", path: "headerFooter.labels" },
                              { key: "subject", default: "Description", path: "headerFooter.labels" },
                            ].map((item) => (
                              <div key={item.key} className="flex items-center gap-3">
                                <input type="checkbox" checked={visibleFor(headerFooter.labels, item.key)} onChange={(e) => setSec("headerFooter.labels", item.key, { ...headerFooter.labels[item.key], visible: e.target.checked })} className="rounded border-gray-300" />
                                <input value={labelFor(headerFooter.labels, item.key, item.default)} onChange={(e) => setSec("headerFooter.labels", item.key, { ...headerFooter.labels[item.key], label: e.target.value })} className="flex-1 h-9 rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#156372]" />
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              ) : null}
               {section === "table" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-slate-100 p-6 pb-0">
                    <h3 className="mb-6 text-[18px] font-bold text-gray-900">Table Properties</h3>
                    <div className="flex gap-1 rounded-full bg-slate-100 p-1 mb-6">
                      <button type="button" onClick={() => setTableSubTab("labels")} className={`flex-1 rounded-full py-2 text-[13px] font-medium transition-all ${tableSubTab === "labels" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Labels</button>
                      <button type="button" onClick={() => setTableSubTab("layout")} className={`flex-1 rounded-full py-2 text-[13px] font-medium transition-all ${tableSubTab === "layout" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Layout</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {tableSubTab === "labels" ? (
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-[auto_1fr_1fr] gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                          <div className="w-6"></div>
                          <div>Field</div>
                          <div className="grid grid-cols-[60px_1fr] gap-4">
                            <div>Width(%)</div>
                            <div>Label</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {[
                            { key: "lineNumber", label: "Line Item Number", default: "#", width: 5 },
                            { key: "item", label: "Item", default: "Item", width: 30 },
                            { key: "description", label: "Description", default: "Description", noWidth: true },
                          ].map((field) => (
                            <div key={field.key} className="grid grid-cols-[auto_1fr_1fr] gap-4 items-center">
                              <input type="checkbox" checked={visibleFor(table.labels, field.key)} onChange={(e) => setSec("table.labels", field.key, { ...table.labels[field.key], visible: e.target.checked })} className="rounded border-gray-300" />
                              <span className="text-[13px] font-medium text-gray-700">{field.label}</span>
                              <div className={`grid gap-4 ${field.noWidth ? "" : "grid-cols-[60px_1fr]"}`}>
                                {!field.noWidth && (
                                  <input type="number" value={table.labels?.[field.key]?.width || field.width} onChange={(e) => setSec("table.labels", field.key, { ...table.labels[field.key], width: Number(e.target.value) })} className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-[13px] outline-none" />
                                )}
                                <input value={labelFor(table.labels, field.key, field.default)} onChange={(e) => setSec("table.labels", field.key, { ...table.labels[field.key], label: e.target.value })} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none" />
                              </div>
                            </div>
                          ))}
                          
                          <button type="button" className="w-full flex items-center justify-center gap-2 py-2 rounded border border-gray-200 bg-slate-50 text-[13px] font-medium text-gray-700 hover:bg-slate-100">
                            <Settings2 className="h-4 w-4 text-blue-600" />
                            Customize Item Name & Description
                          </button>

                          {[
                            { key: "customFields", label: "Custom Fields", default: "Custom Field Label", width: 11 },
                            { key: "quantity", label: "Quantity", default: "Qty", width: 11, hasUnit: true },
                            { key: "rate", label: "Rate", default: "Rate", width: 11 },
                            { key: "taxPercent", label: "Tax (%)", default: "VAT %", width: 11 },
                            { key: "taxAmount", label: "Tax Amount", default: "VAT", width: 11 },
                            { key: "discount", label: "Discount", default: "Discount", width: 11 },
                            { key: "amount", label: "Amount", default: "Amount", width: 15, hasAddTax: true },
                          ].map((field) => (
                            <div key={field.key} className="space-y-2">
                              <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-center">
                                <input type="checkbox" checked={visibleFor(table.labels, field.key)} onChange={(e) => setSec("table.labels", field.key, { ...table.labels[field.key], visible: e.target.checked })} className="rounded border-gray-300" />
                                <span className="text-[13px] font-medium text-gray-700">{field.label}</span>
                                <div className="grid grid-cols-[60px_1fr] gap-4">
                                  <input type="number" value={table.labels?.[field.key]?.width || field.width} onChange={(e) => setSec("table.labels", field.key, { ...table.labels[field.key], width: Number(e.target.value) })} className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-[13px] outline-none" />
                                  <input value={labelFor(table.labels, field.key, field.default)} onChange={(e) => setSec("table.labels", field.key, { ...table.labels[field.key], label: e.target.value })} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none" />
                                </div>
                              </div>
                              {field.hasUnit && (
                                <div className="ml-10">
                                  <label className="flex items-center gap-2 text-[13px] text-gray-600">
                                    <input type="checkbox" checked={table.showUnit !== false} onChange={(e) => setSec("table", "showUnit", e.target.checked)} className="rounded border-gray-300" />
                                    Show Unit
                                  </label>
                                </div>
                              )}
                              {field.hasAddTax && (
                                <div className="ml-10">
                                  <label className="flex items-center gap-2 text-[13px] text-gray-600">
                                    <input type="checkbox" checked={table.addTaxToAmount === true} onChange={(e) => setSec("table", "addTaxToAmount", e.target.checked)} className="rounded border-gray-300" />
                                    Add tax to amount
                                  </label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 space-y-8">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-[13px] font-bold text-gray-900 uppercase">Table Border</h5>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={table.showBorder !== false} onChange={(e) => setSec("table", "showBorder", e.target.checked)} className="rounded border-gray-300" />
                              <div className="flex h-9 items-center gap-2 rounded border border-gray-300 px-2 bg-white w-32">
                                <input type="color" value={table.borderColor || "#adadad"} onChange={(e) => setSec("table", "borderColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                <span className="text-[12px] text-gray-600 uppercase">{table.borderColor || "#adadad"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h5 className="text-[14px] font-bold text-gray-900">Table Header</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                              <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                                <input type="number" value={table.headerFontSize || 9} onChange={(e) => setSec("table", "headerFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                                <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Background Color</label>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={table.showHeaderBg !== false} onChange={(e) => setSec("table", "showHeaderBg", e.target.checked)} className="rounded border-gray-300" />
                                <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2 bg-white">
                                  <input type="color" value={table.headerBgColor || "#3c3d3a"} onChange={(e) => setSec("table", "headerBgColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                  <span className="text-[12px] text-gray-600 uppercase">{table.headerBgColor || "#3c3d3a"}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Color</label>
                              <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2 bg-white">
                                <input type="color" value={table.headerFontColor || "#ffffff"} onChange={(e) => setSec("table", "headerFontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                <span className="text-[12px] text-gray-600 uppercase">{table.headerFontColor || "#ffffff"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-gray-100">
                          <h5 className="text-[14px] font-bold text-gray-900">Item Row</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                              <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                                <input type="number" value={table.rowFontSize || 9} onChange={(e) => setSec("table", "rowFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                                <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Background Color</label>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={table.showRowBg !== false} onChange={(e) => setSec("table", "showRowBg", e.target.checked)} className="rounded border-gray-300" />
                                <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2 bg-white">
                                  <input type="color" value={table.rowBgColor || "#ffffff"} onChange={(e) => setSec("table", "rowBgColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                  <span className="text-[12px] text-gray-600 uppercase">{table.rowBgColor || "#ffffff"}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Color</label>
                              <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2 bg-white">
                                <input type="color" value={table.rowFontColor || "#000000"} onChange={(e) => setSec("table", "rowFontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                <span className="text-[12px] text-gray-600 uppercase">{table.rowFontColor || "#000000"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-gray-100">
                          <h5 className="text-[14px] font-bold text-gray-900">Item Description</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Size</label>
                              <div className="flex h-10 items-center overflow-hidden rounded border border-gray-300 bg-white">
                                <input type="number" value={table.descFontSize || 8} onChange={(e) => setSec("table", "descFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                                <div className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">pt</div>
                              </div>
                            </div>
                            <div>
                              <label className="mb-2 block text-[13px] font-medium text-gray-800">Font Color</label>
                              <div className="flex h-10 w-full items-center gap-2 rounded border border-gray-300 px-2 bg-white">
                                <input type="color" value={table.descFontColor || "#333333"} onChange={(e) => setSec("table", "descFontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                <span className="text-[12px] text-gray-600 uppercase">{table.descFontColor || "#333333"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {section === "total" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-slate-100 p-6 pb-0">
                    <h3 className="mb-6 text-[18px] font-bold text-gray-900">Total Section</h3>
                    <div className="flex gap-1 rounded-full bg-slate-100 p-1 mb-6">
                      <button type="button" onClick={() => setTotalSubTab("labels")} className={`flex-1 rounded-full py-2 text-[13px] font-medium transition-all ${totalSubTab === "labels" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Labels</button>
                      <button type="button" onClick={() => setTotalSubTab("layout")} className={`flex-1 rounded-full py-2 text-[13px] font-medium transition-all ${totalSubTab === "layout" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Layout</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {totalSubTab === "labels" ? (
                      <div className="p-6 space-y-6">
                        <label className="flex items-center gap-3 text-[14px] font-medium text-gray-900">
                          <input type="checkbox" checked={total.showSection !== false} onChange={(e) => setSec("total", "showSection", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                          Show Total Section
                        </label>

                        <div className="space-y-4 pt-4">
                          {[
                            { key: "subTotal", label: "Sub Total", default: "Sub Total" },
                            { key: "shipping", label: "Shipping Charges", default: "Shipping charge" },
                            { key: "discount", label: "Discount", default: "Discount", hasInfo: true },
                            { key: "taxableAmount", label: "Total Taxable Amount", default: "Total Taxable Amount", hasInfo: true },
                          ].map((field) => (
                            <div key={field.key} className="grid grid-cols-[1fr_1.5fr] gap-4 items-center">
                              <label className="flex items-center gap-3 text-[13px] font-medium text-gray-700">
                                <input type="checkbox" checked={visibleFor(total.labels, field.key)} onChange={(e) => setSec("total.labels", field.key, { ...total.labels[field.key], visible: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                                {field.label}
                                {field.hasInfo && <div className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">i</div>}
                              </label>
                              <input value={labelFor(total.labels, field.key, field.default)} onChange={(e) => setSec("total.labels", field.key, { ...total.labels[field.key], label: e.target.value })} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none" />
                            </div>
                          ))}

                          <label className="flex items-center gap-3 text-[13px] font-medium text-gray-700 pt-2">
                            <input type="checkbox" checked={total.showTaxDetails !== false} onChange={(e) => setSec("total", "showTaxDetails", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                            Show Tax Details
                          </label>

                          <div className="grid grid-cols-[1fr_1.5fr] gap-4 items-center pt-2">
                            <label className="flex items-center gap-3 text-[13px] font-medium text-gray-700">
                              <input type="checkbox" checked={visibleFor(total.labels, "total")} onChange={(e) => setSec("total.labels", "total", { ...total.labels.total, visible: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                              Total
                            </label>
                            <input value={labelFor(total.labels, "total", "Total")} onChange={(e) => setSec("total.labels", "total", { ...total.labels.total, label: e.target.value })} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none" />
                          </div>

                          <div className="grid grid-cols-[1fr_1.5fr] gap-4 items-center">
                            <label className="flex items-center gap-3 text-[13px] font-medium text-gray-700">
                              <input type="checkbox" checked={total.showCurrency !== false} onChange={(e) => setSec("total", "showCurrency", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                              Currency Symbol
                            </label>
                            <select value={total.currencyPosition || "before"} onChange={(e) => setSec("total", "currencyPosition", e.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none">
                              <option value="before">Before amount</option>
                              <option value="after">After amount</option>
                            </select>
                          </div>

                          <div className="space-y-4 pt-6 border-t border-gray-100">
                            <label className="flex items-center gap-3 text-[13px] font-medium text-gray-700">
                              <input type="checkbox" checked={total.showQuantity === true} onChange={(e) => setSec("total", "showQuantity", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                              Show Quantity
                            </label>
                            <label className="flex items-center gap-3 text-[13px] font-medium text-gray-700">
                              <input type="checkbox" checked={total.showAmountInWords === true} onChange={(e) => setSec("total", "showAmountInWords", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#156372]" />
                              Show amount in words
                              <div className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">i</div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 space-y-8">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[14px] font-bold text-gray-900">Total(Subtotal, Tax)</h5>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[13px] font-medium text-gray-700">Font Size</label>
                              <div className="flex h-9 items-center overflow-hidden rounded border border-gray-300 bg-white w-24">
                                <input type="number" value={total.fontSize || 9} onChange={(e) => setSec("total", "fontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                                <div className="border-l border-gray-300 bg-gray-50 px-2 py-2 text-[11px] text-gray-500">pt</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[13px] font-medium text-gray-700">Font Color</label>
                              <div className="flex h-9 items-center gap-2 rounded border border-gray-300 px-2 bg-white w-32">
                                <input type="color" value={total.fontColor || "#000000"} onChange={(e) => setSec("total", "fontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                <span className="text-[12px] text-gray-600 uppercase">{total.fontColor || "#000000"}</span>
                                <div className="h-full w-px bg-gray-300 mx-1" />
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="text-[13px] font-medium text-gray-700 w-[110px]">Background Color</label>
                            <input type="checkbox" checked={total.showBg !== false} onChange={(e) => setSec("total", "showBg", e.target.checked)} className="rounded border-gray-300" />
                            <div className="flex h-9 items-center gap-2 rounded border border-gray-300 px-2 bg-white w-48">
                              <input type="color" value={total.bgColor || "#ffffff"} onChange={(e) => setSec("total", "bgColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{total.bgColor || "#ffffff"}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <div className="h-full w-px bg-gray-300 mx-1" />
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t border-gray-100">
                          <h5 className="text-[14px] font-bold text-gray-900">Balance Due</h5>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[13px] font-medium text-gray-700">Font Size</label>
                              <div className="flex h-9 items-center overflow-hidden rounded border border-gray-300 bg-white w-24">
                                <input type="number" value={total.balanceFontSize || 9} onChange={(e) => setSec("total", "balanceFontSize", Number(e.target.value))} className="h-full w-full border-none px-3 text-[13px] outline-none" />
                                <div className="border-l border-gray-300 bg-gray-50 px-2 py-2 text-[11px] text-gray-500">pt</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[13px] font-medium text-gray-700">Font Color</label>
                              <div className="flex h-9 items-center gap-2 rounded border border-gray-300 px-2 bg-white w-32">
                                <input type="color" value={total.balanceFontColor || "#000000"} onChange={(e) => setSec("total", "balanceFontColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                                <span className="text-[12px] text-gray-600 uppercase">{total.balanceFontColor || "#000000"}</span>
                                <div className="h-full w-px bg-gray-300 mx-1" />
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="text-[13px] font-medium text-gray-700 w-[110px]">Background Color</label>
                            <input type="checkbox" checked={total.showBalanceBg !== false} onChange={(e) => setSec("total", "showBalanceBg", e.target.checked)} className="rounded border-gray-300" />
                            <div className="flex h-9 items-center gap-2 rounded border border-gray-300 px-2 bg-white w-48">
                              <input type="color" value={total.balanceBgColor || "#f5f4f3"} onChange={(e) => setSec("total", "balanceBgColor", e.target.value)} className="h-6 w-6 border-none bg-transparent" />
                              <span className="text-[12px] text-gray-600 uppercase">{total.balanceBgColor || "#f5f4f3"}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <div className="h-full w-px bg-gray-300 mx-1" />
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {section === "module" ? <div className="space-y-3 p-5">{Object.keys(moduleSpecific).length === 0 ? <p className="text-[13px] text-slate-600">No module-specific options for this template type yet.</p> : Object.entries(moduleSpecific).map(([key, value]) => typeof value === "boolean" ? <label key={key} className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={value} onChange={(e) => setModule(key, e.target.checked)} />{key}</label> : <input key={key} value={String(value)} onChange={(e) => setModule(key, e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#156372]" />)}</div> : null}
            </div>
          </div>

          <div className="min-w-0 overflow-auto bg-[#ebeef3] p-10">
            <div
              className="relative mx-auto rounded border border-gray-200 bg-white shadow-xl overflow-hidden transition-all duration-300"
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                fontFamily: general.pdfFont || "Helvetica",
              }}
            >
              <div
                style={{
                  width: `${orientation === "portrait" ? PAPER_SIZES.A4.width : PAPER_SIZES.A4.height}px`,
                  height: `${orientation === "portrait" ? PAPER_SIZES.A4.height : PAPER_SIZES.A4.width}px`,
                  transform: `scale(${previewWidth / (orientation === "portrait" ? PAPER_SIZES.A4.width : PAPER_SIZES.A4.height)})`,
                  transformOrigin: "top left",
                }}
              >
              <div className="h-full w-full overflow-hidden flex flex-col" style={{ fontFamily: general.pdfFont || "Helvetica", backgroundColor: general.backgroundColor || "#ffffff", backgroundImage: general.backgroundImage ? `url(${general.backgroundImage})` : "none", backgroundPosition: general.backgroundPosition || "center center", backgroundRepeat: "no-repeat", backgroundSize: "contain", color: general.fontColor || "#111827" }}>
                {/* Header Bar */}
                {(headerFooter.headerBgColor || headerFooter.bgImage) ? (
                  <div style={{ 
                    backgroundColor: headerFooter.headerBgColor || "transparent", 
                    backgroundImage: headerFooter.bgImage ? `url(${headerFooter.bgImage})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    height: "40px",
                    flexShrink: 0 
                  }} />
                ) : null}
                <div
                  style={{
                    paddingTop: (headerFooter.headerBgColor || headerFooter.bgImage) ? "20px" : `${margins.top * 96}px`,
                    paddingBottom: (headerFooter.footerBgColor || headerFooter.footerBgImage || headerFooter.showPageNumber !== false) ? "20px" : `${margins.bottom * 96}px`,
                    paddingLeft: `${margins.left * 96}px`,
                    paddingRight: `${margins.right * 96}px`,
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                {/* DESIGN SELECTOR */}
                {(() => {
                  const label = moduleLabel.toLowerCase();
                  const isRetainer = label.includes("retainer invoice") && !label.includes("payment");
                  const isSalesReceipt = label === "sales receipts" || label === "sales receipt";
                  const isPaymentReceipt = (label.includes("receipt") || label.includes("payment")) && !isSalesReceipt;

                  if (isRetainer) {
                    return (
                      <>
                        {/* Retainer Invoice Header */}
                        <div className="flex justify-between mb-12 mt-4">
                          <div style={{ maxWidth: "46%" }}>
                            <div style={{ fontSize: "16px", fontWeight: "700", color: theme.accent, marginBottom: "3px" }}>
                              {organization?.name || "Organization Name"}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }


                  if (isSalesReceipt) {
                    return (
                      <>
                        <div className="mb-6">
                          <div style={{ fontSize: "16px", fontWeight: "700", color: theme.accent, marginBottom: "3px" }}>
                            {organization?.name || "Organization Name"}
                          </div>
                          <div style={{ fontSize: "11px", color: general.fontColor || "#4b5563", lineHeight: "1.45" }}>
                            {organization?.address?.city || organization?.address?.country ? (
                              <>
                                {[organization.address.city, organization.address.country].filter(Boolean).join(", ")}
                                <br />
                              </>
                            ) : null}
                            {organization?.email || ""}
                          </div>
                        </div>
                        <hr style={{ border: "0", borderTop: "1px solid #e5e7eb", marginBottom: "32px" }} />
                        <div className="mb-10">
                          <h1 style={{ fontSize: "30px", fontWeight: "700", color: theme.accent, letterSpacing: "-0.02em" }}>
                            {headerFooter.documentTitle || "SALES RECEIPT"}
                          </h1>
                          <div style={{ fontSize: "14px", color: general.fontColor || "#4b5563", marginTop: "4px" }}>Sales Receipt# # SR-00042</div>
                        </div>
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: general.labelColor || "#111827", marginBottom: "8px" }}>
                              {labelFor(headerFooter.labels, "billToField", "Bill To")}
                            </div>
                            <div style={{ fontSize: "14px", color: "#2563eb", fontWeight: "500" }}>Rob & Joe Traders</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div className="flex justify-end gap-12 mb-2">
                              <span style={{ fontSize: "14px", color: general.labelColor || "#4b5563" }}>Receipt Date</span>
                              <span style={{ fontSize: "14px", color: general.fontColor || "#111827", fontWeight: "500" }}>27 Apr 2026</span>
                            </div>
                            <div className="flex justify-end gap-12">
                              <span style={{ fontSize: "14px", color: general.labelColor || "#4b5563" }}>Reference#</span>
                              <span style={{ fontSize: "14px", color: general.fontColor || "#111827", fontWeight: "500" }}>REF-001</span>
                            </div>
                          </div>
                        </div>
                        <div className="mb-8">
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", width: "48px" }}>#</th>
                                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase" }}>Item & Description</th>
                                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase" }}>Qty</th>
                                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase" }}>Rate</th>
                                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase" }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody style={{ fontSize: "14px" }}>
                              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "16px", color: "#4b5563", verticalAlign: "top" }}>1</td>
                                <td style={{ padding: "16px", verticalAlign: "top" }}>
                                  <div style={{ fontWeight: "500", color: "#111827" }}>Brochure Design</div>
                                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Sample description</div>
                                </td>
                                <td style={{ padding: "16px", textAlign: "right", color: "#111827", verticalAlign: "top" }}>1</td>
                                <td style={{ padding: "16px", textAlign: "right", color: "#111827", verticalAlign: "top" }}>SOS 500.00</td>
                                <td style={{ padding: "16px", textAlign: "right", color: "#111827", fontWeight: "500", verticalAlign: "top" }}>SOS 500.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between items-start pt-4">
                          <div style={{ width: "50%", padding: "16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px" }}>
                            <div className="flex justify-between items-center mb-2">
                              <span style={{ fontSize: "14px", color: "#4b5563" }}>Payment Mode</span>
                              <span style={{ fontSize: "14px", color: "#111827", fontWeight: "700" }}>Cash</span>
                            </div>
                            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "8px" }} className="flex justify-between items-center">
                              <span style={{ fontSize: "14px", color: "#4b5563" }}>Payment Made</span>
                              <span style={{ fontSize: "14px", color: "#047857", fontWeight: "700" }}>SOS 500.00</span>
                            </div>
                          </div>
                          <div style={{ width: "33%" }}>
                            <div style={{ marginBottom: "12px" }} className="flex justify-between">
                              <span style={{ fontSize: "14px", color: "#4b5563" }}>Sub Total</span>
                              <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>SOS 500.00</span>
                            </div>
                            <div style={{ marginBottom: "12px" }} className="flex justify-between">
                              <span style={{ fontSize: "14px", color: "#4b5563" }}>VAT (5%)</span>
                              <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>SOS 0.00</span>
                            </div>
                            <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: "12px" }} className="flex justify-between items-center">
                              <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>Total</span>
                              <span style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>SOS 500.00</span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  if (isPaymentReceipt) {
                    const ribbonConfig = (() => {
                      const s = "PAID";
                      return { label: s, color: "#10B981" };
                    })();

                    return (
                      <>
                        {/* Status Ribbon (Internal Preview Only) */}
                        <div style={{
                          position: "absolute",
                          top: "0",
                          left: "0",
                          width: "200px",
                          height: "200px",
                          overflow: "hidden",
                          zIndex: 10,
                          pointerEvents: "none"
                        }}>
                          <div style={{
                            position: "absolute",
                            top: "25px",
                            left: "-50px",
                            width: "200px",
                            backgroundColor: ribbonConfig.color,
                            color: "#ffffff",
                            textAlign: "center",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "6px 0",
                            transform: "rotate(-45deg)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                            textTransform: "uppercase",
                            letterSpacing: "1px"
                          }}>
                            {ribbonConfig.label}
                          </div>
                        </div>

                        {/* 3-Column Header Area */}
                        <div className="flex justify-between items-start mb-10 pb-8" style={{ borderBottom: `2px solid ${theme.accent}22` }}>
                          <div style={{ width: "33%" }}>
                            <div style={{ 
                              fontSize: "14pt", 
                              fontWeight: "700", 
                              color: theme.accent, 
                              marginBottom: "4px" 
                            }}>
                              {organization?.name || "HAYAT"}
                            </div>
                            <div style={{ fontSize: "10pt", color: "#6b7280", lineHeight: "1.5" }}>
                              {organization?.address?.city || "Somalia"}<br />
                              {organization?.email || "maxamed9885m@gmail.com"}
                            </div>
                          </div>

                          <div style={{ width: "33%", display: "flex", justifyContent: "center" }}>
                            <div style={{ padding: "8px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "4px" }}>
                              <img src={organization?.logo || "/qr-placeholder.png"} alt="QR" style={{ maxHeight: "60px", maxWidth: "120px", objectFit: "contain" }} />
                            </div>
                          </div>

                          <div style={{ width: "33%", textAlign: "right" }}>
                            <div style={{ 
                              fontSize: "28pt", 
                              fontWeight: "800", 
                              color: theme.accent,
                              textTransform: "uppercase", 
                              letterSpacing: "1px"
                            }}>
                              {headerFooter.documentTitle || "RECEIPT"}
                            </div>
                            <div style={{ fontSize: "12pt", fontWeight: "700", color: "#111827", marginTop: "-4px" }}>
                              Receipt# PR-000042
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-start mb-10">
                          <div style={{ width: "320px" }}>
                            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase" }}>Received From</div>
                            <div style={{ fontSize: "16pt", color: "#2563eb", fontWeight: "700" }}>Rob & Joe Traders</div>
                          </div>
                          <div style={{ 
                            backgroundColor: theme.accent || "#ef4444", 
                            color: "#ffffff", 
                            padding: "24px", 
                            borderRadius: "12px",
                            textAlign: "center",
                            minWidth: "220px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                          }}>
                            <div style={{ fontSize: "11pt", fontWeight: "600", marginBottom: "4px", opacity: 0.9 }}>Amount Received</div>
                            <div style={{ fontSize: "24pt", fontWeight: "800" }}>SOS 500.00</div>
                          </div>
                        </div>

                        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "24px" }}>
                          <div style={{ fontSize: "12pt", fontWeight: "700", color: "#111827", marginBottom: "12px" }}>Payment Details</div>
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <div className="flex justify-between border-b border-gray-100 py-1">
                                <span style={{ fontSize: "11px", color: "#6b7280" }}>Payment Date</span>
                                <span style={{ fontSize: "11px", fontWeight: "600" }}>27 Apr 2026</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-100 py-1">
                                <span style={{ fontSize: "11px", color: "#6b7280" }}>Payment Mode</span>
                                <span style={{ fontSize: "11px", fontWeight: "600" }}>Cash</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between border-b border-gray-100 py-1">
                                <span style={{ fontSize: "11px", color: "#6b7280" }}>Reference Number</span>
                                <span style={{ fontSize: "11px", fontWeight: "600" }}>REF-001</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

        // Default "Standard" Design (Quotes, Invoices, etc.)
        const details = draft.config.transactionDetails || {};
        const labels = headerFooter.labels || {};
        return (
          <>
            {/* Status Ribbon (DRAFT) */}
            <div style={{
              position: "absolute",
              top: "0",
              left: "0",
              width: "200px",
              height: "200px",
              overflow: "hidden",
              zIndex: 10,
              pointerEvents: "none"
            }}>
              <div style={{
                position: "absolute",
                top: "40px",
                left: "-60px",
                width: "200px",
                height: "30px",
                backgroundColor: "#6B7280",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600",
                transform: "rotate(-45deg)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}>
                DRAFT
              </div>
            </div>

            {/* Header Area */}
            <div className="flex items-start justify-between mb-10">
              <div style={{ width: "33%" }}>
                {visibleFor(details, "showOrgName") && (
                  <div style={{ 
                    fontSize: `${details.orgNameFontSize || 14}pt`, 
                    fontWeight: "700", 
                    color: details.orgNameColor || "#111827", 
                    marginBottom: "4px" 
                  }}>
                    {organization?.name || "HAYAT"}
                  </div>
                )}
                <div style={{ fontSize: "11px", color: general.labelColor || "#6b7280", lineHeight: "1.5" }}>
                  Somalia<br />
                  maxamed9885m@gmail.com
                </div>
              </div>
              
              <div style={{ width: "33%", display: "flex", justifyContent: "center" }}>
                {visibleFor(details, "showOrgLogo") && (details.orgLogo || organization?.logo) && (
                  <div style={{ padding: "8px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "4px" }}>
                    <img src={details.orgLogo || organization?.logo} alt="Logo" style={{ maxHeight: "60px", maxWidth: "120px", objectFit: "contain" }} />
                  </div>
                )}
              </div>

              <div style={{ width: "33%", textAlign: "right" }}>
                <div style={{ 
                  fontSize: `${headerFooter.titleFontSize || 32}pt`, 
                  fontWeight: "300", 
                  textTransform: "uppercase", 
                  letterSpacing: "1px",
                  color: headerFooter.titleFontColor || "#111827" 
                }}>
                  {labelFor(labels, "docTitle", "QUOTE")}
                </div>
                <div style={{ fontSize: "14pt", fontWeight: "700", color: general.fontColor || "#111827", marginTop: "-4px" }}>
                  {labelFor(labels, "numberField", "Quotes#")} {labelFor(labels, "numberPrefix", "QU")}-17
                </div>
                <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
                  Phone: 000-000-0000<br />
                  Fax: 000-000-0000
                </div>
              </div>
            </div>

            {/* Bill To & Date Area */}
            <div className="mb-8" style={{ borderBottom: `1px solid ${general.borderColor || "#e5e7eb"}`, paddingBottom: "12px" }}>
              <div className="flex justify-between items-end">
                <div>
                  <div style={{ fontSize: "11pt", color: general.labelColor || "#6b7280", fontWeight: "600", marginBottom: "6px" }}>
                    {labelFor(labels, "billToField", "Bill To")}
                  </div>
                  <div style={{ 
                    fontSize: `${details.custNameFontSize || 14}pt`, 
                    color: details.custNameColor || "#2563eb", 
                    fontWeight: "600", 
                    lineHeight: "1.2"
                  }}>ESPRESSO Isma</div>
                </div>
                <div style={{ textAlign: "right", fontSize: "11pt", color: general.fontColor || "#111827", fontWeight: "400" }}>
                  27 Apr 2026
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: table.showHeaderBg !== false ? (table.headerBgColor || "#f97316") : "transparent",
                    color: table.headerFontColor || "#ffffff"
                  }}>
                    {visibleFor(table.labels, "lineNumber") && (
                      <th style={{ padding: "12px 16px", textAlign: "center", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "5%" }}>#</th>
                    )}
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "45%" }}>Item & Description</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "15%" }}>Qty</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "15%" }}>Rate</th>
                    {visibleFor(table.labels, "taxPercent") && (
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "10%" }}>VAT %</th>
                    )}
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: `${table.headerFontSize || 10}pt`, fontWeight: "600", width: "10%" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 1, name: "Brochure Design", desc: "Brochure Design Single Sided Color", qty: 1, rate: 300, amount: 300 },
                    { id: 2, name: "Web Design Package - Basic", desc: "Custom themes for your business", qty: 1, rate: 250, amount: 250 },
                    { id: 3, name: "Print Ad - Basic - Color", desc: "Print Ad 1/2 size Color", qty: 1, rate: 80, amount: 80 }
                  ].map((row, idx) => (
                    <tr key={row.id} style={{ 
                      backgroundColor: (idx % 2 === 0) ? (table.rowBgColor || "transparent") : (table.altRowBgColor || "transparent"),
                      borderBottom: `1px solid ${table.borderColor || "#f3f4f6"}`
                    }}>
                      {visibleFor(table.labels, "lineNumber") && (
                        <td style={{ padding: "12px 16px", textAlign: "center", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{idx + 1}</td>
                      )}
                      <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "600", color: table.rowFontColor || "#2563eb", fontSize: "10pt" }}>{row.name}</div>
                        <div style={{ fontSize: "9pt", color: "#6b7280", marginTop: "2px" }}>{row.desc}</div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>
                        <div>{row.qty.toFixed(2)}</div>
                        <div style={{ fontSize: "8pt", color: "#9ca3af" }}>Unit</div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{row.rate.toFixed(2)}</td>
                      {visibleFor(table.labels, "taxPercent") && (
                        <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>5%</td>
                      )}
                      <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "top", color: table.rowFontColor || "#111827", fontSize: "10pt" }}>{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-10">
              <div style={{ 
                width: "360px", 
                backgroundColor: total.showBg !== false ? (total.bgColor || "#ef4444") : "transparent",
                padding: "24px", 
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
              }}>
                <div className="flex justify-between py-2 items-center">
                  <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#4b5563"), fontWeight: "600" }}>Sub Total</span>
                  <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#111827"), fontWeight: "700" }}>SOS 1,283.00</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#4b5563"), fontWeight: "600" }}>Tax (Included)</span>
                  <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#111827"), fontWeight: "700" }}>20.97</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#4b5563"), fontWeight: "600" }}>Shipping charge</span>
                  <span style={{ fontSize: `${total.fontSize || 11}pt`, color: total.showBg !== false ? "#ffffff" : (total.fontColor || "#111827"), fontWeight: "700" }}>44.00</span>
                </div>
                <div style={{ margin: "16px 0", borderTop: "1px solid rgba(255,255,255,0.2)" }} />
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: `${(total.fontSize || 12) + 2}pt`, fontWeight: "800", color: "#ffffff", textTransform: "uppercase" }}>Total</span>
                  <span style={{ fontSize: `${(total.fontSize || 12) + 2}pt`, fontWeight: "800", color: "#ffffff" }}>SOS 214.97</span>
                </div>
              </div>
            </div>

            {total.showAmountInWords && (
              <div className="mb-8" style={{ fontSize: "11px", color: "#6b7280" }}>
                <span className="font-semibold" style={{ color: "#374151" }}>Total In Words: </span>
                Two Hundred and Fourteen Somali Shilling and Ninety Seven Cents Only
              </div>
            )}

            {/* Notes Section */}
            <div className="mt-8 pt-4" style={{ borderTop: `1px dashed ${general.borderColor || "#e5e7eb"}` }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: general.fontColor || "#111827", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.2px" }}>Notes</div>
              <div style={{ fontSize: "10px", color: general.labelColor || "#4b5563", lineHeight: "1.6" }}>Looking forward for your business.</div>
            </div>
          </>
        );
      })()}
              </div>
              {/* Footer Bg Bar / Image */}
              {(headerFooter.footerBgColor || headerFooter.footerBgImage || headerFooter.showPageNumber !== false) ? (
                <div style={{ 
                  backgroundColor: headerFooter.footerBgColor || "transparent", 
                  backgroundImage: headerFooter.footerBgImage ? `url(${headerFooter.footerBgImage})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  height: "40px",
                  flexShrink: 0,
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: headerFooter.pageNumberPosition === "Left" ? "flex-start" : headerFooter.pageNumberPosition === "Center" ? "center" : "flex-end",
                  padding: "0 20px"
                }}>
                  {headerFooter.showPageNumber !== false && (
                    <span style={{ 
                      fontSize: "10px", 
                      color: (headerFooter.footerBgColor || headerFooter.footerBgImage) ? "#ffffff" : (headerFooter.footerFontColor || "#6C718A")
                    }}>
                      1
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Gallery Modal */}
        {isGalleryOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="text-[18px] font-bold text-gray-900">Select background image</h3>
                <button onClick={() => setIsGalleryOpen(false)} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                {GALLERY_IMAGES.map((group) => (
                  <div key={group.category} className="mb-8 last:mb-0">
                    <h4 className="mb-4 text-[15px] font-bold text-gray-800">{group.category}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {group.images.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (galleryTarget === "header") {
                              setSec("headerFooter", "bgImage", url);
                            } else if (galleryTarget === "footer") {
                              setSec("headerFooter", "footerBgImage", url);
                            }
                            setIsGalleryOpen(false);
                          }}
                          className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-[#156372] transition-all hover:shadow-md aspect-[4/1]"
                        >
                          <img 
                            src={url} 
                            alt="Gallery item" 
                            className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&w=400&h=100&q=80";
                            }}
                          />
                          <div className="absolute inset-0 bg-[#156372]/0 group-hover:bg-[#156372]/5 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}