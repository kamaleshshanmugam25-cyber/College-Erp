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
  User,
  DollarSign,
  Check,
  ChevronRight,
  Copy,
  QrCode,
  Smartphone
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
    // UPI fields
    upi_ref: '',
    // Net Banking fields
    bank_utr: '',
    // Card fields
    card_number: '',
    card_holder: '',
    card_expiry: '',
    card_cvv: '',
    card_auth_code: '',
    // Cash fields
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

    // Build rich reference notes according to selected payment method
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
      setSuccessToast(`Payment of ₹${amt.toLocaleString()} recorded successfully! Official Receipt: ${res.receipt?.receipt_number || 'Generated'}`);
      setTimeout(() => setSuccessToast(null), 6000);

      // Refresh data
      await fetchData();

      // Automatically present the official receipt for printing/saving
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
      const headers = ['Receipt Number', 'Student Name', 'Roll No', 'Course', 'Amount (INR)', 'Payment Method', 'Order ID', 'Date & Time', 'Status'];
      const rows = filteredReceipts.map((r) => [
        r.receipt_number,
        r.student_name,
        r.roll_no,
        r.course_code,
        r.amount,
        r.method,
        r.order_id,
        new Date(r.timestamp).toLocaleString(),
        r.status,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((x) => `"${x || ''}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Apex_Official_Receipts_${new Date().toISOString().slice(0, 10)}.csv`);
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
      link.setAttribute('download', `Apex_Demand_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
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
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-700 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-emerald-600 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner - Sleek Institutional Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
              <Receipt className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Official Receipts</h1>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                  Treasury Desk
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Institutional tuition demand billing, counter payment collections & statutory GST-exempt receipts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh Ledger Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenCounterModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Counter Collection</span>
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
          <button onClick={fetchData} className="text-xs font-semibold underline hover:text-rose-900 cursor-pointer">
            Try Again
          </button>
        </div>
      )}

      {/* Clean, Executive Institutional Metric Summary (Replaces playful cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Invoiced Demands */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Scheduled Tuition Demands (Annual Invoiced)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              ₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Academic Year 2026-27 • Across approved quota schedules
            </div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Realized Collections */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Realized Collections (Settled & Audited)
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              ₹{Number(summary.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified in General Ledger (Dr Bank / Cr Fee Income)</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Landmark className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab Switcher & Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          {/* Dual Tabs (Clean, professional, without oversized playful badges) */}
          <div className="flex items-center p-1 bg-slate-200 rounded-xl self-start">
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Official Receipts</span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-700" />
              <span>Demand Invoices</span>
            </button>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'receipts' ? 'Search receipt #, student, roll no...' : 'Search invoice #, student, roll no...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">All Programs</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'receipts' ? (
                <>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="RECONCILED">RECONCILED</option>
                </>
              ) : (
                <>
                  <option value="PENDING">PENDING</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="PAID">PAID</option>
                  <option value="OVERDUE">OVERDUE</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Tab 1: Official Receipts Content */}
        {activeTab === 'receipts' && (
          <div className="overflow-x-auto">
            {filteredReceipts.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No Receipts Found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL' || courseFilter !== 'ALL'
                    ? 'No receipts match your filter criteria. Try resetting search filters.'
                    : 'No payment receipts recorded yet. Use "Record Counter Collection" above to collect fee payments.'}
                </p>
                <button
                  onClick={() => handleOpenCounterModal()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Collect Counter Fee</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Receipt #</th>
                    <th className="py-3.5 px-4">Student & Roll No</th>
                    <th className="py-3.5 px-4">Program / Course</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      {/* Receipt Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-slate-400" />
                          <span>{r.receipt_number}</span>
                        </div>
                      </td>

                      {/* Student & Roll No */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{r.student_name}</div>
                        <div className="text-xs font-mono text-slate-500">{r.roll_no}</div>
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">{r.course_name}</div>
                        <div className="text-xs text-slate-500">{r.course_code} • {r.academic_year || '2026-27'}</div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {r.method === 'CASH' ? (
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                          ) : r.method === 'CARD' ? (
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Landmark className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span>{r.method}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>SUCCESS</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                          title="View Official Institutional Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Demand Invoices Content */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No Invoices Found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  No installment demand notes match your search filters.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Student & Roll No</th>
                    <th className="py-3.5 px-4">Program & Milestone</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Invoiced (₹)</th>
                    <th className="py-3.5 px-4 text-right">Paid (₹)</th>
                    <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{inv.invoice_number}</span>
                        </div>
                      </td>

                      {/* Student & Roll No */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{inv.student_name}</div>
                        <div className="text-xs font-mono text-slate-500">{inv.roll_no}</div>
                      </td>

                      {/* Course & Milestone */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">{inv.course_name}</div>
                        <div className="text-xs text-slate-500">
                          {inv.installment_label} • <span className="capitalize">{inv.quota_name}</span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {inv.is_overdue && (
                          <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5">
                            OVERDUE
                          </span>
                        )}
                      </td>

                      {/* Invoiced Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                        ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-700 whitespace-nowrap">
                        ₹{Number(inv.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={inv.balance > 0 ? (inv.is_overdue ? 'text-rose-700' : 'text-amber-700') : 'text-slate-400'}>
                          ₹{Number(inv.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>PAID</span>
                          </span>
                        ) : inv.status === 'OVERDUE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>OVERDUE</span>
                          </span>
                        ) : inv.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>PARTIAL</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {inv.balance > 0 && (
                            <button
                              onClick={() => handleOpenCounterModal(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm cursor-pointer"
                              title="Record fee payment collection for this student"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Collect Fee</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            title="View Demand Notice"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Demand Note</span>
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

      {/* MODAL 1: Official Student Fee Receipt — STRICTLY CANNOT HAVE CANCEL BUTTON */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header — Action is Print or Close, NEVER Cancel */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Receipt className="w-4 h-4 text-blue-400" />
                <span>Official Institutional Fee Receipt — {selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                  title="Close Receipt View"
                >
                  Close Receipt
                </button>
              </div>
            </div>

            {/* Printable Institutional Receipt Layout */}
            <div className="p-8 text-slate-900 bg-white" id="printable-receipt">
              {/* Institution Header with Crest */}
              <div className="text-center border-b-2 border-slate-900 pb-5">
                <div className="flex items-center justify-center gap-2.5 text-slate-900 font-extrabold text-2xl tracking-tight">
                  <Building2 className="w-7 h-7 text-blue-700" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-xs uppercase font-bold tracking-wider text-slate-600 mt-1">
                  Office of the Comptroller of Accounts & Student Treasury
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional Campus • Approved by Higher Education Authority • Affiliated Institution
                </p>
                <div className="mt-3.5 inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
                  OFFICIAL STUDENT FEE RECEIPT
                </div>
              </div>

              {/* Receipt Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 my-5 text-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="font-bold text-slate-500 uppercase">Receipt Number:</span>{' '}
                    <span className="font-mono font-extrabold text-slate-900 text-sm">{selectedReceipt.receipt_number}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase">Order / Transaction ID:</span>{' '}
                    <span className="font-mono text-slate-700">{selectedReceipt.order_id || '—'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase">Payment Channel:</span>{' '}
                    <span className="font-bold text-slate-900 uppercase">{selectedReceipt.method || 'CASH / UPI'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <div>
                    <span className="font-bold text-slate-500 uppercase">Date & Timestamp:</span>{' '}
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
                    <span className="font-bold text-slate-500 uppercase">Academic Year:</span>{' '}
                    <span className="font-bold text-slate-900">{selectedReceipt.academic_year || '2026-27'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase">Audit Status:</span>{' '}
                    <span className="font-extrabold text-emerald-700">PAID & SETTLED</span>
                  </div>
                </div>
              </div>

              {/* Student Identification Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Student Full Name</div>
                    <div className="font-bold text-slate-900 text-sm">{selectedReceipt.student_name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Register / Roll Number</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{selectedReceipt.roll_no}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Academic Program / Department</div>
                    <div className="font-semibold text-slate-800">{selectedReceipt.course_name} ({selectedReceipt.course_code})</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Audit / Bank Reference</div>
                    <div className="font-mono text-slate-700">{selectedReceipt.gateway_txn_id || selectedReceipt.order_id || 'Verified Counter Slip'}</div>
                  </div>
                </div>
              </div>

              {/* Fee Particulars Table */}
              <table className="w-full text-left border-collapse text-xs mb-5">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="py-2">Particulars / Description</th>
                    <th className="py-2 text-center">SAC Code</th>
                    <th className="py-2 text-center">GST Rate</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3">
                      <div className="font-bold text-slate-900">Tuition & Academic Program Fee</div>
                      <div className="text-slate-500 text-[11px]">Scheduled milestone fee recovery for {selectedReceipt.course_name}</div>
                    </td>
                    <td className="py-3 text-center font-mono text-slate-700">9992</td>
                    <td className="py-3 text-center font-medium text-slate-700">0% (Exempt)</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 text-sm">
                      ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold text-sm">
                    <td colSpan="3" className="py-3 text-right uppercase tracking-wider text-slate-900">
                      Total Realized Amount:
                    </td>
                    <td className="py-3 text-right font-mono text-slate-900 text-base font-extrabold">
                      ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Amount in Words */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-xs">
                <span className="font-bold text-slate-700 uppercase">Amount in Words: </span>
                <span className="font-semibold text-slate-900 italic">
                  {numberToWordsINR(selectedReceipt.amount)}
                </span>
              </div>

              {/* Statutory Exemption & Legal Verification Notice */}
              <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 mb-5 text-[11px] text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Statutory Exemption Certificate:</span>
                </div>
                Tuition, academic examinations, and educational services are fully exempt from Goods and Services Tax (GST) under Notification No. 12/2017 - Central Tax (Rate), SAC Code 9992. Accounts maintained on Double-Entry Accounting System.
              </div>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-2 gap-8 pt-4 mt-4 border-t border-slate-200 text-xs">
                <div>
                  <div className="font-semibold text-slate-700">Depositor / Student Signature:</div>
                  <div className="h-9 border-b border-dashed border-slate-300"></div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">Authorized Cashier / Finance Officer:</div>
                  <div className="h-9 flex items-end justify-end">
                    <span className="font-mono text-slate-900 font-bold tracking-wider text-[10px] border border-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      VERIFIED BY APEX ERP TREASURY
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-5">
                Computer-generated official receipt. Valid without physical signature when authenticated with institutional transaction reference.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Demand Invoice Preview & Print */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Demand Invoice Notice — {selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Demand Note</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Demand Notice Layout */}
            <div className="p-8 text-slate-900 bg-white">
              <div className="text-center border-b-2 border-slate-900 pb-5">
                <div className="flex items-center justify-center gap-2.5 text-slate-900 font-extrabold text-2xl tracking-tight">
                  <Building2 className="w-7 h-7 text-blue-700" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-xs uppercase font-bold tracking-wider text-slate-600 mt-1">
                  Office of Student Accounts & Finance Treasury
                </p>
                <div className="mt-3.5 inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
                  FEE DEMAND NOTICE / INVOICE
                </div>
              </div>

              {/* Demand Details */}
              <div className="grid grid-cols-2 gap-4 my-5 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase">Demand Invoice #:</span>{' '}
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedInvoice.invoice_number}</span>
                  <div className="mt-1">
                    <span className="font-bold text-slate-500 uppercase">Milestone Sequence:</span>{' '}
                    <span className="font-semibold text-slate-900">{selectedInvoice.installment_label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <span className="font-bold text-slate-500 uppercase">Due Date:</span>{' '}
                    <span className={`font-bold ${selectedInvoice.is_overdue ? 'text-rose-700' : 'text-slate-900'}`}>
                      {new Date(selectedInvoice.due_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="font-bold text-slate-500 uppercase">Status:</span>{' '}
                    <span className="font-bold text-slate-900">{selectedInvoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Student Info Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Student Name</div>
                    <div className="font-bold text-slate-900 text-sm">{selectedInvoice.student_name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Roll / Register No.</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{selectedInvoice.roll_no}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Academic Program</div>
                    <div className="font-medium text-slate-800">{selectedInvoice.course_name} ({selectedInvoice.course_code})</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Quota Category</div>
                    <div className="font-medium text-slate-800 capitalize">{selectedInvoice.quota_name}</div>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <table className="w-full text-left border-collapse text-xs mb-5">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="py-2">Milestone Description</th>
                    <th className="py-2 text-right">Invoiced (₹)</th>
                    <th className="py-2 text-right">Paid (₹)</th>
                    <th className="py-2 text-right">Balance Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3">
                      <div className="font-bold text-slate-900">Tuition & Institutional Development Fee</div>
                      <div className="text-slate-500 text-[11px]">Scheduled {selectedInvoice.installment_label} for Academic Year {selectedInvoice.academic_year}</div>
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-slate-800">
                      ₹{Number(selectedInvoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-emerald-700">
                      ₹{Number(selectedInvoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700">
                      ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold text-sm">
                    <td colSpan="3" className="py-3 text-right text-slate-900 uppercase tracking-wider">
                      Net Payable Dues:
                    </td>
                    <td className="py-3 text-right font-mono text-rose-700 text-base font-extrabold">
                      ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs text-slate-700 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Landmark className="w-4 h-4 text-blue-700" />
                  <span>Approved Payment Channels:</span>
                </div>
                <div>1. Campus Front Desk: Cashier collection via UPI QR, Net Banking, Card, or Cash.</div>
                <div>2. Online via Student Portal: Instant UPI & Net Banking payment gateway.</div>
                <div>3. Institutional Bank Transfer: State Bank of India, A/C: 50200038912844, IFSC: SBIN0004210.</div>
              </div>

              {/* Action button inside modal */}
              {selectedInvoice.balance > 0 && (
                <div className="flex justify-end gap-3 print:hidden pt-2">
                  <button
                    onClick={() => {
                      const inv = selectedInvoice;
                      setSelectedInvoice(null);
                      handleOpenCounterModal(inv);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Collect Payment for this Demand</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Professional Counter Fee Collection with Scanner, Bank Account Details & Card Fields */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Record Fee Collection</h3>
                  <p className="text-xs text-slate-300">Collect institutional tuition fee & generate authentic receipt</p>
                </div>
              </div>
              <button
                onClick={() => setShowCounterModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordCollection} className="p-6 space-y-4">
              {counterError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{counterError}</span>
                </div>
              )}

              {/* Installment Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Student Installment Demand <span className="text-rose-500">*</span>
                </label>
                <select
                  value={counterForm.installment_id}
                  onChange={(e) => handleInstallmentSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
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
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Student & Program:</span>
                    <span className="font-bold text-slate-900">{selectedInstDetails.student_name} • {selectedInstDetails.course_name} ({selectedInstDetails.course_code})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Milestone Sequence:</span>
                    <span>{selectedInstDetails.installment_label}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                    <span>Outstanding Due Balance:</span>
                    <span className="text-amber-700 font-mono text-sm">
                      ₹{selectedInstDetails.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Collection Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Collection Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount collected"
                    value={counterForm.amount}
                    onChange={(e) => setCounterForm({ ...counterForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                    { id: 'NET_BANKING', label: 'Net Banking', icon: Landmark },
                    { id: 'CARD', label: 'Debit / Credit', icon: CreditCard },
                    { id: 'CASH', label: 'Cash Counter', icon: Wallet },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = counterForm.method === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setCounterForm({ ...counterForm, method: m.id })}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC PAYMENT METHOD DETAILS */}

              {/* 1. UPI QR Scanner Box */}
              {counterForm.method === 'UPI' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <span>Instant UPI Payment Scanner</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Zero Surcharge
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-lg border border-slate-200">
                    {/* Visual QR Code Representation */}
                    <div className="w-28 h-28 bg-slate-900 text-white rounded-lg p-2 flex flex-col items-center justify-center relative shadow-sm shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                        {/* Realistic QR pattern */}
                        <rect x="0" y="0" width="30" height="30" fill="white" />
                        <rect x="5" y="5" width="20" height="20" fill="black" />
                        <rect x="9" y="9" width="12" height="12" fill="white" />

                        <rect x="70" y="0" width="30" height="30" fill="white" />
                        <rect x="75" y="5" width="20" height="20" fill="black" />
                        <rect x="79" y="9" width="12" height="12" fill="white" />

                        <rect x="0" y="70" width="30" height="30" fill="white" />
                        <rect x="5" y="75" width="20" height="20" fill="black" />
                        <rect x="9" y="79" width="12" height="12" fill="white" />

                        {/* Data dots */}
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
                        <div className="bg-blue-600 text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded shadow">
                          UPI
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs flex-1">
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
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {copiedUpi && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600">
                        Scan with <span className="font-semibold text-slate-900">Google Pay, PhonePe, Paytm, BHIM, Cred</span>
                      </div>

                      <div className="font-semibold text-blue-700">
                        Amount to Collect: ₹{Number(counterForm.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      UPI UTR / 12-Digit Transaction Reference ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 329841029384"
                      value={counterForm.upi_ref}
                      onChange={(e) => setCounterForm({ ...counterForm, upi_ref: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 2. Net Banking Institutional Account Details */}
              {counterForm.method === 'NET_BANKING' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                      <Landmark className="w-4 h-4 text-purple-600" />
                      <span>Official Institutional Bank Account</span>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      NEFT / RTGS / IMPS
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-slate-400 font-semibold uppercase text-[10px]">Beneficiary Name</div>
                        <div className="font-bold text-slate-900">Apex Higher Education Institute</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-semibold uppercase text-[10px]">Bank & Branch</div>
                        <div className="font-semibold text-slate-800">State Bank of India (Campus Branch)</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                      <div>
                        <div className="text-slate-400 font-semibold uppercase text-[10px]">Account Number</div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                          <span>5020 0038 9128 44</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('50200038912844', 'bank')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                            title="Copy Account Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {copiedBank && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-semibold uppercase text-[10px]">IFSC Code</div>
                        <div className="font-mono font-bold text-slate-900 text-sm">SBIN0004210</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bank Transfer Reference / UTR Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN402910482918"
                      value={counterForm.bank_utr}
                      onChange={(e) => setCounterForm({ ...counterForm, bank_utr: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 3. Debit / Credit Card Fields */}
              {counterForm.method === 'CARD' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Card POS Terminal Collection</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <span className="bg-white border px-1.5 py-0.5 rounded">Visa</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded">Mastercard</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded">RuPay</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Card Number */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        16-Digit Card Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="4532 8901 2345 6789"
                          maxLength={19}
                          value={counterForm.card_number}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Cardholder Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="Name as on Card"
                          value={counterForm.card_holder}
                          onChange={(e) => setCounterForm({ ...counterForm, card_holder: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Cash Counter Box */}
              {counterForm.method === 'CASH' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Physical Cash Desk Collection</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-white border px-2 py-0.5 rounded">
                      Counter Desk 01
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cash Tendered (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Amount received"
                        value={counterForm.cash_received}
                        onChange={(e) => setCounterForm({ ...counterForm, cash_received: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
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
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  {counterForm.cash_received && counterForm.amount && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex justify-between font-semibold text-emerald-900">
                      <span>Change to Return to Student:</span>
                      <span className="font-mono font-bold">
                        ₹{Math.max(0, parseFloat(counterForm.cash_received || 0) - parseFloat(counterForm.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
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
