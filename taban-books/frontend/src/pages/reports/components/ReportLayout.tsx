import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WizardNav from "./WizardNav";
import { useReportWizard } from "./ReportWizardContext";
import { FileText, Eye, Layout, Settings, Printer } from "lucide-react";

const ACCENT = "#156372";

export default function ReportLayout() {
  const nav = useNavigate();
  const {
    tableDensity, setTableDensity,
    tableDesign, setTableDesign,
    paper, setPaper,
    orientation, setOrientation,
    font, setFont,
    margins, setMargins,
    layoutDetails, setLayoutDetails
  } = useReportWizard();

  // Sync local margin inputs with context
  const [mTop, setMTop] = useState(margins.top);
  const [mBottom, setMBottom] = useState(margins.bottom);
  const [mLeft, setMLeft] = useState(margins.left);
  const [mRight, setMRight] = useState(margins.right);

  useEffect(() => {
    setMargins({ top: mTop, bottom: mBottom, left: mLeft, right: mRight });
  }, [mTop, mBottom, mLeft, mRight, setMargins]);

  const showOrgName = Boolean(layoutDetails?.showOrganizationName);
  const showReportBasis = Boolean(layoutDetails?.showReportBasis);
  const showGenTime = Boolean(layoutDetails?.showGeneratedTime);
  const showPageNum = Boolean(layoutDetails?.showPageNumber);
  const activeLabelStyle = { borderColor: ACCENT, backgroundColor: "rgba(21, 99, 114, 0.1)" };

  const setHoverStyles = (element: HTMLElement, active: boolean) => {
    element.style.borderColor = active ? ACCENT : "";
    element.style.backgroundColor = active ? "rgba(21, 99, 114, 0.05)" : "";
  };

  const handleHoverLabel = (event: React.MouseEvent<HTMLLabelElement>, active: boolean) => {
    setHoverStyles(event.currentTarget, active);
  };

  const handleSelectableHoverLabel = (
    event: React.MouseEvent<HTMLLabelElement>,
    active: boolean
  ) => {
    const label = event.currentTarget;
    if (!label.querySelector("input:checked")) {
      setHoverStyles(label, active);
    }
  };

  const handleFieldFocus = (
    event: React.FocusEvent<HTMLSelectElement | HTMLInputElement>,
    active: boolean
  ) => {
    event.currentTarget.style.borderColor = active ? ACCENT : "";
    event.currentTarget.style.boxShadow = active
      ? "0 0 0 2px rgba(21, 99, 114, 0.2)"
      : "";
  };

  return (
    <div className="min-h-screen bg-white px-5 py-4 pb-28">
      <div className="text-[18px] font-semibold text-slate-900 pb-3 border-b border-slate-200 mb-4">
        New Custom Report
      </div>

      <div className="mb-4">
        <WizardNav />
      </div>

      <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(17,24,39,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-50">
            <Layout className="h-6 w-6" style={{ color: "#156372" }} />
          </div>
          <div>
            <div className="text-[20px] font-bold text-slate-900">Report Layout</div>
            <div className="text-sm text-slate-500">
              Customize the appearance and formatting of your report
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT FORM */}
        <div className="lg:col-span-8 space-y-5">
          <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-slate-600" />
              <div className="text-base font-bold text-slate-900">
                Choose Details to Display
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition cursor-pointer"
                onMouseEnter={(event) => handleHoverLabel(event, true)}
                onMouseLeave={(event) => handleHoverLabel(event, false)}
              >
                <input
                  type="checkbox"
                  checked={Boolean(layoutDetails?.showOrganizationName)}
                  onChange={(e) => setLayoutDetails((prev) => ({ ...prev, showOrganizationName: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                  style={{ accentColor: ACCENT }}
                />
                <span>Organization Name</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-100 p-3 text-sm font-medium text-slate-500 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={false}
                  readOnly
                  disabled
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Organization Logo</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition cursor-pointer"
                onMouseEnter={(event) => handleHoverLabel(event, true)}
                onMouseLeave={(event) => handleHoverLabel(event, false)}
              >
                <input
                  type="checkbox"
                  checked={Boolean(layoutDetails?.showPageNumber)}
                  onChange={(e) => setLayoutDetails((prev) => ({ ...prev, showPageNumber: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                  style={{ accentColor: ACCENT }}
                />
                <span>Page Number</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-100 p-3 text-sm font-medium text-slate-500 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={false}
                  readOnly
                  disabled
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Generated By</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition cursor-pointer"
                onMouseEnter={(event) => handleHoverLabel(event, true)}
                onMouseLeave={(event) => handleHoverLabel(event, false)}
              >
                <input
                  type="checkbox"
                  checked={Boolean(layoutDetails?.showGeneratedTime)}
                  onChange={(e) => setLayoutDetails((prev) => ({ ...prev, showGeneratedTime: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                  style={{ accentColor: ACCENT }}
                />
                <span>Generated Time</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-100 p-3 text-sm font-medium text-slate-500 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={false}
                  readOnly
                  disabled
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Logo Watermark</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition cursor-pointer"
                onMouseEnter={(event) => handleHoverLabel(event, true)}
                onMouseLeave={(event) => handleHoverLabel(event, false)}
              >
                <input
                  type="checkbox"
                  checked={Boolean(layoutDetails?.showReportBasis)}
                  onChange={(e) => setLayoutDetails((prev) => ({ ...prev, showReportBasis: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                  style={{ accentColor: ACCENT }}
                />
                <span>Report Basis</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-100 p-3 text-sm font-medium text-slate-500 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked={false}
                  readOnly
                  disabled
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Generated Date</span>
              </label>
            </div>
          </div>

          {/* Layout section */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-600" />
              <div className="text-base font-bold text-slate-900">Layout Settings</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Table Density</label>
                <select
                  value={tableDensity}
                  onChange={(e) => setTableDensity(e.target.value)}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:ring-2"
                  onFocus={(event) => handleFieldFocus(event, true)}
                  onBlur={(event) => handleFieldFocus(event, false)}
                >
                  <option>Classic</option>
                  <option>Compact</option>
                  <option>Comfortable</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Table Design</label>
                <select
                  value={tableDesign}
                  onChange={(e) => setTableDesign(e.target.value)}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:ring-2"
                  onFocus={(event) => handleFieldFocus(event, true)}
                  onBlur={(event) => handleFieldFocus(event, false)}
                >
                  <option>Default</option>
                  <option>Minimal</option>
                  <option>Bold</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Paper Size</label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition cursor-pointer"
                    onMouseEnter={(event) => handleSelectableHoverLabel(event, true)}
                    onMouseLeave={(event) => handleSelectableHoverLabel(event, false)}
                    style={paper === "A4" ? activeLabelStyle : undefined}
                  >
                    <input
                      type="radio"
                      checked={paper === "A4"}
                      onChange={() => setPaper("A4")}
                      className="h-4 w-4"
                      style={{ accentColor: ACCENT }}
                    />
                    A4
                  </label>
                  <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition cursor-pointer"
                    onMouseEnter={(event) => handleSelectableHoverLabel(event, true)}
                    onMouseLeave={(event) => handleSelectableHoverLabel(event, false)}
                    style={paper === "Letter" ? activeLabelStyle : undefined}
                  >
                    <input
                      type="radio"
                      checked={paper === "Letter"}
                      onChange={() => setPaper("Letter")}
                      className="h-4 w-4"
                      style={{ accentColor: ACCENT }}
                    />
                    Letter
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Orientation</label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition cursor-pointer"
                    onMouseEnter={(event) => handleSelectableHoverLabel(event, true)}
                    onMouseLeave={(event) => handleSelectableHoverLabel(event, false)}
                    style={orientation === "Portrait" ? activeLabelStyle : undefined}
                  >
                    <input
                      type="radio"
                      checked={orientation === "Portrait"}
                      onChange={() => setOrientation("Portrait")}
                      className="h-4 w-4"
                      style={{ accentColor: ACCENT }}
                    />
                    Portrait
                  </label>
                  <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition cursor-pointer"
                    onMouseEnter={(event) => handleSelectableHoverLabel(event, true)}
                    onMouseLeave={(event) => handleSelectableHoverLabel(event, false)}
                    style={orientation === "Landscape" ? activeLabelStyle : undefined}
                  >
                    <input
                      type="radio"
                      checked={orientation === "Landscape"}
                      onChange={() => setOrientation("Landscape")}
                      className="h-4 w-4"
                      style={{ accentColor: ACCENT }}
                    />
                    Landscape
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Font Family</label>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:ring-2"
                  onFocus={(event) => handleFieldFocus(event, true)}
                  onBlur={(event) => handleFieldFocus(event, false)}
                >
                  <option>Open Sans</option>
                  <option>Inter</option>
                  <option>Arial</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Margins (inches)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    value={mTop}
                    onChange={(e) => setMTop(e.target.value)}
                    className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Top"
                  />
                  <input
                    value={mBottom}
                    onChange={(e) => setMBottom(e.target.value)}
                    className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Bottom"
                  />
                  <input
                    value={mLeft}
                    onChange={(e) => setMLeft(e.target.value)}
                    className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Left"
                  />
                  <input
                    value={mRight}
                    onChange={(e) => setMRight(e.target.value)}
                    className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="lg:col-span-4 mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-6">
            <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30 p-5">
              <div className="mb-4 flex items-center justify-center gap-2">
                <Printer className="h-4 w-4 text-slate-500" />
                <div className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                  Live Preview
                </div>
              </div>

              <div className="mx-auto w-full max-w-[320px] rounded-xl bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.15)] border-2 border-slate-200">
                <div className="text-center border-b border-slate-200 pb-3">
                  {showOrgName && (
                    <div className="text-sm font-bold text-slate-800">
                      TABAN ENTERPRISES
                    </div>
                  )}
                  {showReportBasis && (
                    <div className="mt-2 text-xs text-slate-600">
                      Basis: <span className="font-semibold text-slate-800">Accrual</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-2 rounded ${i % 2 === 0 ? 'bg-slate-200' : 'bg-slate-100'}`} />
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{showGenTime ? "Generated: 10:15 AM" : ""}</span>
                  <span>{showPageNum ? "Page 1" : ""}</span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[9px] text-slate-400 text-center">
                  {tableDensity} • {tableDesign} • {paper} • {orientation} • {font}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* floating footer */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 shadow-2xl">
        <button
          type="button"
          onClick={() => nav("/reports/new/columns")}
          className="h-9 rounded-lg border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[.98] transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => nav("/reports/new/preferences")}
          className="h-9 rounded-lg px-5 text-sm font-bold text-white shadow-lg hover:brightness-95 active:scale-[.98] transition"
          style={{ background: ACCENT }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
