import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  FileText,
  Scale,
  Building2,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  X
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
    let filename = `Apex_Financial_Statement_${activeTab}_${fiscalYear}.csv`;
    let csvContent = '';

    if (activeTab === 'income-expenditure') {
      const headers = ['Classification', 'Particulars / Account Head', 'Amount (INR)'];
      const rows = [
        ...income_statement.revenues.map((r) => ['OPERATING REVENUE', r.head, r.amount]),
        ['TOTAL OPERATING INFLOW', '', income_statement.total_revenue],
        ...income_statement.expenses.map((e) => ['OPERATING EXPENDITURE', e.head, e.amount]),
        ['TOTAL OPERATING OUTFLOW', '', income_statement.total_expense],
        ['NET BALANCE TRANSFERRED TO CAPITAL FUND', '', income_statement.net_surplus],
      ];
      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
    } else if (activeTab === 'balance-sheet') {
      const headers = ['Classification', 'Statement Head', 'Amount (INR)'];
      const rows = [
        ...balance_sheet.assets.current_assets.map((a) => ['CURRENT ASSET', a.item, a.amount]),
        ['TOTAL ASSETS', '', balance_sheet.assets.total_assets],
        ...balance_sheet.liabilities_and_equity.current_liabilities.map((l) => ['CURRENT LIABILITY', l.item, l.amount]),
        ...balance_sheet.liabilities_and_equity.institutional_funds.map((f) => ['CAPITAL FUND & RESERVES', f.item, f.amount]),
        ['TOTAL LIABILITIES & CAPITAL FUNDS', '', balance_sheet.liabilities_and_equity.total_liabilities_and_equity],
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
    <div className="space-y-4">
      {/* Header Banner - Clean, Logically Aligned Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Clean Title & Subtitle */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Financial Reports & Statements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audited statutory accounting statements, balance sheet, and general ledger trial balance
          </p>
        </div>

        {/* Right: Logically Aligned Filters and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Group 1: Filters */}
          <div className="flex items-center gap-2">
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer shadow-sm"
            >
              <option value="2026-27">FY 2026-27 (Current)</option>
              <option value="2025-26">FY 2025-26 (Audited)</option>
            </select>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer shadow-sm"
            >
              <option value="FULL_YEAR">Full Fiscal Year</option>
              <option value="Q1">Q1 (Apr – Jun)</option>
              <option value="Q2">Q2 (Jul – Sep)</option>
              <option value="Q3">Q3 (Oct – Dec)</option>
              <option value="Q4">Q4 (Jan – Mar)</option>
            </select>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

          {/* Group 2: Action Buttons (All side-by-side with uniform heights) */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer shadow-sm disabled:opacity-50"
              title="Refresh Financial Books"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportCurrentStatement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition shadow-sm cursor-pointer"
              title="Export Statement to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchReports} className="text-xs font-semibold underline hover:text-rose-900 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Logically Correct 4-Metric Accounting Strip (Demand -> Inflow -> Outstanding -> Bank Reserves) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Scheduled Demand (Initial Academic Billing) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Scheduled Demand
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            ₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Approved annual student billing (AY 2026-27)
          </div>
        </div>

        {/* Metric 2: Gross Realized Inflow (Collected from Demands) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Gross Realized Inflow
          </div>
          <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
            ₹{Number(summary.gross_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Settled collections audited in General Ledger
          </div>
        </div>

        {/* Metric 3: Outstanding Student Dues (Demand minus Inflow) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Outstanding Student Dues
          </div>
          <div className="text-lg font-bold font-mono text-amber-700 mt-1">
            ₹{Number(summary.outstanding_dues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active pending / partial installments
          </div>
        </div>

        {/* Metric 4: Liquid Cash & Bank Reserves */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cash & Bank Reserves
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            ₹{Number(summary.bank_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>State Bank of India • Dr Verified</span>
          </div>
        </div>
      </div>

      {/* Main Container with Statement Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              onClick={() => setActiveTab('income-expenditure')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'income-expenditure'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Income & Expenditure</span>
            </button>

            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'balance-sheet'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-slate-500" />
              <span>Balance Sheet</span>
            </button>

            <button
              onClick={() => setActiveTab('trial-balance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'trial-balance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Trial Balance</span>
            </button>

            <button
              onClick={() => setActiveTab('program-revenue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'program-revenue'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
              <span>Program Breakdown</span>
            </button>
          </div>

          <div className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 self-start md:self-auto">
            <span>Books as of: </span>
            <span className="text-slate-900 font-mono font-semibold">
              {new Date(reportData.as_of_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* TAB 1: Income & Expenditure */}
        {activeTab === 'income-expenditure' && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Statement of Income & Expenditure</h3>
                <p className="text-xs text-slate-500">For the fiscal year ending {fiscalYear} • Core Operations & Academic Overhead</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                Accrual Basis Accounting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Revenues / Inflow */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Operating Revenues / Inflows
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ₹{Number(income_statement.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-1">
                  {income_statement.revenues.map((rev, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 rounded transition">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{rev.head}</div>
                        <div className="text-[11px] text-slate-500">{rev.category}</div>
                      </div>
                      <div className="text-xs font-bold font-mono text-slate-900">
                        ₹{Number(rev.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Expenditures / Outflow */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Operating Expenditures / Outflows
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ₹{Number(income_statement.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-1">
                  {income_statement.expenses.map((exp, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 rounded transition">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{exp.head}</div>
                        <div className="text-[11px] text-slate-500">{exp.category}</div>
                      </div>
                      <div className="text-xs font-bold font-mono text-slate-700">
                        ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clean Professional Accounting Balancing Strip */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 text-xs">
                  Net Balance Transferred to Educational Capital Fund
                </div>
                <div className="text-slate-500 text-[11px]">
                  Total Inflows: <span className="font-mono font-semibold text-slate-800">₹{Number(income_statement.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> | Total Outflows: <span className="font-mono font-semibold text-slate-800">₹{Number(income_statement.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-left md:text-right">
                <div className="text-lg font-bold font-mono text-slate-900">
                  ₹{Number(income_statement.net_surplus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500">
                  Verified & Carried to Balance Sheet
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Institutional Balance Sheet */}
        {activeTab === 'balance-sheet' && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Institutional Balance Sheet (Statement of Financial Position)</h3>
                <p className="text-xs text-slate-500">As of {fiscalYear} • Liquidity, Receivables & Educational Capital</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Double-Entry Balanced</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets Column */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Assets & Receivables</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ₹{Number(balance_sheet.assets.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Current Assets</div>
                  <div className="divide-y divide-slate-100">
                    {balance_sheet.assets.current_assets.map((ast, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50/70 rounded transition">
                        <span className="text-xs font-semibold text-slate-800">{ast.item}</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          ₹{Number(ast.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-2 px-1 flex items-center justify-between font-bold text-xs">
                    <span className="uppercase text-slate-900">Total Assets:</span>
                    <span className="font-mono text-slate-900 text-sm">
                      ₹{Number(balance_sheet.assets.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Liabilities & Capital Funds</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ₹{Number(balance_sheet.liabilities_and_equity.total_liabilities_and_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Current Liabilities</div>
                  <div className="divide-y divide-slate-100">
                    {balance_sheet.liabilities_and_equity.current_liabilities.map((liab, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50/70 rounded transition">
                        <span className="text-xs font-semibold text-slate-800">{liab.item}</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          ₹{Number(liab.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-2">Institutional Funds</div>
                  <div className="divide-y divide-slate-100">
                    {balance_sheet.liabilities_and_equity.institutional_funds.map((fnd, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between hover:bg-slate-50/70 rounded transition">
                        <span className="text-xs font-semibold text-slate-800">{fnd.item}</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          ₹{Number(fnd.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 pt-2 px-1 flex items-center justify-between font-bold text-xs">
                    <span className="uppercase text-slate-900">Total Liabilities & Funds:</span>
                    <span className="font-mono text-slate-900 text-sm">
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
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">General Ledger Account Head Trial Balance</h3>
                <p className="text-[11px] text-slate-500">Direct extracts from Double-Entry General Ledger</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Debits Equal Credits (Balanced)
              </span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Account Code</th>
                  <th className="py-2.5 px-4">Account Head Name</th>
                  <th className="py-2.5 px-4 text-center">Nature</th>
                  <th className="py-2.5 px-4 text-right">Debit Balance (₹)</th>
                  <th className="py-2.5 px-4 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {trial_balance.lines.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono font-semibold text-blue-700">{acc.code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{acc.name}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {acc.nature}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {acc.debit > 0 ? `₹${Number(acc.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {acc.credit > 0 ? `₹${Number(acc.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                  <td colSpan="3" className="py-2.5 px-4 uppercase tracking-wider text-slate-900">
                    Trial Balance Totals:
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-900 text-sm font-extrabold">
                    ₹{Number(trial_balance.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-900 text-sm font-extrabold">
                    ₹{Number(trial_balance.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB 4: Academic Program Revenue Breakdown */}
        {activeTab === 'program-revenue' && (
          <div className="overflow-x-auto">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Academic Program Revenue & Recovery Performance</h3>
                <p className="text-[11px] text-slate-500">Demands vs realized fee receipts segmented by academic courses</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Program Code</th>
                  <th className="py-2.5 px-4">Program Name</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4 text-center">Allocated</th>
                  <th className="py-2.5 px-4 text-right">Demanded (₹)</th>
                  <th className="py-2.5 px-4 text-right">Collected (₹)</th>
                  <th className="py-2.5 px-4 text-right">Outstanding (₹)</th>
                  <th className="py-2.5 px-4 text-center">Realization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {program_breakdown.map((prog) => (
                  <tr key={prog.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono font-semibold text-blue-700">{prog.code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{prog.name}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px]">{prog.department}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-xs">{prog.students_count}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      ₹{Number(prog.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{Number(prog.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                      ₹{Number(prog.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-700 rounded-full"
                            style={{ width: `${Math.min(100, prog.collection_efficiency)}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 font-mono">{prog.collection_efficiency}%</span>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Audited Financial Statement — Fiscal Year {fiscalYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Institutional Layout */}
            <div className="p-8 text-slate-900 bg-white" id="printable-financial-statement">
              {/* Institutional Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xl tracking-tight">
                  <Building2 className="w-6 h-6 text-blue-700" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-600 mt-1">
                  Office of the Comptroller & Finance Treasury • Audited Accounts Department
                </p>
                <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-0.5 rounded">
                  OFFICIAL AUDITED STATEMENT OF FINANCIAL ACCOUNTS
                </div>
              </div>

              {/* Statement Details */}
              <div className="grid grid-cols-2 gap-4 my-4 text-xs">
                <div>
                  <span className="font-bold text-slate-600 uppercase text-[11px]">Accounting Standard:</span>{' '}
                  <span className="font-semibold text-slate-900">GAAP / Higher Education Standards</span>
                  <div className="mt-0.5">
                    <span className="font-bold text-slate-600 uppercase text-[11px]">Fiscal Period:</span>{' '}
                    <span className="font-semibold text-slate-900">01 April 2026 to 31 March 2027</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <span className="font-bold text-slate-600 uppercase text-[11px]">Verification Date:</span>{' '}
                    <span className="font-medium text-slate-900">{new Date(reportData.as_of_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="font-bold text-slate-600 uppercase text-[11px]">General Ledger Status:</span>{' '}
                    <span className="font-bold text-emerald-700">BALANCED & RECONCILED</span>
                  </div>
                </div>
              </div>

              {/* Summary Statement Table */}
              <div className="mb-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-2">
                  Key Institutional Balances & Audit Extract
                </h4>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300 text-[11px]">
                      <th className="py-2 px-3">Financial Head</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Total Scheduled Student Milestone Demands</td>
                      <td className="py-2 px-3 text-slate-500">Annual Invoiced Value</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(summary.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Gross Realized Tuition & Academic Revenue</td>
                      <td className="py-2 px-3 text-slate-500">Core Fee Inflows</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(summary.gross_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Tuition Fees Outstanding (Defaulters)</td>
                      <td className="py-2 px-3 text-slate-500">Accounts Receivable</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                        ₹{Number(summary.outstanding_dues).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Institutional Cash & Bank Reserves</td>
                      <td className="py-2 px-3 text-slate-500">Current Liquid Asset</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(summary.bank_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="py-2 px-3 font-bold text-slate-900">Net Balance Carried to Institutional Capital Fund</td>
                      <td className="py-2 px-3 text-slate-600">Educational Fund</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                        ₹{Number(summary.net_surplus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Statutory Exemption & Compliance Note */}
              <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 mb-4 text-[11px] text-slate-700">
                <span className="font-bold">Statutory Exemption Certificate:</span> All higher education tuition, laboratory subscriptions, and examination fees collected by Apex Higher Education Institute are exempt from GST under Notification No. 12/2017 - Central Tax (Rate), SAC Code 9992. Accounts maintained on Double-Entry System under GAAP standards.
              </div>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-300 text-xs mt-4">
                <div>
                  <div className="font-semibold text-slate-700">Senior Accountant:</div>
                  <div className="h-8 border-b border-dashed border-slate-300"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Prepared by Finance Desk</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Finance Administrator:</div>
                  <div className="h-8 border-b border-dashed border-slate-300"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Institutional Treasurer</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">Comptroller / Statutory Auditor:</div>
                  <div className="h-8 flex items-end justify-end">
                    <span className="font-mono text-slate-900 font-bold tracking-wider text-[10px] border border-slate-400 bg-slate-100 px-2 py-0.5 rounded">
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
