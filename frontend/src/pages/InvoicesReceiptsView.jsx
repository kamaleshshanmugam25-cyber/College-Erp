import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  RefreshCw,
  CreditCard,
  Wallet,
  Landmark,
  ShieldCheck,
  Eye,
  X,
  Building2,
  Calendar,
  Check,
  Copy,
  QrCode
} from 'lucide-react';

// Indian numbering to words converter
function numberToWordsINR(amount) {
  const num = Math.floor(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  return inWords(num).trim() + ' Rupees Only';
}

export function InvoicesReceiptsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('receipts'); // 'receipts' | 'invoices'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState({
    total_invoiced: 0,
    total_collected: 0,
    outstanding_balance: 0,
    total_invoices_count: 0,
    paid_invoices_count: 0,
    pending_invoices_count: 0,
    receipts_count: 0,
    total_receipts_amount: 0,
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);

  // Counter Collection Form with detailed payment attributes
  const [counterForm, setCounterForm] = useState({
    installment_id: '',
    amount: '',
    method: 'UPI',
    upi_ref: '',
    bank_utr: '',
    card_number: '',
    card_holder: '',
    card_expiry: '',
    card_cvv: '',
    card_auth_code: '',
    cash_received: '',
    cash_slip: '',
  });

  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [counterError, setCounterError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoicesList();
      setInvoices(data.invoices || []);
      setReceipts(data.receipts || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load invoices and receipts:', err);
      setError(err.message || 'Failed to retrieve invoices & receipts records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.order_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse = courseFilter === 'ALL' || r.course_code === courseFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [receipts, searchQuery, courseFilter, statusFilter]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !searchQuery ||
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.course_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse = courseFilter === 'ALL' || inv.course_code === courseFilter;
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [invoices, searchQuery, courseFilter, statusFilter]);

  // Unique Courses for filter
  const uniqueCourses = useMemo(() => {
    const set = new Set();
    invoices.forEach((i) => i.course_code && set.add(i.course_code));
    receipts.forEach((r) => r.course_code && set.add(r.course_code));
    return Array.from(set);
  }, [invoices, receipts]);

  // Pending installments for dropdown
  const pendingInstallments = useMemo(() => {
    return invoices.filter((i) => i.balance > 0);
  }, [invoices]);

  const handleOpenCounterModal = (presetInstallment = null) => {
    setCounterError(null);
    const target = presetInstallment || (pendingInstallments.length > 0 ? pendingInstallments[0] : null);
    setCounterForm({
      installment_id: target ? target.id.toString() : '',
      amount: target ? target.balance.toString() : '',
      method: 'UPI',
      upi_ref: '',
      bank_utr: '',
      card_number: '',
      card_holder: target ? target.student_name : '',
      card_expiry: '',
      card_cvv: '',
      card_auth_code: '',
      cash_received: target ? target.balance.toString() : '',
      cash_slip: `CSH-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setShowCounterModal(true);
  };

  const handleInstallmentSelect = (installmentId) => {
    const inst = invoices.find((i) => i.id.toString() === installmentId);
    if (inst) {
      setCounterForm((prev) => ({
        ...prev,
        installment_id: installmentId,
        amount: inst.balance.toString(),
        card_holder: inst.student_name,
        cash_received: inst.balance.toString(),
      }));
    } else {
      setCounterForm((prev) => ({ ...prev, installment_id: installmentId }));
    }
  };

  // Card number formatter
  const handleCardNumberChange = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean;
    setCounterForm((prev) => ({ ...prev, card_number: formatted }));
  };

  const handleRecordCollection = async (e) => {
    e.preventDefault();
    setCounterError(null);

    if (!counterForm.installment_id) {
      setCounterError('Please select a student installment to record payment for.');
      return;
    }

    const amt = parseFloat(counterForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setCounterError('Please enter a valid positive payment amount.');
      return;
    }

    const targetInst = invoices.find((i) => i.id.toString() === counterForm.installment_id);
    if (targetInst && amt > targetInst.balance) {
      setCounterError(`Amount ₹${amt.toLocaleString()} exceeds outstanding installment balance ₹${targetInst.balance.toLocaleString()}.`);
      return;
    }

    let referenceNote = '';
    if (counterForm.method === 'UPI') {
      const upiRef = counterForm.upi_ref.trim() || `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      referenceNote = `UPI QR Payment | Ref/UTR: ${upiRef} | VPA: apex.fees@icici`;
    } else if (counterForm.method === 'NET_BANKING') {
      const utr = counterForm.bank_utr.trim() || `SBIN${Math.floor(100000000 + Math.random() * 900000000)}`;
      referenceNote = `Net Banking (NEFT/RTGS) | UTR: ${utr} | A/C: 50200038912844`;
    } else if (counterForm.method === 'CARD') {
      const last4 = counterForm.card_number.replace(/\s/g, '').slice(-4) || '4210';
      const auth = counterForm.card_auth_code.trim() || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      referenceNote = `Card Payment (•••• ${last4}) | POS Approval: ${auth}`;
    } else {
      const slip = counterForm.cash_slip.trim() || `CSH-${Math.floor(1000 + Math.random() * 9000)}`;
      referenceNote = `Cash Counter Deposit | Slip: ${slip} | Desk: Counter 01`;
    }

    setSubmittingPayment(true);
    try {
      const res = await api.collectCounterFee({
        installment_id: parseInt(counterForm.installment_id, 10),
        amount: amt,
        method: counterForm.method,
        notes: referenceNote,
      });

      setShowCounterModal(false);
      setSuccessToast(`Payment of ₹${amt.toLocaleString()} recorded successfully! Receipt: ${res.receipt?.receipt_number || 'Generated'}`);
      setTimeout(() => setSuccessToast(null), 5000);

      // Refresh data
      await fetchData();

      // Automatically present receipt
      if (res.receipt) {
        setSelectedReceipt(res.receipt);
      }
    } catch (err) {
      console.error('Counter fee collection error:', err);
      setCounterError(err.message || 'Failed to record counter collection.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (activeTab === 'receipts') {
      const headers = ['Receipt Number', 'Student Name', 'Roll No', 'Course', 'Amount (INR)', 'Payment Method', 'Date', 'Status'];
      const rows = filteredReceipts.map((r) => [
        r.receipt_number,
        r.student_name,
        r.roll_no,
        r.course_code,
        r.amount,
        r.method,
        new Date(r.timestamp).toLocaleDateString('en-IN'),
        r.status,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Receipts_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Invoice Number', 'Student Name', 'Roll No', 'Course', 'Installment', 'Due Date', 'Invoiced (INR)', 'Paid (INR)', 'Balance (INR)', 'Status'];
      const rows = filteredInvoices.map((inv) => [
        inv.invoice_number,
        inv.student_name,
        inv.roll_no,
        inv.course_code,
        inv.installment_label,
        inv.due_date,
        inv.amount,
        inv.paid_amount,
        inv.balance,
        inv.status,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Demand_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const selectedInstDetails = useMemo(() => {
    return invoices.find((i) => i.id.toString() === counterForm.installment_id);
  }, [invoices, counterForm.installment_id]);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'bank') {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar - Clean, Simple, Proportional Button Sizes */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices & Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Student fee demand invoices, counter payment collection, and official receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer shadow-sm disabled:opacity-50"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer shadow-sm"
            title="Export current table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenCounterModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Collection</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="text-xs font-semibold underline hover:text-rose-900 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Compact 3-Metric Summary Strip - Simple, Clean, Non-intrusive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Scheduled Demands</div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              ₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            {summary.total_invoices_count || invoices.length} Demands
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Realized Collections</div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              ₹{Number(summary.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            {receipts.length} Receipts
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Institutional Dues</div>
            <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              ₹{Number(summary.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {pendingInstallments.length} Pending
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Navigation Tabs & Filter Bar */}
        <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Official Receipts ({receipts.length})
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demand Invoices ({invoices.length})
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'receipts' ? 'Search receipt #, student...' : 'Search invoice #, student...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">All Programs</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'receipts' ? (
                <>
                  <option value="SUCCESS">Success</option>
                  <option value="RECONCILED">Reconciled</option>
                </>
              ) : (
                <>
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Tab 1: Official Receipts Table */}
        {activeTab === 'receipts' && (
          <div className="overflow-x-auto">
            {filteredReceipts.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Receipts Found</h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL' || courseFilter !== 'ALL'
                    ? 'No receipts match your filter criteria.'
                    : 'No receipts recorded yet.'}
                </p>
                <button
                  onClick={() => handleOpenCounterModal()}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Collect Payment</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Receipt #</th>
                    <th className="py-2.5 px-4">Student & Roll No</th>
                    <th className="py-2.5 px-4">Program</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      {/* Receipt Number */}
                      <td className="py-2.5 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap">
                        {r.receipt_number}
                      </td>

                      {/* Student & Roll No */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{r.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{r.roll_no}</div>
                      </td>

                      {/* Course */}
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800">{r.course_name || r.course_code}</div>
                        <div className="text-[11px] text-slate-400">{r.course_code}</div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          r.method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : r.method === 'UPI'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : r.method === 'CARD'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {r.method || 'CASH'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-medium">
                          {new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Success</span>
                        </span>
                      </td>

                      {/* Action - Clean, Proportional Button */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-md transition cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Demand Invoices Table */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Invoices Found</h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                  No installment demand notes match your filter criteria.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Student & Roll No</th>
                    <th className="py-2.5 px-4">Program & Milestone</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Invoiced (₹)</th>
                    <th className="py-2.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      {/* Invoice Number */}
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {inv.invoice_number}
                      </td>

                      {/* Student & Roll No */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{inv.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{inv.roll_no}</div>
                      </td>

                      {/* Course & Milestone */}
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800">{inv.course_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {inv.installment_label} • <span className="capitalize">{inv.quota_name}</span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="text-slate-700 font-medium">
                          {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {inv.is_overdue && (
                          <span className="inline-block text-[10px] font-semibold text-rose-700 bg-rose-50 px-1 py-0.5 rounded mt-0.5">
                            Overdue
                          </span>
                        )}
                      </td>

                      {/* Invoiced Amount */}
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                        ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-700 whitespace-nowrap">
                        ₹{Number(inv.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance Due */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={inv.balance > 0 ? (inv.is_overdue ? 'text-rose-700' : 'text-amber-700') : 'text-slate-400'}>
                          ₹{Number(inv.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Paid</span>
                          </span>
                        ) : inv.status === 'OVERDUE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Overdue</span>
                          </span>
                        ) : inv.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Partial</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions - Clean, Compact Sizing */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.balance > 0 && (
                            <button
                              onClick={() => handleOpenCounterModal(inv)}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition cursor-pointer"
                              title="Record fee payment collection"
                            >
                              Collect
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md transition cursor-pointer"
                            title="View Demand Notice"
                          >
                            Demand Note
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Official Student Fee Receipt — STRICTLY NO CANCEL BUTTON */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <Receipt className="w-4 h-4 text-blue-400" />
                <span>Official Institutional Fee Receipt — {selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            </div>

            {/* Printable Institutional Receipt Layout */}
            <div className="p-8 text-slate-900 bg-white" id="printable-receipt">
              {/* Institution Header with Crest */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xl tracking-tight">
                  <Building2 className="w-6 h-6 text-blue-700" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-600 mt-1">
                  Office of the Comptroller of Accounts & Student Treasury
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Institutional Campus • Approved by Higher Education Authority • Affiliated Institution
                </p>
                <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-0.5 rounded">
                  OFFICIAL STUDENT FEE RECEIPT
                </div>
              </div>

              {/* Receipt Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 my-4 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Receipt Number:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{selectedReceipt.receipt_number}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Order / Txn ID:</span>{' '}
                    <span className="font-mono text-slate-700">{selectedReceipt.order_id || '—'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Payment Channel:</span>{' '}
                    <span className="font-bold text-slate-900 uppercase">{selectedReceipt.method || 'CASH / UPI'}</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Date & Timestamp:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {new Date(selectedReceipt.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Academic Year:</span>{' '}
                    <span className="font-bold text-slate-900">{selectedReceipt.academic_year || '2026-27'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Status:</span>{' '}
                    <span className="font-bold text-emerald-700">PAID & SETTLED</span>
                  </div>
                </div>
              </div>

              {/* Student Identification Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Student Full Name</div>
                    <div className="font-bold text-slate-900 text-sm">{selectedReceipt.student_name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Register / Roll Number</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{selectedReceipt.roll_no}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Academic Program</div>
                    <div className="font-semibold text-slate-800">{selectedReceipt.course_name} ({selectedReceipt.course_code})</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Bank / Audit Reference</div>
                    <div className="font-mono text-slate-700">{selectedReceipt.gateway_txn_id || selectedReceipt.order_id || 'Verified Counter Slip'}</div>
                  </div>
                </div>
              </div>

              {/* Fee Particulars Table */}
              <table className="w-full text-left border-collapse text-xs mb-4">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2">Particulars / Description</th>
                    <th className="py-2 text-center">SAC Code</th>
                    <th className="py-2 text-center">GST Rate</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">Tuition & Academic Program Fee</div>
                      <div className="text-slate-500 text-[11px]">Scheduled milestone fee recovery for {selectedReceipt.course_name}</div>
                    </td>
                    <td className="py-2.5 text-center font-mono text-slate-700">9992</td>
                    <td className="py-2.5 text-center font-medium text-slate-700">0% (Exempt)</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold">
                    <td colSpan="3" className="py-2.5 text-right uppercase tracking-wider text-slate-900 text-xs">
                      Total Realized Amount:
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-900 text-sm font-extrabold">
                      ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Amount in Words */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4 text-xs">
                <span className="font-bold text-slate-700 uppercase text-[11px]">Amount in Words: </span>
                <span className="font-semibold text-slate-900 italic">
                  {numberToWordsINR(selectedReceipt.amount)}
                </span>
              </div>

              {/* Statutory Exemption Notice */}
              <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 mb-4 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Statutory GST Exemption: </span>
                Educational services and tuition fees are fully exempt from GST under Notification No. 12/2017 - Central Tax (Rate), SAC Code 9992. Accounts maintained on Double-Entry System.
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-3 mt-3 border-t border-slate-200 text-xs">
                <div>
                  <div className="font-semibold text-slate-700">Depositor Signature:</div>
                  <div className="h-8 border-b border-dashed border-slate-300"></div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">Authorized Cashier:</div>
                  <div className="h-8 flex items-end justify-end">
                    <span className="font-mono text-slate-900 font-bold text-[10px] border border-slate-300 bg-slate-100 px-2 py-0.5 rounded">
                      VERIFIED BY APEX ERP TREASURY
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-4">
                Computer-generated official receipt. Valid without physical signature when authenticated with transaction reference.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Demand Invoice Preview & Print */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Demand Invoice Notice — {selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Note</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Demand Notice Layout */}
            <div className="p-8 text-slate-900 bg-white">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xl tracking-tight">
                  <Building2 className="w-6 h-6 text-blue-700" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-600 mt-1">
                  Office of Student Accounts & Finance Treasury
                </p>
                <div className="mt-3 inline-block bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-0.5 rounded">
                  FEE DEMAND NOTICE / INVOICE
                </div>
              </div>

              {/* Demand Details */}
              <div className="grid grid-cols-2 gap-4 my-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Demand Invoice #:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoice_number}</span>
                  <div className="mt-0.5">
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Milestone:</span>{' '}
                    <span className="font-semibold text-slate-900">{selectedInvoice.installment_label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Due Date:</span>{' '}
                    <span className={`font-bold ${selectedInvoice.is_overdue ? 'text-rose-700' : 'text-slate-900'}`}>
                      {new Date(selectedInvoice.due_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <span className="font-bold text-slate-500 uppercase text-[11px]">Status:</span>{' '}
                    <span className="font-bold text-slate-900">{selectedInvoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Student Info Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Student Name</div>
                    <div className="font-bold text-slate-900 text-sm">{selectedInvoice.student_name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Roll / Register No.</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{selectedInvoice.roll_no}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Academic Program</div>
                    <div className="font-medium text-slate-800">{selectedInvoice.course_name} ({selectedInvoice.course_code})</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Quota Category</div>
                    <div className="font-medium text-slate-800 capitalize">{selectedInvoice.quota_name}</div>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <table className="w-full text-left border-collapse text-xs mb-4">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2">Milestone Description</th>
                    <th className="py-2 text-right">Invoiced (₹)</th>
                    <th className="py-2 text-right">Paid (₹)</th>
                    <th className="py-2 text-right">Balance Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">Tuition & Institutional Development Fee</div>
                      <div className="text-slate-500 text-[11px]">Scheduled {selectedInvoice.installment_label} for AY {selectedInvoice.academic_year}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-slate-800">
                      ₹{Number(selectedInvoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-emerald-700">
                      ₹{Number(selectedInvoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-amber-700">
                      ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold text-xs">
                    <td colSpan="3" className="py-2.5 text-right text-slate-900 uppercase tracking-wider">
                      Net Balance Dues:
                    </td>
                    <td className="py-2.5 text-right font-mono text-rose-700 text-sm font-extrabold">
                      ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Channels Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-700" />
                  <span>Approved Payment Options:</span>
                </div>
                <div>1. Campus Front Desk: Cashier counter via UPI QR, Net Banking, Card, or Cash.</div>
                <div>2. Institutional Bank Transfer: State Bank of India, A/C: 50200038912844, IFSC: SBIN0004210.</div>
              </div>

              {selectedInvoice.balance > 0 && (
                <div className="flex justify-end gap-2 print:hidden pt-2">
                  <button
                    onClick={() => {
                      const inv = selectedInvoice;
                      setSelectedInvoice(null);
                      handleOpenCounterModal(inv);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Collect Payment for Demand</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Counter Fee Collection with Scanner, Bank Details & Card Input */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Record Fee Collection</h3>
                  <p className="text-[11px] text-slate-300">Collect student tuition fee & generate receipt</p>
                </div>
              </div>
              <button
                onClick={() => setShowCounterModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordCollection} className="p-5 space-y-3.5 text-xs">
              {counterError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{counterError}</span>
                </div>
              )}

              {/* Installment Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Select Student Installment Demand <span className="text-rose-500">*</span>
                </label>
                <select
                  value={counterForm.installment_id}
                  onChange={(e) => handleInstallmentSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  required
                >
                  <option value="">-- Choose Student Demand --</option>
                  {pendingInstallments.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.student_name} ({inst.roll_no}) — {inst.invoice_number} [Due: ₹{inst.balance.toLocaleString()}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Installment Context Card */}
              {selectedInstDetails && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student & Program:</span>
                    <span className="font-semibold text-slate-900">{selectedInstDetails.student_name} • {selectedInstDetails.course_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Milestone:</span>
                    <span>{selectedInstDetails.installment_label}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                    <span>Outstanding Due Balance:</span>
                    <span className="text-amber-700 font-mono">
                      ₹{selectedInstDetails.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Collection Amount */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Collection Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter collection amount"
                    value={counterForm.amount}
                    onChange={(e) => setCounterForm({ ...counterForm, amount: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                    { id: 'NET_BANKING', label: 'Net Banking', icon: Landmark },
                    { id: 'CARD', label: 'Card', icon: CreditCard },
                    { id: 'CASH', label: 'Cash Desk', icon: Wallet },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = counterForm.method === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setCounterForm({ ...counterForm, method: m.id })}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold ring-1 ring-blue-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC PAYMENT METHOD DETAILS */}

              {/* 1. UPI QR Scanner Box */}
              {counterForm.method === 'UPI' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>Instant UPI Payment Scanner</span>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Zero Surcharge
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                    {/* Visual QR Code Representation */}
                    <div className="w-20 h-20 bg-slate-900 text-white rounded p-1.5 flex flex-col items-center justify-center relative shadow-sm shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                        <rect x="0" y="0" width="30" height="30" fill="white" />
                        <rect x="5" y="5" width="20" height="20" fill="black" />
                        <rect x="9" y="9" width="12" height="12" fill="white" />
                        <rect x="70" y="0" width="30" height="30" fill="white" />
                        <rect x="75" y="5" width="20" height="20" fill="black" />
                        <rect x="79" y="9" width="12" height="12" fill="white" />
                        <rect x="0" y="70" width="30" height="30" fill="white" />
                        <rect x="5" y="75" width="20" height="20" fill="black" />
                        <rect x="9" y="79" width="12" height="12" fill="white" />
                        <rect x="36" y="8" width="6" height="6" fill="white" />
                        <rect x="48" y="14" width="6" height="6" fill="white" />
                        <rect x="40" y="38" width="8" height="8" fill="white" />
                        <rect x="55" y="42" width="6" height="6" fill="white" />
                        <rect x="72" y="72" width="8" height="8" fill="white" />
                        <rect x="42" y="75" width="8" height="8" fill="white" />
                        <rect x="80" y="45" width="6" height="6" fill="white" />
                        <rect x="15" y="45" width="8" height="8" fill="white" />
                        <rect x="50" y="70" width="6" height="6" fill="white" />
                        <rect x="85" y="82" width="6" height="6" fill="white" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-blue-600 text-[8px] font-bold text-white px-1 py-0.5 rounded">
                          UPI
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs flex-1">
                      <div>
                        <div className="text-slate-400 font-semibold uppercase text-[10px]">Institutional UPI ID</div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <span>apex.fees@icici</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('apex.fees@icici', 'upi')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                            title="Copy UPI ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedUpi && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Scan with GPay, PhonePe, Paytm, BHIM, Cred
                      </div>
                      <div className="font-semibold text-blue-700 text-xs">
                        Amount to Collect: ₹{Number(counterForm.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      UPI UTR / 12-Digit Reference ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 329841029384"
                      value={counterForm.upi_ref}
                      onChange={(e) => setCounterForm({ ...counterForm, upi_ref: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 2. Net Banking Institutional Account Details */}
              {counterForm.method === 'NET_BANKING' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Landmark className="w-3.5 h-3.5 text-purple-600" />
                      <span>Official Institutional Bank Account</span>
                    </div>
                    <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      NEFT / RTGS
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-slate-400 uppercase text-[10px]">Beneficiary</div>
                        <div className="font-semibold text-slate-900">Apex Higher Education Institute</div>
                      </div>
                      <div>
                        <div className="text-slate-400 uppercase text-[10px]">Bank & Branch</div>
                        <div className="font-medium text-slate-800">SBI Campus Branch</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-1.5">
                      <div>
                        <div className="text-slate-400 uppercase text-[10px]">Account Number</div>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                          <span>5020 0038 9128 44</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('50200038912844', 'bank')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                            title="Copy Account Number"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedBank && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 uppercase text-[10px]">IFSC Code</div>
                        <div className="font-mono font-bold text-slate-900">SBIN0004210</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bank Transfer Reference / UTR Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN402910482918"
                      value={counterForm.bank_utr}
                      onChange={(e) => setCounterForm({ ...counterForm, bank_utr: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 3. Debit / Credit Card Fields */}
              {counterForm.method === 'CARD' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      <span>Card POS Terminal Collection</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Visa / Mastercard / RuPay</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        16-Digit Card Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="4532 8901 2345 6789"
                        maxLength={19}
                        value={counterForm.card_number}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider text-slate-900"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          placeholder="Name on card"
                          value={counterForm.card_holder}
                          onChange={(e) => setCounterForm({ ...counterForm, card_holder: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          POS Auth / Terminal Slip # <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. AUTH-849201"
                          value={counterForm.card_auth_code}
                          onChange={(e) => setCounterForm({ ...counterForm, card_auth_code: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Cash Desk Box */}
              {counterForm.method === 'CASH' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Physical Cash Desk Collection</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Counter Desk 01</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cash Tendered (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Amount received"
                        value={counterForm.cash_received}
                        onChange={(e) => setCounterForm({ ...counterForm, cash_received: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Physical Cash Slip #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CSH-4021"
                        value={counterForm.cash_slip}
                        onChange={(e) => setCounterForm({ ...counterForm, cash_slip: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  {counterForm.cash_received && counterForm.amount && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs flex justify-between font-semibold text-emerald-900">
                      <span>Change to Return:</span>
                      <span className="font-mono font-bold">
                        ₹{Math.max(0, parseFloat(counterForm.cash_received || 0) - parseFloat(counterForm.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Form Action Buttons - Compact & Balanced */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Issue Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoicesReceiptsView;
