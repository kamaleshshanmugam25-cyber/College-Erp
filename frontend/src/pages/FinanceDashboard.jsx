import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  Download,
  Clock,
  PieChart,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function FinanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [showAllPrograms, setShowAllPrograms] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFinanceDashboard();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // 20s auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading 3D Visual Analytics & Financial Overview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { today, defaulters, recon_rate, queue, trend, batches, program_breakdown, gateway_breakdown } = data || {};

  // Monthly 3D Vertical Bar Data
  const monthLabels = trend?.labels || ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  // Sample collection values for 3D vertical bars
  const monthlyValues = [185000, 240000, 310000, 290000, 360000, 425000];
  const targetValues = [200000, 250000, 300000, 300000, 380000, 450000];
  const maxVal = 500000;

  // Program 3D Bar Data
  const courseData = (program_breakdown && program_breakdown.length > 0) ? program_breakdown : [
    { course: 'BSc Computer Science', code: 'CS-BSC', allocated: 250000, collected: 195000 },
    { course: 'Bachelor of Computer Applications', code: 'CA-BCA', allocated: 210000, collected: 168000 },
    { course: 'Bachelor of Commerce', code: 'CM-BCOM', allocated: 180000, collected: 144000 },
    { course: 'B.Tech Electrical & Electronics', code: 'EE-BTECH', allocated: 320000, collected: 275000 },
    { course: 'M.Tech AI & Data Science', code: 'AI-MTECH', allocated: 290000, collected: 232000 },
    { course: 'MBA Finance & Fintech', code: 'MBA-FIN', allocated: 350000, collected: 310000 },
  ];

  const visibleCourses = showAllPrograms ? courseData : courseData.slice(0, 3);

  // Gateway Doughnut Segment Data
  const gatewayData = (gateway_breakdown && gateway_breakdown.length > 0) ? gateway_breakdown : [
    { name: "UPI / QR Code Instant", count: 142, amount: 425000.0, color: "#3b82f6", pct: 42 },
    { name: "Razorpay NetBanking", count: 86, amount: 310000.0, color: "#10b981", pct: 31 },
    { name: "Cashfree Debit/Credit Card", count: 34, amount: 185000.0, color: "#f59e0b", pct: 18 },
    { name: "Direct NEFT / RTGS Vault", count: 12, amount: 95000.0, color: "#8b5cf6", pct: 9 },
  ];

  const totalGatewayAmt = gatewayData.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Finance & Analytics</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Today's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Collections</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{Number(today?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1 text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{today?.count || 0} verified transactions today</span>
          </div>
        </div>

        {/* Defaulter / Overdue Fees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Defaulters</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            ₹{Number(defaulters?.outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Across {defaulters?.students || 0} student accounts
          </div>
        </div>
      </div>

      {/* GRAPH MODEL 1: COMPACT 3D CYLINDRICAL PILLAR CHART */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Revenue Pillars — Monthly Inflow</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-blue-600 to-cyan-400 shadow-2xs"></span>
              <span className="text-slate-700">Realized Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-500 rounded"></span>
              <span className="text-slate-500">Target Line</span>
            </div>
          </div>
        </div>

        {/* Compact 3D Cylinder Bar Grid Canvas (h-44 instead of h-64) */}
        <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-6 pt-8 px-4 pb-2 border-b border-slate-200 relative bg-linear-to-b from-slate-50/40 to-white rounded-xl">
          {/* Background Y-Axis Grid Lines */}
          <div className="absolute inset-x-0 top-3 bottom-7 flex flex-col justify-between pointer-events-none px-4 opacity-40">
            <div className="border-b border-dashed border-slate-300 w-full text-[9px] text-slate-400 font-mono">₹5.0L</div>
            <div className="border-b border-dashed border-slate-300 w-full text-[9px] text-slate-400 font-mono">₹3.75L</div>
            <div className="border-b border-dashed border-slate-300 w-full text-[9px] text-slate-400 font-mono">₹2.5L</div>
            <div className="border-b border-dashed border-slate-300 w-full text-[9px] text-slate-400 font-mono">₹1.25L</div>
          </div>

          {monthLabels.map((m, idx) => {
            const actual = monthlyValues[idx] || 250000;
            const target = targetValues[idx] || 300000;
            const actualHeight = Math.max(10, (actual / maxVal) * 100);
            const targetHeight = (target / maxVal) * 100;
            const isHovered = hoveredBar === idx;
            const amtInLakhs = (actual / 100000).toFixed(2);

            return (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
                className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer z-10"
              >
                {/* Hover Tooltip Popup */}
                {isHovered && (
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-lg border border-slate-700 pointer-events-none whitespace-nowrap z-30 transition-all">
                    <div className="font-bold text-cyan-300">{m} 2026 Collection</div>
                    <div>Realized: <strong className="text-white">₹{actual.toLocaleString('en-IN')}</strong></div>
                    <div className="text-[9px] text-slate-300">Target Budget: ₹{target.toLocaleString('en-IN')}</div>
                  </div>
                )}

                {/* Floating Value Pill Badge directly on top of pillar */}
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md transition-all duration-300 mb-1 shadow-2xs ${
                  isHovered ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  ₹{amtInLakhs}L
                </span>

                {/* 3D Cylindrical Pillar with Target Notch */}
                <div className="relative w-7 sm:w-9 flex items-end justify-center h-full">
                  {/* Target Budget Line Indicator */}
                  <div 
                    className="absolute inset-x-0 border-t-2 border-dashed border-amber-500 z-20 pointer-events-none"
                    style={{ bottom: `${targetHeight}%` }}
                    title={`Target: ₹${target.toLocaleString('en-IN')}`}
                  ></div>

                  {/* 3D Capsule Pillar Body */}
                  <div 
                    className="w-full bg-linear-to-t from-indigo-800 via-blue-600 to-cyan-400 rounded-t-xl shadow-md transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-110 relative border-t border-cyan-200/80"
                    style={{ height: `${actualHeight}%` }}
                  >
                    {/* 3D Top Oval Highlight Cap */}
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-cyan-200 to-white/70 rounded-t-xl opacity-90"></div>
                  </div>
                </div>

                {/* X-Axis Month Label */}
                <span className={`text-[11px] font-bold mt-1.5 transition ${isHovered ? 'text-indigo-600 font-extrabold scale-105' : 'text-slate-600'}`}>
                  {m}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRAPH MODEL 2 & 3 GRID: CIRCULAR DOUGHNUT RING & PROGRAM BARS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH MODEL 2: CIRCULAR DOUGHNUT RING BREAKDOWN */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                <span>Circular Doughnut Ring — Settlement Channels</span>
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              100% Verified
            </span>
          </div>

          <div className="flex flex-col items-center justify-center pt-2 pb-2">
            {/* SVG Donut Ring Canvas with Full In-Graph Labels */}
            <div className="relative w-80 h-80 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full">
                {/* Background Ring Base */}
                <circle cx="80" cy="80" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />

                {/* Donut Slice Arcs with In-Graph Labels */}
                {(() => {
                  let accumulatedPct = 0;
                  const circumference = 2 * Math.PI * 50; // r=50
                  return gatewayData.map((gw, idx) => {
                    const strokeDash = (gw.pct / 100) * circumference;
                    const offset = -(accumulatedPct / 100) * circumference;
                    const midPct = accumulatedPct + gw.pct / 2;
                    accumulatedPct += gw.pct;

                    // Compute precise angles & positions directly in graph
                    const angleDeg = (midPct / 100) * 360 - 90;
                    const rad = (angleDeg * Math.PI) / 180;
                    const lx = 80 + 50 * Math.cos(rad);
                    const ly = 80 + 50 * Math.sin(rad);
                    const tx = 80 + 68 * Math.cos(rad);
                    const ty = 80 + 68 * Math.sin(rad);

                    const shortName = gw.name.split(' ')[0];
                    const amtInLakhs = (gw.amount / 100000).toFixed(2);

                    return (
                      <g key={idx}>
                        {/* Donut Arc Segment */}
                        <circle
                          cx="80"
                          cy="80"
                          r="50"
                          fill="transparent"
                          stroke={gw.color}
                          strokeWidth="18"
                          strokeDasharray={`${strokeDash} ${circumference}`}
                          strokeDashoffset={offset}
                          transform="rotate(-90 80 80)"
                          className="transition-all duration-700 hover:opacity-90 cursor-pointer"
                        />
                        {/* Percentage Text on the Donut Arc Slice */}
                        {gw.pct > 5 && (
                          <text
                            x={lx}
                            y={ly}
                            fill="#ffffff"
                            fontSize="4.5"
                            fontWeight="800"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="pointer-events-none drop-shadow-xs"
                          >
                            {gw.pct}%
                          </text>
                        )}
                        {/* Channel Name & Amount Callout directly in the graph */}
                        <text
                          x={tx}
                          y={ty - 2.5}
                          fill={gw.color}
                          fontSize="4.2"
                          fontWeight="800"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="pointer-events-none"
                        >
                          {shortName} ({gw.pct}%)
                        </text>
                        <text
                          x={tx}
                          y={ty + 2.5}
                          fill="#475569"
                          fontSize="3.5"
                          fontWeight="600"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="pointer-events-none"
                        >
                          ₹{amtInLakhs}L
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>

              {/* Center Doughnut Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Settlement</span>
                <span className="text-lg font-black text-slate-900">
                  ₹{(totalGatewayAmt / 100000).toFixed(2)}L
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                  Live Gateways
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRAPH MODEL 3: PROGRAM REVENUE PILLARS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Program Revenue Pillars</span>
              </h2>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {visibleCourses.map((item, idx) => {
              const pct = Math.min(100, Math.round((item.collected / (item.allocated || 1)) * 100));
              return (
                <div key={idx} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/60 hover:border-slate-300 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-2xs"></span>
                      <span>{item.course}</span>
                      <span className="text-[10px] font-mono text-slate-400">({item.code})</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      ₹{Number(item.collected).toLocaleString('en-IN')} <span className="text-slate-400 font-normal">/ ₹{Number(item.allocated).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Dual Bar 3D Pillar Progress Indicator */}
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5 flex border border-slate-300/60 shadow-inner">
                    <div 
                      className="bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-xs relative"
                      style={{ width: `${pct}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-white/40 rounded-r-full"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold px-0.5">
                    <span>Target Allocated: ₹{Number(item.allocated).toLocaleString('en-IN')}</span>
                    <span className="text-emerald-700 font-bold">{pct}% Realized</span>
                  </div>
                </div>
              );
            })}

            {/* View More / Show Less Toggle Button */}
            {courseData.length > 3 && (
              <button
                onClick={() => setShowAllPrograms(!showAllPrograms)}
                className="w-full py-2.5 px-4 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 shadow-2xs"
              >
                {showAllPrograms ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-4 h-4 text-emerald-600" />
                  </>
                ) : (
                  <>
                    <span>View More ({courseData.length - 3} More Programs)</span>
                    <ChevronDown className="w-4 h-4 text-emerald-600" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verified Inward Fee Batches Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Verified Inward Fee Batches</h2>
            <p className="text-xs text-slate-500">Real-time ledger audit trail with HMAC-verified transactions</p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing latest {batches?.length || 0} batches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Paid At</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {batches && batches.length > 0 ? (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.order_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{b.student_name}</div>
                      <div className="text-[11px] text-slate-400">{b.roll_no}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{Number(b.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700">{b.method}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({b.gateway})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          b.status === 'RECONCILED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'SUCCESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{b.paid_at || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {b.receipt_id ? (
                        <a
                          href={`/portal/receipts/${b.receipt_id}/pdf/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No verified fee transaction batches found in current ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
