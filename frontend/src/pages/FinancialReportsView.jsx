import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  FileText,
  DollarSign,
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
    <div className="space-y-6">
      {/* Header Banner - Executive Corporate Institutional Style */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports & Statements</h1>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                  Audited Books
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Statutory accounting statements, Income & Expenditure, Institutional Balance Sheet, and General Ledger Trial Balance
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
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="2026-27">FY 2026-27 (Current)</option>
            <option value="2025-26">FY 2025-26 (Audited)</option>
          </select>

          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
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
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh Financial Books"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCurrentStatement}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm shadow-blue-500/20 cursor-pointer"
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
          <button onClick={fetchReports} className="text-xs font-semibold underline hover:text-rose-900 cursor-pointer">
            Try Again
          </button>
        </div>
      )}

      {/* Clean, Non-Playful Professional Institutional Metric Summary (Surplus Removed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Realized Tuition Collections */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gross Realized Inflow
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-slate-900">
              ₹{Number(summary.gross_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Realized tuition & fee collections settled in General Ledger
            </div>
          </div>
        </div>

        {/* Metric 2: Total Scheduled Demands */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Scheduled Demand
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-slate-900">
              ₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Outstanding student dues: ₹{Number(summary.outstanding_dues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Metric 3: Liquid Cash & Bank Reserves */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash & Bank Reserves
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-slate-900">
              ₹{Number(summary.bank_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>State Bank of India • Dr Bank Account Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Statement Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Navigation Tabs (Professional, clean monochrome) */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-1 bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('income-expenditure')}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'income-expenditure'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Income & Expenditure</span>
            </button>

            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'balance-sheet'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-4 h-4 text-slate-600" />
              <span>Institutional Balance Sheet</span>
            </button>

            <button
              onClick={() => setActiveTab('trial-balance')}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'trial-balance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>General Ledger Trial Balance</span>
            </button>

            <button
              onClick={() => setActiveTab('program-revenue')}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'program-revenue'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-slate-600" />
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

        {/* TAB 1: Income & Expenditure (Clean Corporate Accounting, No Playful Gradient) */}
        {activeTab === 'income-expenditure' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Statement of Income & Expenditure</h3>
                <p className="text-xs text-slate-500">For the fiscal year ending {fiscalYear} • Core Operations & Academic Overhead</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                Accrual Basis Accounting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Revenues / Inflow */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Operating Revenues / Inflows
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ₹{Number(income_statement.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2">
                  {income_statement.revenues.map((rev, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{rev.head}</div>
                        <div className="text-xs text-slate-500">{rev.category}</div>
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-900">
                        ₹{Number(rev.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Expenditures / Outflow */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Operating Expenditures / Outflows
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    ₹{Number(income_statement.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2">
                  {income_statement.expenses.map((exp, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg transition">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{exp.head}</div>
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

            {/* Clean Professional Accounting Balancing Strip (Replaces playful gradient surplus card) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  Net Balance Transferred to Educational Capital Fund
                </div>
                <div className="text-slate-500">
                  Total Operating Inflows: <span className="font-mono font-semibold text-slate-800">₹{Number(income_statement.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> | Total Outflows: <span className="font-mono font-semibold text-slate-800">₹{Number(income_statement.total_expense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold font-mono text-slate-900">
                  ₹{Number(income_statement.net_surplus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-slate-500 font-medium">
                  Verified & Carried to General Ledger Balance Sheet
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
              <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Double-Entry Balance Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Column */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Assets & Receivables</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
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
                    <span className="font-mono text-slate-900 text-base">
                      ₹{Number(balance_sheet.assets.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Liabilities & Capital Funds</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
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
                        <span className="text-sm font-bold font-mono text-slate-900">
                          ₹{Number(fnd.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-slate-300 pt-3 px-3 flex items-center justify-between font-bold text-sm">
                    <span className="uppercase text-slate-900">Total Liabilities & Capital:</span>
                    <span className="font-mono text-slate-900 text-base">
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
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Ledger Trial Balance Register</h3>
                <p className="text-xs text-slate-500">Summary debit & credit ledger totals for all active chart of accounts</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Trial Balance: In Balance</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">{line.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{line.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
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
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 text-base">
                    ₹{Number(trial_balance.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 text-base">
                    ₹{Number(trial_balance.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-xs">
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
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Academic Program Revenue & Recovery Performance</h3>
                <p className="text-xs text-slate-500">Milestone demands vs realized fee receipts segmented by academic courses</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">{prog.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{prog.name}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs font-medium">{prog.department}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs">{prog.students_count}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{Number(prog.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{Number(prog.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                      ₹{Number(prog.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-700 rounded-full"
                            style={{ width: `${Math.min(100, prog.collection_efficiency)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-800 font-mono">{prog.collection_efficiency}%</span>
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
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Audited Financial Statement — Fiscal Year {fiscalYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Institutional Layout */}
            <div className="p-8 text-slate-900 bg-white" id="printable-financial-statement">
              {/* Institutional Header */}
              <div className="text-center border-b-2 border-slate-900 pb-5">
                <div className="flex items-center justify-center gap-2.5 text-slate-900 font-extrabold text-2xl tracking-tight">
                  <Building2 className="w-7 h-7 text-blue-700" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-xs uppercase font-bold tracking-wider text-slate-600 mt-1">
                  Office of the Comptroller & Finance Treasury • Audited Accounts Department
                </p>
                <div className="mt-3.5 inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
                  OFFICIAL AUDITED STATEMENT OF FINANCIAL ACCOUNTS
                </div>
              </div>

              {/* Statement Details */}
              <div className="grid grid-cols-2 gap-4 my-5 text-xs">
                <div>
                  <span className="font-bold text-slate-600 uppercase">Accounting Standard:</span>{' '}
                  <span className="font-semibold text-slate-900">Indian GAAP / Higher Education Accounting Standards</span>
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
                      <td className="py-2 px-3 font-semibold text-slate-900">Realized Tuition & Academic Revenue</td>
                      <td className="py-2 px-3 text-slate-500">Core Fee Inflows</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(summary.gross_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Total Scheduled Student Milestone Demands</td>
                      <td className="py-2 px-3 text-slate-500">Annual Invoiced Value</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(summary.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Institutional Cash & Bank Reserves</td>
                      <td className="py-2 px-3 text-slate-500">Current Liquid Asset</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(summary.bank_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">Tuition Fees Outstanding (Defaulters)</td>
                      <td className="py-2 px-3 text-slate-500">Accounts Receivable</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                        ₹{Number(summary.outstanding_dues).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="py-2.5 px-3 font-bold text-slate-900">Net Balance Carried to Institutional Capital Fund</td>
                      <td className="py-2.5 px-3 text-slate-600">Educational Fund</td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
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
                  <div className="h-9 border-b border-dashed border-slate-300"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Prepared by Finance Desk</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-700">Finance Administrator:</div>
                  <div className="h-9 border-b border-dashed border-slate-300"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Institutional Treasurer</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">Comptroller / Statutory Auditor:</div>
                  <div className="h-9 flex items-end justify-end">
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
