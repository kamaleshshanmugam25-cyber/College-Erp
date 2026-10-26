import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  CreditCard,
  Receipt,
  Award,
  BookOpen,
  BarChart3,
  ShieldAlert,
  Users,
  Banknote,
  TrendingUp,
  Scale,
  FileCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EmployeeLifecycleView } from '../components/EmployeeLifecycleView';
import { ScholarshipsView } from '../components/ScholarshipsView';
import { HolidaysView } from '../components/HolidaysView';
import { LedgerView } from '../components/LedgerView';
import { MyAppraisalsView } from '../components/MyAppraisalsView';
import { EmployeeDetailsView } from '../components/EmployeeDetailsView';
import { RoleAccessMatrixView } from '../components/RoleAccessMatrixView';




export function ModuleView({ moduleId }) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [receiptsList, setReceiptsList] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [dash, m, recRes] = await Promise.all([
          api.getFinanceDashboard().catch(() => null),
          api.getFinanceMeta().catch(() => null),
          api.getReceipts().catch(() => []),
        ]);
        setData(dash);
        setMeta(m);
        setReceiptsList(Array.isArray(recRes) ? recRes : recRes?.results || []);
      } catch (e) {
        // fallback
      }
    }
    loadData();
  }, [moduleId]);

  // Render content based on moduleId
  switch (moduleId) {
    case 'payment-gateway':
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Gateway Infrastructure</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payment Gateways & Inward Logs</h1>
            <p className="text-xs text-slate-500">Live webhook receiver status, HMAC verification, and transaction idempotency</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Razorpay Integration</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
              </div>
              <p className="text-xs text-slate-500">Webhook endpoint: <code className="bg-slate-100 px-1 py-0.5 rounded">/webhooks/razorpay/</code></p>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>• Signature Header: <code className="font-mono">X-Razorpay-Signature</code></div>
                <div>• Idempotency: Atomic row-level lock on <code className="font-mono">PaymentTransaction</code></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Cashfree Payments</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
              </div>
              <p className="text-xs text-slate-500">Webhook endpoint: <code className="bg-slate-100 px-1 py-0.5 rounded">/webhooks/cashfree/</code></p>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>• Signature Header: <code className="font-mono">x-webhook-signature</code></div>
                <div>• Verification: Timestamped HMAC-SHA256 signature</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Gateway Payment Batches</h2>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Gateway</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.batches && data.batches.length > 0 ? (
                    data.batches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{b.order_id}</td>
                        <td className="py-2.5 px-3 uppercase text-[11px] font-semibold text-slate-600">{b.gateway}</td>
                        <td className="py-2.5 px-3">{b.student_name}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">₹{b.amount}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">{b.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No gateway transaction logs recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    case 'invoices-receipts':
      const totalReceiptsAmount = receiptsList.reduce((acc, r) => acc + Number(r.amount || 0), 0);
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
                
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax Invoices &amp; Verified Fee Receipts</h1>
              <p className="text-xs text-slate-500">Atomic voucher numbers generated via NumberSequence service and downloadable as official PDFs</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{receiptsList.length} Verified Receipts</span>
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs max-w-sm">
            <div className="text-xs font-bold uppercase text-slate-400 mb-1">Total Fee Collected</div>
            <div className="text-xl font-bold text-slate-900">₹{totalReceiptsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-slate-500 mt-1">From verified student receipts</div>
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Generated Official Fee Receipts &amp; Invoices</h2>
              <span className="text-xs text-slate-500">{receiptsList.length} Records</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Receipt Number</th>
                    <th className="py-2.5 px-3">Student &amp; Course</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Date &amp; Gateway</th>
                    <th className="py-2.5 px-3 text-right">PDF Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiptsList.length > 0 ? (
                    receiptsList.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.receipt_number}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{r.student_name} <span className="font-mono text-slate-400 text-[11px]">({r.roll_no})</span></div>
                          <div className="text-[11px] text-slate-500">{r.course_name} • {r.academic_year}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                          <div className="text-[10px] text-slate-400">{r.method} via {r.gateway}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={`/portal/receipts/${r.id}/pdf/`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-bold text-[11px] transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No official receipts generated yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    case 'scholarships':
    case 'student-scholarships':
      return <ScholarshipsView />;

    case 'ledger-accounts':
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Double-Entry Bookkeeping</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">General Ledger & Journal Vouchers</h1>
            <p className="text-xs text-slate-500">Immutable double-entry ledger with debit and credit balance enforcement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Total Monthly Debits</div>
              <div className="text-xl font-bold text-slate-900">₹{Number(data?.burn || 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-500 mt-1">Operational & Payroll expenses</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Reconciliation Integrity</div>
              <div className="text-xl font-bold text-blue-700">{data?.recon_rate || 100}%</div>
              <div className="text-xs text-slate-500 mt-1">Matched to bank settlements</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Ledger Policy</div>
              <div className="text-sm font-bold text-slate-800">Immutable Entries</div>
              <div className="text-xs text-slate-500 mt-1">Corrections via reversing vouchers only</div>
            </div>
          </div>
        </div>
      );



    case 'role-permissions':
    case 'access-matrix':
      return <RoleAccessMatrixView />;

    case 'employee-details':
      return <EmployeeDetailsView />;

    case 'employee-lifecycle':
      return <EmployeeLifecycleView />;

    case 'performance-appraisal':
    case 'employee-appraisal':
    case 'my-appraisals':
      return <MyAppraisalsView />;


    case 'holidays':
    case 'academic-calendar':
    case 'holiday-calendar':
      return <HolidaysView />;

    case 'general-ledger':
    case 'journal-vouchers':
    case 'ledger':
      return <LedgerView />;

    default:

      return (

        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
          <h2 className="text-sm font-bold text-slate-800">Module: {moduleId}</h2>
          <p className="text-xs text-slate-500">This management view is connected to the backend ERP registry.</p>
        </div>
      );
  }
}
