import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  FileText,
  DollarSign,
  PieChart,
  Scale,
  Building2,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  BookOpen,
  Landmark,
  GraduationCap
} from 'lucide-react';

export function FinancialReportsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('income-expenditure'); // 'income-expenditure' | 'balance-sheet' | 'trial-balance' | 'program-revenue'
  const [fiscalYear, setFiscalYear] = useState('2026-27');
  const [period, setPeriod] = useState('FULL_YEAR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reportData, setReportData] = useState({
    fiscal_year: '2026-27',
    as_of_date: new Date().toISOString().split('T')[0],
    summary: {
      gross_revenue: 0,
      total_invoiced: 0,
      outstanding_dues: 0,
      operating_expenses: 0,
      net_surplus: 0,
      bank_balance: 0,
      collection_rate: 0,
    },
    trial_balance: {
      lines: [],
      total_debit: 0,
      total_credit: 0,
      is_balanced: true,
    },
    income_statement: {
      revenues: [],
      total_revenue: 0,
      expenses: [],
      total_expense: 0,
      net_surplus: 0,
      surplus_margin: 0,
    },
    balance_sheet: {
      assets: { current_assets: [], total_assets: 0 },
      liabilities_and_equity: { current_liabilities: [], institutional_funds: [], total_liabilities_and_equity: 0 },
    },
    program_breakdown: [],
  });

  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFinancialReports();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load financial reports:', err);
      setError(err.message || 'Failed to retrieve financial reports and statements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const { summary, trial_balance, income_statement, balance_sheet, program_breakdown } = reportData;

  const handlePrint = () => {
    window.print();
  };

  const exportCurrentStatement = () => {
    let filename = `Apex_Financial_Report_${activeTab}_${fiscalYear}.csv`;
    let csvContent = '';

    if (activeTab === 'income-expenditure') {
      const headers = ['Category', 'Particulars / Account Head', 'Amount (INR)'];
      const rows = [
        ...income_statement.revenues.map((r) => ['REVENUE', r.head, r.amount]),
        ['TOTAL REVENUE', '', income_statement.total_revenue],
        ...income_statement.expenses.map((e) => ['EXPENSE', e.head, e.amount]),
        ['TOTAL EXPENSES', '', income_statement.total_expense],
        ['NET OPERATING SURPLUS', '', income_statement.net_surplus],
      ];
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
    } else if (activeTab === 'balance-sheet') {
      const headers = ['Classification', 'Statement Head', 'Amount (INR)'];
      const rows = [
        ...balance_sheet.assets.current_assets.map((a) => ['CURRENT ASSET', a.item, a.amount]),
        ['TOTAL ASSETS', '', balance_sheet.assets.total_assets],
        ...balance_sheet.liabilities_and_equity.current_liabilities.map((l) => ['CURRENT LIABILITY', l.item, l.amount]),
        ...balance_sheet.liabilities_and_equity.institutional_funds.map((f) => ['CAPITAL FUND', f.item, f.amount]),
        ['TOTAL LIABILITIES & FUNDS', '', balance_sheet.liabilities_and_equity.total_liabilities_and_equity],
      ];
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
    } else if (activeTab === 'trial-balance') {
      const headers = ['Account Code', 'Account Head', 'Debit (INR)', 'Credit (INR)', 'Closing Balance (INR)', 'Nature'];
      const rows = trial_balance.lines.map((l) => [l.code, l.name, l.debit, l.credit, l.net_balance, l.nature]);
      rows.push(['TOTAL', 'Total Debits & Credits', trial_balance.total_debit, trial_balance.total_credit, '', '']);
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
    } else {
      const headers = ['Course Code', 'Program Name', 'Department', 'Enrolled Students', 'Annual Fee', 'Total Invoiced (INR)', 'Collected (INR)', 'Outstanding (INR)', 'Collection Rate (%)'];
      const rows = program_breakdown.map((p) => [
        p.code,
        p.name,
        p.department,
        p.students_count,
        p.annual_fee,
        p.total_invoiced,
        p.total_collected,
        p.outstanding,
        `${p.collection_efficiency}%`,
      ]);
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports & Statements</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Statutory audit statements, Income & Expenditure (P&L), Institutional Balance Sheet, and Trial Balance
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Fiscal Year Filter */}
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
          >
            <option value="2026-27">FY 2026-27 (Current)</option>
            <option value="2025-26">FY 2025-26 (Audited)</option>
          </select>

          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="FULL_YEAR">Full Fiscal Year</option>
            <option value="Q1">Q1 (Apr – Jun)</option>
            <option value="Q2">Q2 (Jul – Sep)</option>
            <option value="Q3">Q3 (Oct – Dec)</option>
            <option value="Q4">Q4 (Jan – Mar)</option>
          </select>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Refresh Financial Books"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCurrentStatement}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm shadow-blue-500/25"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Statement</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchReports} className="text-xs font-semibold underline hover:text-rose-900">
            Try Again
          </button>
        </div>
      )}

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Realized Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Realized Inflow</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{Number(summary.gross_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{summary.collection_rate}% collection realization</span>
            </div>
          </div>
        </div>

        {/* Total Institutional Demands */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Demanded Revenue</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Outstanding dues: </span>
              <span className="font-semibold text-amber-600">
                ₹{Number(summary.outstanding_dues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Net Operating Surplus */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Operating Surplus</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">
              ₹{Number(summary.net_surplus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
              {income_statement.surplus_margin}% operating margin
            </div>
          </div>
        </div>

        {/* Liquid Bank Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cash & Bank Reserves</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-cyan-700">
              ₹{Number(summary.bank_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dr Bank Account Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Statement Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('income-expenditure')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg transition ${
                activeTab === 'income-expenditure'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Income & Expenditure (P&L)</span>
            </button>

            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg transition ${
                activeTab === 'balance-sheet'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Institutional Balance Sheet</span>
            </button>

            <button
              onClick={() => setActiveTab('trial-balance')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg transition ${
                activeTab === 'trial-balance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>General Ledger Trial Balance</span>
            </button>

            <button
              onClick={() => setActiveTab('program-revenue')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg transition ${
                activeTab === 'program-revenue'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Program Revenue Breakdown</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Books as of: </span>
            <span className="text-slate-900 font-mono">
              {new Date(reportData.as_of_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* TAB 1: Income & Expenditure (P&L) */}
        {activeTab === 'income-expenditure' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Statement of Income & Expenditure</h3>
                <p className="text-xs text-slate-500">For the period ending {fiscalYear} • Core Operations & Academic Overhead</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                Accrual Basis Accounting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Revenues / Inflow */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50/70 p-3.5 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-sm text-emerald-900 uppercase tracking-wide">Operating Revenues / Inflows</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    ₹{Number(income_statement.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2">
                  {income_statement.revenues.map((rev, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{rev.head}</div>
                        <div className="text-xs text-slate-500">{rev.category}</div>
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-600">
                        ₹{Number(rev.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Expenditures / Outflow */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-rose-50/70 p-3.5 border-b border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-sm text-rose-900 uppercase tracking-wide">Operating Expenditures / Costs</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-800">
                    ₹{Number(income_statement.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2">
                  {income_statement.expenses.map((exp, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{exp.head}</div>
                        <div className="text-xs text-slate-500">{exp.category}</div>
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-700">
                        ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Net Margin Summary Card */}
            <div className="p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 border border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Bottom-Line Institutional Outcome:</span>
                <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Net Institutional Operating Surplus (Cr)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Available for campus infrastructure expansion, research funding & endowment reserves
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-blue-700 font-mono">
                  ₹{Number(income_statement.net_surplus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-end mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Surplus margin: {income_statement.surplus_margin}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Institutional Balance Sheet */}
        {activeTab === 'balance-sheet' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Institutional Balance Sheet (Statement of Financial Position)</h3>
                <p className="text-xs text-slate-500">As of {fiscalYear} • Liquidity, Defaulter Receivables & Educational Capital</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>Double-Entry Balance Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Column */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 uppercase tracking-wide">Assets & Receivables</span>
                  <span className="text-xs font-mono font-bold text-blue-700">
                    ₹{Number(balance_sheet.assets.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Current Assets</div>
                  <div className="divide-y divide-slate-100">
                    {balance_sheet.assets.current_assets.map((ast, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                        <span className="text-sm font-semibold text-slate-800">{ast.item}</span>
                        <span className="text-sm font-bold font-mono text-slate-900">
                          ₹{Number(ast.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t-2 border-slate-300 pt-3 px-3 flex items-center justify-between font-bold text-sm">
                    <span className="uppercase text-slate-900">Total Assets:</span>
                    <span className="font-mono text-blue-700 text-base">
                      ₹{Number(balance_sheet.assets.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 uppercase tracking-wide">Liabilities & Capital Funds</span>
                  <span className="text-xs font-mono font-bold text-purple-700">
                    ₹{Number(balance_sheet.liabilities_and_equity.total_liabilities_and_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Current Liabilities</div>
                  <div className="divide-y divide-slate-100">
                    {balance_sheet.liabilities_and_equity.current_liabilities.map((liab, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                        <span className="text-sm font-semibold text-slate-800">{liab.item}</span>
                        <span className="text-sm font-bold font-mono text-slate-700">
                          ₹{Number(liab.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">Institutional Capital Reserves</div>
                  <div className="divide-y divide-slate-100">
                    {balance_sheet.liabilities_and_equity.institutional_funds.map((fnd, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                        <span className="text-sm font-semibold text-slate-800">{fnd.item}</span>
                        <span className="text-sm font-bold font-mono text-emerald-600">
                          ₹{Number(fnd.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-slate-300 pt-3 px-3 flex items-center justify-between font-bold text-sm">
                    <span className="uppercase text-slate-900">Total Liabilities & Capital:</span>
                    <span className="font-mono text-purple-700 text-base">
                      ₹{Number(balance_sheet.liabilities_and_equity.total_liabilities_and_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: General Ledger Trial Balance */}
        {activeTab === 'trial-balance' && (
          <div className="overflow-x-auto">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Ledger Trial Balance Register</h3>
                <p className="text-xs text-slate-500">Summary debit & credit ledger totals for all active chart of accounts</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Trial Balance: In Balance</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Head / Classification</th>
                  <th className="py-3 px-4 text-center">Nature</th>
                  <th className="py-3 px-4 text-right">Debit Total (₹)</th>
                  <th className="py-3 px-4 text-right">Credit Total (₹)</th>
                  <th className="py-3 px-4 text-right">Closing Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {trial_balance.lines.map((line) => (
                  <tr key={line.code} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{line.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{line.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          line.nature === 'DEBIT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {line.nature}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{Number(line.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{Number(line.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(line.net_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-sm">
                  <td colSpan="3" className="py-3.5 px-4 text-slate-900 uppercase tracking-wider text-right">
                    Total Balancing Verification:
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-700 text-base">
                    ₹{Number(trial_balance.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-purple-700 text-base">
                    ₹{Number(trial_balance.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 text-xs">
                    BALANCED ✓
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB 4: Academic Program Revenue Breakdown */}
        {activeTab === 'program-revenue' && (
          <div className="overflow-x-auto">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Academic Program Revenue & Recovery Performance</h3>
                <p className="text-xs text-slate-500">Milestone demands vs realized fee receipts segmented by academic courses</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Program Code</th>
                  <th className="py-3 px-4">Program & Degree</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Allocated</th>
                  <th className="py-3 px-4 text-right">Demanded (₹)</th>
                  <th className="py-3 px-4 text-right">Collected (₹)</th>
                  <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                  <th className="py-3 px-4 text-center">Realization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {program_breakdown.map((prog) => (
                  <tr key={prog.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{prog.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{prog.name}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs font-medium">{prog.department}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs">{prog.students_count}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{Number(prog.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                      ₹{Number(prog.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                      ₹{Number(prog.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, prog.collection_efficiency)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 font-mono">{prog.collection_efficiency}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINTABLE OFFICIAL FINANCIAL STATEMENT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Audited Financial Statement — Fiscal Year {fiscalYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Institutional Layout */}
            <div className="p-8 text-slate-900 bg-white" id="printable-financial-statement">
              {/* Institutional Header */}
              <div className="text-center border-b-2 border-slate-800 pb-5">
                <div className="flex items-center justify-center gap-2 text-blue-700 font-extrabold text-2xl tracking-tight">
                  <Building2 className="w-7 h-7" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-xs uppercase font-semibold tracking-wider text-slate-500 mt-0.5">
                  Office of the Comptroller & Finance Treasury • Audited Accounts Department
                </p>
                <div className="mt-3 inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
                  OFFICIAL AUDITED STATEMENT OF FINANCIAL ACCOUNTS
                </div>
              </div>

              {/* Statement Details */}
              <div className="grid grid-cols-2 gap-4 my-6 text-xs">
                <div>
                  <span className="font-bold text-slate-600 uppercase">Accounting Standard:</span>{' '}
                  <span className="font-semibold text-slate-900">Indian GAAP / Higher Education Accounting Rules</span>
                  <div className="mt-1">
                    <span className="font-bold text-slate-600 uppercase">Fiscal Period:</span>{' '}
                    <span className="font-semibold text-slate-900">01 April 2026 to 31 March 2027</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <span className="font-bold text-slate-600 uppercase">Verification Date:</span>{' '}
                    <span className="font-medium text-slate-900">{new Date(reportData.as_of_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="mt-1">
                    <span className="font-bold text-slate-600 uppercase">General Ledger Status:</span>{' '}
                    <span className="font-bold text-emerald-700">BALANCED & RECONCILED</span>
                  </div>
                </div>
              </div>

              {/* Summary Statement Table */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-2">
                  Key Institutional Balances & Audit Extract
                </h4>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="py-2 px-3">Financial Head</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 font-semibold">Realized Tuition & Academic Revenue</td>
                      <td className="py-2 px-3 text-slate-500">Core Fee Inflow</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        ₹{Number(summary.gross_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Institutional Cash & Bank Reserves</td>
                      <td className="py-2 px-3 text-slate-500">Current Liquid Asset</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        ₹{Number(summary.bank_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Tuition Fees Outstanding (Defaulters)</td>
                      <td className="py-2 px-3 text-slate-500">Accounts Receivable</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                        ₹{Number(summary.outstanding_dues).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Total Scheduled Student Milestone Demands</td>
                      <td className="py-2 px-3 text-slate-500">Annual Invoiced Value</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        ₹{Number(summary.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/50 font-bold">
                      <td className="py-2 px-3 font-bold text-blue-900">Net Accumulated Operational Surplus</td>
                      <td className="py-2 px-3 text-blue-700">Endowment Fund</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-blue-900">
                        ₹{Number(summary.net_surplus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Statutory Exemption & Compliance Note */}
              <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 mb-6 text-[11px] text-slate-700">
                <span className="font-bold">Statutory Exemption Certificate:</span> All higher education tuition, laboratory subscriptions, and examination fees collected by Apex Higher Education Institute are exempt from GST under Notification No. 12/2017 - Central Tax (Rate), SAC Code 9992. Accounts maintained on Double-Entry System under GAAP standards.
              </div>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-300 text-xs mt-6">
                <div>
                  <div className="font-semibold text-slate-700">Senior Accountant:</div>
                  <div className="h-10 border-b border-dashed border-slate-300"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Prepared by Finance Desk</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Finance Administrator:</div>
                  <div className="h-10 border-b border-dashed border-slate-300"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Institutional Treasurer</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">Comptroller / Statutory Auditor:</div>
                  <div className="h-10 flex items-end justify-end">
                    <span className="font-mono text-blue-700 font-bold tracking-wider text-[10px] border border-blue-200 bg-blue-50 px-2 py-0.5 rounded">
                      AUDIT VERIFIED & SEALED
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Digital Ledger Engine</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default FinancialReportsView;
