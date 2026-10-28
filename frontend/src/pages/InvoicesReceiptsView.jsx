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
  Sparkles,
  AlertTriangle
} from 'lucide-react';

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

  // Counter Collection Form
  const [counterForm, setCounterForm] = useState({
    installment_id: '',
    amount: '',
    method: 'CASH',
    notes: '',
  });
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

  // Pending installments for Counter Collection dropdown
  const pendingInstallments = useMemo(() => {
    return invoices.filter((i) => i.balance > 0);
  }, [invoices]);

  const handleOpenCounterModal = (presetInstallment = null) => {
    setCounterError(null);
    if (presetInstallment) {
      setCounterForm({
        installment_id: presetInstallment.id.toString(),
        amount: presetInstallment.balance.toString(),
        method: 'CASH',
        notes: `Counter collection for ${presetInstallment.student_name} (${presetInstallment.invoice_number})`,
      });
    } else if (pendingInstallments.length > 0) {
      const first = pendingInstallments[0];
      setCounterForm({
        installment_id: first.id.toString(),
        amount: first.balance.toString(),
        method: 'CASH',
        notes: `Counter collection for ${first.student_name}`,
      });
    } else {
      setCounterForm({
        installment_id: '',
        amount: '',
        method: 'CASH',
        notes: '',
      });
    }
    setShowCounterModal(true);
  };

  const handleInstallmentSelect = (installmentId) => {
    const inst = invoices.find((i) => i.id.toString() === installmentId);
    if (inst) {
      setCounterForm((prev) => ({
        ...prev,
        installment_id: installmentId,
        amount: inst.balance.toString(),
        notes: `Counter collection for ${inst.student_name} (${inst.invoice_number})`,
      }));
    } else {
      setCounterForm((prev) => ({ ...prev, installment_id: installmentId }));
    }
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

    setSubmittingPayment(true);
    try {
      const res = await api.collectCounterFee({
        installment_id: parseInt(counterForm.installment_id, 10),
        amount: amt,
        method: counterForm.method,
        notes: counterForm.notes,
      });

      setShowCounterModal(false);
      setSuccessToast(`Payment of ₹${amt.toLocaleString()} recorded successfully! Official Receipt: ${res.receipt?.receipt_number || 'Generated'}`);
      setTimeout(() => setSuccessToast(null), 6000);

      // Refresh data
      await fetchData();

      // Open printable receipt automatically for instant staff review / print
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
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map(x => `"${x || ''}"`).join(','))].join('\n');
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
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map(x => `"${x || ''}"`).join(','))].join('\n');
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-emerald-500 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Official Receipts</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Institutional student fee demand bills, counter collections & GST-exempt official receipts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenCounterModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm shadow-blue-500/25"
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
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="text-xs font-semibold underline hover:text-rose-900">
            Try Again
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Demands Issued</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹{Number(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              {summary.total_invoices_count || invoices.length} milestone installment demands
            </div>
          </div>
        </div>

        {/* Total Revenue Collected */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Collected</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">
              ₹{Number(summary.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {summary.paid_invoices_count || 0} demands completely settled
            </div>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Balance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              ₹{Number(summary.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              {summary.pending_invoices_count || 0} active pending / partial installments
            </div>
          </div>
        </div>

        {/* Official Receipts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Official Receipts</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-violet-700">
              {summary.receipts_count || receipts.length}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
              ₹{Number(summary.total_receipts_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} authenticated
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab Switcher & Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          {/* Dual Tabs */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl self-start">
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'receipts'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4 text-violet-600" />
              <span>Official Receipts</span>
              <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-violet-100 text-violet-800">
                {receipts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === 'invoices'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Demand Invoices</span>
              <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                {invoices.length}
              </span>
            </button>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'receipts' ? 'Search receipts, roll no, student...' : 'Search invoices, student, roll no...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    : 'No payment receipts have been generated yet. Use "Record Counter Collection" above to collect fee payments.'}
                </p>
                <button
                  onClick={() => handleOpenCounterModal()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Collect Counter Fee</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-violet-500" />
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 font-mono whitespace-nowrap">
                        ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="text-slate-400 font-mono">
                          {new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{r.status || 'PAID'}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          title="View Official Printable Receipt"
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
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                          <FileText className="w-4 h-4 text-blue-500" />
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
                          <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5">
                            OVERDUE
                          </span>
                        )}
                      </td>

                      {/* Invoiced Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                        ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-600 whitespace-nowrap">
                        ₹{Number(inv.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={inv.balance > 0 ? (inv.is_overdue ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'}>
                          ₹{Number(inv.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAID</span>
                          </span>
                        ) : inv.status === 'OVERDUE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>OVERDUE</span>
                          </span>
                        ) : inv.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3" />
                            <span>PARTIAL</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
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
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                              title="Record fee payment collection for this student"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Collect Fee</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
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

      {/* MODAL 1: Official Fee Receipt Preview & Print */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Controls Header */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Receipt className="w-4 h-4 text-violet-600" />
                <span>Official Fee Receipt — {selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Institutional Receipt Layout */}
            <div className="p-8 text-slate-900 bg-white" id="printable-receipt">
              {/* Institution Header */}
              <div className="text-center border-b-2 border-slate-800 pb-5">
                <div className="flex items-center justify-center gap-2 text-blue-700 font-extrabold text-2xl tracking-tight">
                  <Building2 className="w-7 h-7" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-xs uppercase font-semibold tracking-wider text-slate-500 mt-0.5">
                  Office of Finance & Accounts • Institutional Treasury
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Campus City, Tamil Nadu, India • Affiliated & Accredited Institution
                </p>
                <div className="mt-3 inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
                  Official Student Fee Receipt
                </div>
              </div>

              {/* Receipt Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 my-6 text-sm">
                <div className="space-y-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Receipt Number:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{selectedReceipt.receipt_number}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Order / Transaction ID:</span>{' '}
                    <span className="font-mono text-slate-700 text-xs">{selectedReceipt.order_id || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Payment Mode:</span>{' '}
                    <span className="font-semibold text-slate-900">{selectedReceipt.method || 'CASH / UPI'}</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Date & Time:</span>{' '}
                    <span className="font-medium text-slate-900">
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
                    <span className="text-xs font-semibold text-slate-400 uppercase">Academic Year:</span>{' '}
                    <span className="font-semibold text-slate-900">{selectedReceipt.academic_year || '2026-27'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Status:</span>{' '}
                    <span className="font-bold text-emerald-600">PAID & AUTHENTICATED</span>
                  </div>
                </div>
              </div>

              {/* Student Identification Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Student Full Name</div>
                    <div className="font-bold text-slate-900 text-base">{selectedReceipt.student_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Student Roll / Reg. No.</div>
                    <div className="font-mono font-bold text-slate-900 text-base">{selectedReceipt.roll_no}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Academic Program / Department</div>
                    <div className="font-medium text-slate-800">{selectedReceipt.course_name} ({selectedReceipt.course_code})</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Institutional Reference</div>
                    <div className="font-mono text-xs text-slate-600">{selectedReceipt.gateway_txn_id || 'Apex-Campus-Counter'}</div>
                  </div>
                </div>
              </div>

              {/* Fee Particulars Table */}
              <table className="w-full text-left border-collapse text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2">Fee Head / Description</th>
                    <th className="py-2 text-center">SAC Code</th>
                    <th className="py-2 text-center">Tax Rate</th>
                    <th className="py-2 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3">
                      <div className="font-semibold text-slate-900">Tuition & Academic Development Fee</div>
                      <div className="text-xs text-slate-500">Milestone installment collection for {selectedReceipt.course_name}</div>
                    </td>
                    <td className="py-3 text-center font-mono text-xs text-slate-600">9992</td>
                    <td className="py-3 text-center text-xs text-slate-600">0% (GST Exempt)</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-bold text-base">
                    <td colSpan="3" className="py-3 text-right text-slate-900 uppercase tracking-wider">
                      Total Amount Received:
                    </td>
                    <td className="py-3 text-right font-mono text-emerald-700 text-lg">
                      ₹{Number(selectedReceipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Statutory Note & Digital Seal */}
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3.5 mb-6 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Statutory Exemption & Verification Notice:</div>
                  Services provided by educational institutions to students are fully exempt from Goods and Services Tax (GST) under Notification No. 12/2017 - Central Tax (Rate), SAC Code 9992.
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200 text-xs">
                <div>
                  <div className="font-semibold text-slate-700">Student / Depositor Signature:</div>
                  <div className="h-10 border-b border-dashed border-slate-300"></div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-700">Authorized Finance Officer / Cashier:</div>
                  <div className="h-10 flex items-end justify-end">
                    <span className="font-mono text-blue-700 font-bold tracking-wider text-[11px] border border-blue-200 bg-blue-50 px-2 py-0.5 rounded">
                      VERIFIED BY APEX ERP TREASURY
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6">
                This is a computer-generated, audit-ready official receipt. Valid without handwritten signature when stamped with institutional verification.
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
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Demand Invoice Notice — {selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Demand Note</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Demand Notice Layout */}
            <div className="p-8 text-slate-900 bg-white">
              {/* Institution Header */}
              <div className="text-center border-b-2 border-slate-800 pb-5">
                <div className="flex items-center justify-center gap-2 text-blue-700 font-extrabold text-2xl tracking-tight">
                  <Building2 className="w-7 h-7" />
                  <span>APEX HIGHER EDUCATION INSTITUTE</span>
                </div>
                <p className="text-xs uppercase font-semibold tracking-wider text-slate-500 mt-0.5">
                  Office of Academic Fees & Student Accounts
                </p>
                <div className="mt-3 inline-block bg-blue-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
                  FEE DEMAND NOTICE / INVOICE
                </div>
              </div>

              {/* Demand Details */}
              <div className="grid grid-cols-2 gap-4 my-6 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Demand Invoice #:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoice_number}</span>
                  <div className="mt-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Milestone Sequence:</span>{' '}
                    <span className="font-semibold text-slate-900">{selectedInvoice.installment_label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Due Date:</span>{' '}
                    <span className={`font-bold ${selectedInvoice.is_overdue ? 'text-rose-600' : 'text-slate-900'}`}>
                      {new Date(selectedInvoice.due_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Status:</span>{' '}
                    <span className="font-bold text-slate-900">{selectedInvoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Student Info Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Student Name</div>
                    <div className="font-bold text-slate-900 text-base">{selectedInvoice.student_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Roll / Register No.</div>
                    <div className="font-mono font-bold text-slate-900 text-base">{selectedInvoice.roll_no}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Academic Program</div>
                    <div className="font-medium text-slate-800">{selectedInvoice.course_name} ({selectedInvoice.course_code})</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Quota / Concession Category</div>
                    <div className="font-medium text-slate-800 capitalize">{selectedInvoice.quota_name}</div>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <table className="w-full text-left border-collapse text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2">Fee Milestone Component</th>
                    <th className="py-2 text-right">Invoiced (₹)</th>
                    <th className="py-2 text-right">Paid (₹)</th>
                    <th className="py-2 text-right">Balance Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3">
                      <div className="font-semibold text-slate-900">Tuition & Institutional Development Fee</div>
                      <div className="text-xs text-slate-500">Scheduled {selectedInvoice.installment_label} for Academic Year {selectedInvoice.academic_year}</div>
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-slate-800">
                      ₹{Number(selectedInvoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono font-medium text-emerald-600">
                      ₹{Number(selectedInvoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-amber-600">
                      ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-bold text-base">
                    <td colSpan="3" className="py-3 text-right text-slate-900 uppercase tracking-wider">
                      Total Payable Balance:
                    </td>
                    <td className="py-3 text-right font-mono text-rose-600 text-lg">
                      ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Instructions */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 mb-6 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Landmark className="w-4 h-4 text-blue-700" />
                  <span>Approved Payment Channels:</span>
                </div>
                <div>1. Online via Student Portal: Instant UPI, Net Banking or Debit/Credit Card.</div>
                <div>2. Campus Cashier Counter: Cash or Card deposit at the Office of Finance & Accounts.</div>
                <div>3. Bank Transfer: NEFT/RTGS to Institutional Account — Apex Bank, IFSC: APEX0001234.</div>
              </div>

              {/* Action buttons inside modal */}
              {selectedInvoice.balance > 0 && (
                <div className="flex justify-end gap-3 print:hidden pt-2">
                  <button
                    onClick={() => {
                      const inv = selectedInvoice;
                      setSelectedInvoice(null);
                      handleOpenCounterModal(inv);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
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

      {/* MODAL 3: Record Counter Collection */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Counter Fee Collection</h3>
                  <p className="text-xs text-slate-500">Collect fee deposit at front desk & issue official receipt</p>
                </div>
              </div>
              <button
                onClick={() => setShowCounterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordCollection} className="p-6 space-y-4">
              {counterError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
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
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-blue-950">Program:</span>
                    <span>{selectedInstDetails.course_name} ({selectedInstDetails.course_code})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-blue-950">Milestone:</span>
                    <span>{selectedInstDetails.installment_label}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1 mt-1 font-bold">
                    <span>Outstanding Due Balance:</span>
                    <span className="text-rose-700 font-mono text-sm">
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

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Wallet },
                    { id: 'UPI', label: 'UPI / QR', icon: Landmark },
                    { id: 'CARD', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'NET_BANKING', label: 'Net Bank', icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = counterForm.method === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setCounterForm({ ...counterForm, method: m.id })}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes / Reference */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Transaction Notes / Bank Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter deposit, Cashier slip #4021"
                  value={counterForm.notes}
                  onChange={(e) => setCounterForm({ ...counterForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Collect & Issue Receipt</span>
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
