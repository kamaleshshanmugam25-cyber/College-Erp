import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  BookOpen,
  Scale,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles
} from 'lucide-react';

export function LedgerView() {
  const [activeSubTab, setActiveSubTab] = useState('general'); // 'general' | 'vouchers'
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [accountBalances, setAccountBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [selectedVoucherType, setSelectedVoucherType] = useState('ALL');

  // Modal for new voucher posting
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    voucher_type: 'JOURNAL',
    date: new Date().toISOString().split('T')[0],
    narration: '',
    reference: '',
    entries: [
      { account_group: 'SALARY_EXPENSE', debit: '10000', credit: '0' },
      { account_group: 'BANK', debit: '0', credit: '10000' }
    ]
  });
  const [submittingVoucher, setSubmittingVoucher] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [glRes, jvRes, abRes] = await Promise.all([
        api.getGeneralLedger().catch(() => []),
        api.getJournalVouchers().catch(() => []),
        api.getAccountBalances().catch(() => []),
      ]);
      setLedgerEntries(Array.isArray(glRes) ? glRes : (glRes.results || []));
      setVouchers(Array.isArray(jvRes) ? jvRes : (jvRes.results || []));
      setAccountBalances(abRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddLine = () => {
    setVoucherForm({
      ...voucherForm,
      entries: [...voucherForm.entries, { account_group: 'BANK', debit: '0', credit: '0' }]
    });
  };

  const handleRemoveLine = (idx) => {
    if (voucherForm.entries.length <= 2) {
      alert('A double-entry voucher must contain at least 2 lines (Debit & Credit).');
      return;
    }
    const updated = [...voucherForm.entries];
    updated.splice(idx, 1);
    setVoucherForm({ ...voucherForm, entries: updated });
  };

  const handleLineChange = (idx, field, val) => {
    const updated = [...voucherForm.entries];
    updated[idx][field] = val;
    setVoucherForm({ ...voucherForm, entries: updated });
  };

  const calcTotalDebit = () => {
    return voucherForm.entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  };

  const calcTotalCredit = () => {
    return voucherForm.entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
  };

  const handlePostVoucherSubmit = async (e) => {
    e.preventDefault();
    const totDr = calcTotalDebit();
    const totCr = calcTotalCredit();

    if (Math.abs(totDr - totCr) > 0.001) {
      alert(`Unbalanced Voucher! Total Debit (₹${totDr}) must equal Total Credit (₹${totCr}).`);
      return;
    }

    setSubmittingVoucher(true);
    try {
      await api.createJournalVoucher({
        voucher_type: voucherForm.voucher_type,
        date: voucherForm.date,
        narration: voucherForm.narration.trim(),
        reference: voucherForm.reference.trim(),
        entries: voucherForm.entries.map(e => ({
          account_group: e.account_group,
          debit: parseFloat(e.debit) || 0,
          credit: parseFloat(e.credit) || 0,
        }))
      });
      alert('Journal Voucher posted successfully!');
      setShowVoucherModal(false);
      loadData();
    } catch (err) {
      alert(`Voucher posting failed: ${err.message}`);
    } finally {
      setSubmittingVoucher(false);
    }
  };

  // Filtered General Ledger lines
  const filteredLedger = ledgerEntries.filter((item) => {
    const matchesSearch =
      !search ||
      item.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
      item.narration?.toLowerCase().includes(search.toLowerCase()) ||
      item.account_group_display?.toLowerCase().includes(search.toLowerCase());

    const matchesGroup = selectedGroupFilter === 'ALL' || item.account_group === selectedGroupFilter;
    const matchesType = selectedVoucherType === 'ALL' || item.voucher_type === selectedVoucherType;

    return matchesSearch && matchesGroup && matchesType;
  });

  // Filtered Vouchers
  const filteredVouchers = vouchers.filter((v) => {
    const matchesSearch =
      !search ||
      v.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
      v.narration?.toLowerCase().includes(search.toLowerCase()) ||
      v.reference?.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedVoucherType === 'ALL' || v.voucher_type === selectedVoucherType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            <span>Financial Accounting</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">General & Journal Ledger</h1>
          <p className="text-xs text-slate-500">
            Double-entry transaction postings, account balances, and immutable journal vouchers
          </p>

        </div>

        <button
          onClick={() => setShowVoucherModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Post Double-Entry Voucher</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Account Balances Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {accountBalances.map((ab) => (
          <div key={ab.account_group} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{ab.label}</div>
            <div className={`text-base font-black ${ab.balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              ₹{Number(ab.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Running Balance</div>
          </div>
        ))}
      </div>

      {/* Sub Tabs & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('general')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'general'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              General Ledger Transactions ({filteredLedger.length})
            </button>
            <button
              onClick={() => setActiveSubTab('vouchers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'vouchers'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Journal Vouchers Log ({filteredVouchers.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search narration, voucher #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Voucher Type:</span>
            <select
              value={selectedVoucherType}
              onChange={(e) => setSelectedVoucherType(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800"
            >
              <option value="ALL">All Types</option>
              <option value="RECEIPT">Receipt (RV)</option>
              <option value="PAYMENT">Payment (PV)</option>
              <option value="JOURNAL">Journal (JV)</option>
            </select>
          </div>

          {activeSubTab === 'general' && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Account Group:</span>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="px-2.5 py-1 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-800"
              >
                <option value="ALL">All Account Groups</option>
                <option value="BANK">Bank & Cash</option>
                <option value="FEE_INCOME">Fee Income</option>
                <option value="SALARY_EXPENSE">Salary Expense</option>
                <option value="VENDOR_EXPENSE">Vendor / Operating Expense</option>
                <option value="PF_PAYABLE">PF Payable</option>
                <option value="ESI_PAYABLE">ESI Payable</option>
                <option value="TDS_PAYABLE">TDS Payable</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content Section 1: General Ledger Table */}
      {activeSubTab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>General Ledger Posting Register</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{filteredLedger.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Posting Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Voucher Type</th>
                  <th className="py-2.5 px-3">Account Group</th>
                  <th className="py-2.5 px-3 text-right">Debit (Dr)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Cr)</th>
                  <th className="py-2.5 px-3 text-right">Running Balance</th>
                  <th className="py-2.5 px-3">Narration / Particulars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 font-medium">
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{row.date}</td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">{row.voucher_no}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.voucher_type === 'RECEIPT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.voucher_type === 'PAYMENT'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {row.voucher_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">{row.account_group_display || row.account_group}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {Number(row.debit) > 0 ? `₹${Number(row.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {Number(row.credit) > 0 ? `₹${Number(row.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-900 bg-slate-50/50">
                      ₹{Number(row.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs truncate">{row.narration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Section 2: Journal Vouchers Log */}
      {activeSubTab === 'vouchers' && (
        <div className="space-y-4">
          {filteredVouchers.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-indigo-700">{v.voucher_no}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                    v.voucher_type === 'RECEIPT'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : v.voucher_type === 'PAYMENT'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-purple-100 text-purple-800 border border-purple-300'
                  }`}>
                    {v.voucher_type} VOUCHER
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{v.date}</span>
                </div>

                <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                  Total Dr = Cr = ₹{Number(v.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-xs text-slate-700">
                <strong>Narration:</strong> {v.narration || 'No narration provided.'}
                {v.reference && (
                  <span className="ml-2 text-slate-500 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                    Ref: {v.reference}
                  </span>
                )}
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Account Group</th>
                      <th className="py-2 px-3 text-right">Debit (Dr)</th>
                      <th className="py-2 px-3 text-right">Credit (Cr)</th>
                      <th className="py-2 px-3 text-right">Post-Transaction Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {v.lines?.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-100/50">
                        <td className="py-2 px-3 font-bold text-slate-800">{line.account_group_display || line.account_group}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {Number(line.debit) > 0 ? `₹${Number(line.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {Number(line.credit) > 0 ? `₹${Number(line.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 text-[11px]">
                          ₹{Number(line.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Double-Entry Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Post Atomic Double-Entry Voucher</span>
              </h3>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePostVoucherSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voucher Type</label>
                  <select
                    value={voucherForm.voucher_type}
                    onChange={(e) => setVoucherForm({ ...voucherForm, voucher_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  >
                    <option value="JOURNAL">Journal (JV)</option>
                    <option value="PAYMENT">Payment (PV)</option>
                    <option value="RECEIPT">Receipt (RV)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Posting Date</label>
                  <input
                    type="date"
                    required
                    value={voucherForm.date}
                    onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. inv:2026-99"
                    value={voucherForm.reference}
                    onChange={(e) => setVoucherForm({ ...voucherForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Narration / Particulars</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Provisioning quarterly library subscription..."
                  value={voucherForm.narration}
                  onChange={(e) => setVoucherForm({ ...voucherForm, narration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
              </div>

              {/* Double-Entry Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Voucher Line Items (Dr = Cr)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {voucherForm.entries.map((entry, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/60 flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex-1 w-full">
                        <select
                          value={entry.account_group}
                          onChange={(e) => handleLineChange(idx, 'account_group', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-900"
                        >
                          <option value="BANK">Bank & Cash</option>
                          <option value="FEE_INCOME">Fee Income</option>
                          <option value="SALARY_EXPENSE">Salary Expense</option>
                          <option value="VENDOR_EXPENSE">Vendor / Operating Expense</option>
                          <option value="PF_PAYABLE">PF Payable</option>
                          <option value="ESI_PAYABLE">ESI Payable</option>
                          <option value="TDS_PAYABLE">TDS Payable</option>
                        </select>
                      </div>

                      <div className="w-full sm:w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Debit (Dr)"
                          value={entry.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-900"
                        />
                      </div>

                      <div className="w-full sm:w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Credit (Cr)"
                          value={entry.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-900"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-500 hover:text-red-700 font-bold px-1 text-sm cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Validation status bar */}
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-mono">
                  <div>
                    Total Debit: <span className="font-bold text-emerald-400">₹{calcTotalDebit().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    Total Credit: <span className="font-bold text-emerald-400">₹{calcTotalCredit().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    Status:{' '}
                    {Math.abs(calcTotalDebit() - calcTotalCredit()) < 0.001 ? (
                      <span className="text-emerald-400 font-bold">BALANCED ✓</span>
                    ) : (
                      <span className="text-red-400 font-bold">UNBALANCED ({Math.abs(calcTotalDebit() - calcTotalCredit()).toFixed(2)})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVoucher}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {submittingVoucher ? 'Posting...' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
