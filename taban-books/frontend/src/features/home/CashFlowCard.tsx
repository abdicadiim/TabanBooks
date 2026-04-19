import React, { useEffect, useMemo, useState } from "react";
import { useCurrency } from "../../hooks/useCurrency";
import { dashboardService } from "../../services/dashboardService";

interface CashFlowData {
  inflows: number;
  outflows: number;
  net: number;
  operating: number;
  breakdown: Array<{
    name: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

const resolveApiPeriod = (range: "live" | "7d" | "1m" | "1y") => {
  if (range === "7d") return "last-7-days";
  if (range === "1m" || range === "live") return "this-month";
  return "last-12-months";
};

const normalizeCashFlowData = (payload: any): CashFlowData | null => {
  if (!payload) return null;

  return {
    inflows: Number(payload.inflows || 0),
    outflows: Number(payload.outflows || 0),
    net: Number(payload.net || 0),
    operating: Number(payload.operating || 0),
    breakdown: Array.isArray(payload.breakdown)
      ? payload.breakdown.map((point: any) => ({
          name: String(point?.name || ""),
          income: Number(point?.income || 0),
          expenses: Number(point?.expenses || 0),
          net: Number(point?.net || 0),
        }))
      : [],
  };
};

export default function CashFlowCard({
  initialData = null,
  bootstrapLoading = false,
}: {
  initialData?: any;
  bootstrapLoading?: boolean;
}) {
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(!initialData);
  const [range, setRange] = useState<"live" | "7d" | "1m" | "1y">("live");
  const [data, setData] = useState<CashFlowData | null>(() => normalizeCashFlowData(initialData));

  useEffect(() => {
    const requestedPeriod = resolveApiPeriod(range);
    const initialPeriod = String(initialData?.period || "");

    if (bootstrapLoading && !initialData && requestedPeriod === resolveApiPeriod("live")) {
      setLoading(true);
      return;
    }

    if (initialData && initialPeriod === requestedPeriod) {
      setData(normalizeCashFlowData(initialData));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await dashboardService.getCashFlow(requestedPeriod);
        setData(normalizeCashFlowData(response?.data));
      } catch (error) {
        console.error("Error fetching cash flow data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bootstrapLoading, initialData, range]);

  const points = useMemo(() => {
    const breakdown = data?.breakdown || [];
    if (range === "7d") return breakdown.slice(-7);
    if (range === "1m" || range === "live") return breakdown.slice(-8);
    return breakdown.slice(-12);
  }, [data, range]);

  const chart = useMemo(() => {
    const width = 1000;
    const height = 260;
    const top = 24;
    const bottom = 28;
    const left = 20;
    const right = 20;
    const usableW = width - left - right;
    const usableH = height - top - bottom;

    if (!points.length) {
      return {
        width,
        height,
        linePath: "",
        areaPath: "",
        dots: [] as Array<{ x: number; y: number; name: string; value: number }>,
        xLabels: [] as Array<{ x: number; label: string }>,
      };
    }

    const normalizedPoints = points.length === 1 ? [...points, points[0]] : points;
    const values = normalizedPoints.map((p) => Number(p.net || 0));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const spread = Math.max(max - min, 1);

    const dots = normalizedPoints.map((p, i) => {
      const x = left + (usableW * i) / Math.max(normalizedPoints.length - 1, 1);
      const y = top + ((max - Number(p.net || 0)) / spread) * usableH;
      return { x, y, name: p.name, value: Number(p.net || 0) };
    });

    const smoothLinePath = dots.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }, "");

    const areaPath = `${smoothLinePath} L ${dots[dots.length - 1].x} ${height - bottom} L ${dots[0].x} ${height - bottom} Z`;
    const xLabels = points.map((d, i) => ({ x: dots[i]?.x || left, label: d.name }));

    return { width, height, linePath: smoothLinePath, areaPath, dots, xLabels };
  }, [points]);

  const activePoint = chart.dots.length ? chart.dots[Math.floor(chart.dots.length * 0.7)] : null;

  return (
    <section className="w-full overflow-x-hidden rounded-2xl border border-[#dfe7ee] bg-white shadow-sm">
      <header className="mb-1 flex items-start justify-between gap-3 px-3.5 pt-3.5">
        <div>
          <h2 className="text-[16px] font-semibold leading-tight text-slate-900">Cash Flow Deep Dive</h2>
          <p className="text-[11px] text-[#6b7f91]">Live cash movement and operating trends</p>
        </div>

        <div className="inline-flex overflow-hidden rounded-lg border border-[#e3eaf0] bg-[#f8fafc] text-[10px]">
          <button
            onClick={() => setRange("live")}
            className={`px-2.5 py-1.5 ${range === "live" ? "bg-white text-slate-700 font-semibold" : "text-[#7a8da0]"}`}
          >
            Live
          </button>
          <button
            onClick={() => setRange("7d")}
            className={`border-l border-[#e3eaf0] px-2.5 py-1.5 ${range === "7d" ? "bg-white text-slate-700 font-semibold" : "text-[#7a8da0]"}`}
          >
            7D
          </button>
          <button
            onClick={() => setRange("1m")}
            className={`border-l border-[#e3eaf0] px-2.5 py-1.5 ${range === "1m" ? "bg-white text-slate-700 font-semibold" : "text-[#7a8da0]"}`}
          >
            1M
          </button>
          <button
            onClick={() => setRange("1y")}
            className={`border-l border-[#e3eaf0] px-2.5 py-1.5 ${range === "1y" ? "bg-white text-slate-700 font-semibold" : "text-[#7a8da0]"}`}
          >
            1Y
          </button>
        </div>
      </header>

      <div className="relative rounded-xl border border-[#e5ecf1] bg-[#fcfdff] p-2.5">
        <div className="rounded-lg border border-[#edf2f6] bg-white p-2.5">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-[250px] rounded-md bg-[#f4f8fb]" />
              <div className="mt-2 grid grid-cols-8 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-2 rounded bg-[#eef3f7]" />
                ))}
              </div>
            </div>
          ) : chart.dots.length ? (
            <>
              <div className="relative h-[250px]">
                <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full">
                  <defs>
                    <linearGradient id="cashflow-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {[20, 72, 124, 176, 228].map((y, i) => (
                    <line key={i} x1={16} y1={y} x2={984} y2={y} stroke="#ecf1f5" strokeDasharray="4 5" />
                  ))}

