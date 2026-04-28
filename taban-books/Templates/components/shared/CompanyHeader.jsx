import React from "react";

const toText = (value) => String(value || "").trim();

const CompanyHeader = ({
  companyName = "",
  addressLines = [],
  logoUrl = "",
  fontColor = "#374151",
}) => {
  const safeName = toText(companyName) || "—";
  const safeAddressLines = Array.isArray(addressLines)
    ? addressLines.map((line) => toText(line)).filter(Boolean)
    : [];

  return (
    <div className="mb-6">
      <div className="mb-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-slate-50">
          {logoUrl ? (
            <img src={logoUrl} alt={safeName} className="h-full w-full object-contain" />
          ) : (
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded bg-blue-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  <span className="text-lg font-bold text-blue-600">*</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-0.5 text-sm" style={{ color: fontColor }}>
        <div className="font-semibold">{safeName}</div>
        {safeAddressLines.length ? (
          safeAddressLines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)
        ) : (
          <div>Organization profile not set</div>
        )}
      </div>
    </div>
  );
};

export default CompanyHeader;