                  <path d={chart.areaPath} fill="url(#cashflow-fill)" />
                  <path d={chart.linePath} fill="none" stroke="#1ac43a" strokeWidth="2.5" strokeLinecap="round" />

                  {activePoint && (
                    <>
                      <circle cx={activePoint.x} cy={activePoint.y} r="4.5" fill="#1ac43a" stroke="white" strokeWidth="2" />
                      <foreignObject x={activePoint.x - 52} y={activePoint.y - 58} width="104" height="44">
                        <div className="rounded-lg border border-[#22c55e] bg-white text-center py-1 shadow-sm">
                          <div className="text-[10px] font-semibold text-slate-800">{formatMoney(activePoint.value)}</div>
                          <div className="text-[9px] text-slate-500">{activePoint.name}</div>
                        </div>
                      </foreignObject>
                    </>
                  )}
                </svg>
              </div>

              <div className="mt-1.5 grid grid-cols-6 text-[10px] text-[#94a3b8] sm:grid-cols-8 md:grid-cols-12">
                {chart.xLabels.map((label, i) => (
                  <span key={`${label.label}-${i}`} className="text-center truncate">
                    {label.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[240px] w-full items-center justify-center text-[11px] text-slate-500">No cash flow data</div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 overflow-hidden rounded-lg border border-[#edf2f6] text-[11px] md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="border-b border-[#edf2f6] bg-white p-3 animate-pulse xl:border-b-0 xl:border-r last:border-r-0 md:last:border-b-0">
                <div className="h-3 w-20 rounded bg-[#edf2f6]" />
                <div className="mt-3 h-8 w-28 rounded bg-[#edf2f6]" />
                <div className="mt-2 h-3 w-16 rounded bg-[#edf2f6]" />
              </div>
            ))
          ) : (
            <>
              <div className="border-b border-[#edf2f6] bg-white p-3 xl:border-b-0 xl:border-r">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6c8092]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#1ac43a]" />
                  Net Cash Flow
                </div>
                <div className="mt-2 text-[26px] font-semibold leading-none text-slate-900">{formatMoney(data?.net || 0)}</div>
                <div className="mt-1.5 text-[10px] font-semibold text-[#1ea84a]">+12.5%</div>
              </div>

              <div className="border-b border-[#edf2f6] bg-white p-3 xl:border-b-0 xl:border-r">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6c8092]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" />
                  Incoming
                </div>
                <div className="mt-2 text-[26px] font-semibold leading-none text-slate-900">{formatMoney(data?.inflows || 0)}</div>
                <div className="mt-1.5 text-[10px] text-[#8ea0b2]">Last 30 days total</div>
              </div>

              <div className="border-b border-[#edf2f6] bg-white p-3 md:border-b-0 xl:border-r">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6c8092]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#f43f5e]" />
                  Outgoing
                </div>
                <div className="mt-2 text-[26px] font-semibold leading-none text-slate-900">{formatMoney(data?.outflows || 0)}</div>
                <div className="mt-1.5 text-[10px] text-[#8ea0b2]">Last 30 days total</div>
              </div>

              <div className="bg-white p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6c8092]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b]" />
                  Operating Cash
                </div>
                <div className="mt-2 text-[26px] font-semibold leading-none text-slate-900">{formatMoney(data?.operating || 0)}</div>
                <div className="mt-1.5 text-[10px] text-[#6f8294]">Real-time</div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
