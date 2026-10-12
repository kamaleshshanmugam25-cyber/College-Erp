import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Download, 
  AlertCircle,
  FileCheck,
  ShieldCheck,
  User,
  Mail,
  Building2,
  Award,
  Briefcase,
  BadgeCheck,
  School,
  BookOpen
} from 'lucide-react';

export function StudentPortal() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [assignedFaculty, setAssignedFaculty] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payGateway, setPayGateway] = useState('razorpay');
  const [submittingPay, setSubmittingPay] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState(null);
  const [selectedQuotaId, setSelectedQuotaId] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [duesRes, recRes, metaRes] = await Promise.all([
        api.getMyDues().catch(() => ({ fees: [], student_info: null, assigned_faculty: [] })),
        api.getReceipts().catch(() => []),
        api.getFinanceMeta().catch(() => null),
      ]);
      setFees(duesRes.fees || []);
      setStudentInfo(duesRes.student_info || null);
      setAssignedFaculty(duesRes.assigned_faculty || []);
      setReceipts(Array.isArray(recRes) ? recRes : recRes.results || []);
      setMeta(metaRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPay = (fee, installment = null) => {
    const defaultAmt = installment
      ? (installment.amount - installment.paid_amount)
      : fee.outstanding;
    setPayModal(fee);
    setPayAmount(String(defaultAmt));
    setPaySuccessMsg(null);
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    if (!payModal) return;
    setSubmittingPay(true);
    setError(null);
    try {
      const res = await api.initiatePayment(payModal.id, {
        amount: parseFloat(payAmount),
        method: payMethod,
        gateway: payGateway,
      });
      if (res.receipt_number) {
        setPaySuccessMsg(`Payment completed! Official Receipt ${res.receipt_number} issued for ₹${Number(res.amount).toLocaleString('en-IN')}.`);
      } else {
        setPaySuccessMsg(`Payment initiated successfully! Order ID: ${res.order_id}`);
      }
      setTimeout(() => {
        setPayModal(null);
        loadData();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  // Derived student particulars
  const currentStudentName = fees[0]?.student_name || studentInfo?.name || user?.name || user?.username || 'Guhan A';
  const currentRollNo = fees[0]?.roll_no || studentInfo?.roll_no || user?.profile?.roll_no || '2026-BSC-003';
  const currentCourse = fees[0]?.course_name || studentInfo?.course_name || 'BSc Computer Science';
  const currentCourseCode = fees[0]?.course_code || studentInfo?.course_code || 'CS-BSC';
  const currentEmail = studentInfo?.email || user?.email || `${currentRollNo.toLowerCase()}@student.apex.edu`;
  const currentSession = fees[0]?.academic_year || studentInfo?.academic_year || '2026-27';

  if (loading && fees.length === 0 && !meta) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-sm">
        Loading student profile, fee records, and faculty particulars...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
          <GraduationCap className="w-4 h-4" />
          <span>Student Portal</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Dues & Receipts</h1>
        <p className="text-xs text-slate-500">
          Enrolled student profile, active fee assessment, term installments, and PDF tax receipts
        </p>

      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}      {/* 1. HERO LOGGED-IN STUDENT PARTICULAR PROFILE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 text-white space-y-3 sm:space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-200 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-blue-300" />
                  <span>Enrolled Student Particulars</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 flex items-center gap-1">
                  <School className="w-3 h-3 text-emerald-300" />
                  <span>{currentSession} Academic Session</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300 shrink-0" />
                <span>{currentStudentName}</span>
              </h2>
              <div className="text-[11px] sm:text-xs text-slate-300 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-1">
                  <span>Roll No:</span>
                  <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/10">{currentRollNo}</strong>
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                  <span>Program: <strong className="text-white">{currentCourse} ({currentCourseCode})</strong></span>
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-300" />
                  <span className="text-blue-200">{currentEmail}</span>
                </span>
              </div>
            </div>

            <div className="bg-white/10 p-3 sm:p-4 rounded-xl border border-white/15 backdrop-blur-xs flex items-center justify-between md:block text-left md:text-right shrink-0">
              <div>
                <div className="text-[9px] sm:text-[10px] text-blue-200 uppercase font-bold">Total Dues Outstanding</div>
                <div className="text-lg sm:text-2xl font-black text-white">
                  ₹{fees.length > 0 
                    ? Number(fees.reduce((acc, f) => acc + Number(f.outstanding || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                    : '0.00'}
                </div>
              </div>
              <div className="text-[10px] sm:text-[11px] text-emerald-300 font-semibold mt-0.5 flex items-center gap-1 justify-start md:justify-end">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{fees.length > 0 && fees.some(f => f.outstanding > 0) ? 'Active Dues Pending' : 'Account in Good Standing'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Particulars Quick Specs Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 p-3 sm:p-4 bg-slate-50 border-t border-slate-200/80 text-xs">
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Student Account</div>
            <div className="font-bold text-slate-800 text-[11px] sm:text-xs">{user?.username || 'student'}</div>
          </div>
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Department / Stream</div>
            <div className="font-bold text-slate-800 text-[11px] sm:text-xs">School of Computing</div>
          </div>
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Admitted Year</div>
            <div className="font-bold text-slate-800 text-[11px] sm:text-xs">2024 - 2027</div>
          </div>
          <div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Verification Status</div>
            <div className="font-bold text-emerald-600 flex items-center gap-1 text-[11px] sm:text-xs">
              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Verified & Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FEE ASSESSMENT & OBLIGATIONS SECTION */}
      {fees.length === 0 ? (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">No Active Fee Dues Outstanding</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All tuition fee obligations and term schedules for <strong>{currentStudentName}</strong> ({currentRollNo}) are fully satisfied or pending upcoming allocation.
          </p>
        </div>
      ) : (
        fees.map((fee) => {
          const displayQuotaName = fee.quota_name || 'General Quota';
          const displayWaiverPct = Number(fee.waiver_percent || 0);
          const baseAmt = Number(fee.base_amount || fee.total_amount || 85000);
          const displayWaiverAmt = Number(fee.waiver_amount || (baseAmt * displayWaiverPct / 100));
          const displayNetTotal = Number(fee.total_amount || (baseAmt - displayWaiverAmt));

          return (
            <div key={fee.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{fee.course_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {fee.academic_year}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600" />
                        <span>Quota: {displayQuotaName}</span>
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-500">
                      Tuition fee assessment & term installment milestones allocated by Finance Administration
                    </div>
                  </div>

                  {fee.outstanding > 0 && (
                    <button
                      onClick={() => handleOpenPay(fee)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Outstanding ₹{Number(fee.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </button>
                  )}
                </div>

                {/* Fee Breakdown Summary */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 truncate">Base Fee</div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                      ₹{Number(baseAmt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 p-2 sm:p-3 rounded-xl border border-emerald-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-700 truncate">Waiver ({displayWaiverPct}%)</div>
                    <div className="font-bold text-emerald-800 text-xs sm:text-sm mt-0.5 truncate">
                      -₹{Number(displayWaiverAmt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="bg-blue-50/60 p-2 sm:p-3 rounded-xl border border-blue-200">
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-700 truncate">Net Total</div>
                    <div className="font-bold text-blue-900 text-xs sm:text-sm mt-0.5 truncate">
                      ₹{Number(displayNetTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* Installments Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Term Installment Milestones
                  </h3>

                  {/* MOBILE INSTALLMENT CARDS VIEW */}
                  <div className="block sm:hidden divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                    {fee.installments?.map((inst) => {
                      const isPending = inst.status !== 'PAID';
                      const scheduledInstAmt = inst.amount;

                      return (
                        <div key={inst.id} className="p-3 bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">Term {inst.sequence}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inst.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {inst.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{inst.status}</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Due: <strong className="text-slate-700 font-mono">{inst.due_date}</strong></span>
                            <span>Paid: <strong className="text-slate-700">₹{Number(inst.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                            <span className="font-bold text-slate-900">
                              ₹{Number(scheduledInstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            {isPending ? (
                              <button
                                onClick={() => handleOpenPay(fee, inst)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                              >
                                Pay Term
                              </button>
                            ) : (
                              <span className="text-emerald-600 text-xs font-bold">✓ Cleared</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP INSTALLMENTS TABLE VIEW */}
                  <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[550px]">
                      <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Milestone</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Scheduled Amount</th>
                          <th className="py-2.5 px-3">Paid Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {fee.installments?.map((inst) => {
                          const isPending = inst.status !== 'PAID';
                          const scheduledInstAmt = inst.amount;

                          return (
                            <tr key={inst.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-bold text-slate-800">Term {inst.sequence}</td>
                              <td className="py-3 px-3 text-slate-600 font-mono">{inst.due_date}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900">
                                ₹{Number(scheduledInstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                ₹{Number(inst.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    inst.status === 'PAID'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {inst.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  <span>{inst.status}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {isPending ? (
                                  <button
                                    onClick={() => handleOpenPay(fee, inst)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                  >
                                    Pay Term
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 text-xs font-semibold">Cleared</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* 3. ASSIGNED DEPARTMENT FACULTY & EMPLOYEE DIRECTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5 sm:pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Assigned Department Faculty</span>
            </h2>
            <p className="text-xs text-slate-500">
              Department professors, academic advisors, and finance officers linked to {currentCourse}
            </p>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">
            {assignedFaculty.length} Faculty Members
          </span>
        </div>

        {assignedFaculty.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {assignedFaculty.map((emp) => (
              <div
                key={emp.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs">{emp.name}</span>
                      {emp.is_hod && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          HOD
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">{emp.designation}</div>
                  </div>

                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {emp.staff_id}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{emp.department}</span>
                  </span>
                  <a
                    href={`mailto:${emp.email}`}
                    className="flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                  >
                    <Mail className="w-3 h-3 text-blue-500" />
                    <span>{emp.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl">
            No department faculty profiles matched.
          </div>
        )}
      </div>



      {/* 5. OFFICIAL FEE RECEIPTS & INVOICES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5 sm:pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Tax Invoices & Fee Receipts</span>
            </h2>
            <p className="text-xs text-slate-500">
              Verified institutional receipts (SAC Code 9992 - Section 80C Tax Deduction Eligible)
            </p>
          </div>
          {receipts.length > 0 && (
            <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {receipts.length} Issued
            </span>
          )}
        </div>

        {receipts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {receipts.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 bg-linear-to-b from-white to-slate-50/50 hover:border-blue-200 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-xs font-bold text-blue-700">{r.receipt_number}</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      ₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div>
                    <span>{r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="capitalize">{r.method || 'Online'}</span>
                  </div>
                  <a
                    href={`/portal/receipts/${r.id}/pdf/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl">
            No completed fee payment receipts found for this account.
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Initiate Inward Fee Payment</h3>
              <button
                onClick={() => setPayModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {paySuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Initiated!</span>
                </div>
                <div>{paySuccessMsg}</div>
              </div>
            ) : (
              <form onSubmit={handleInitiatePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Pay (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-slate-50"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="NETBANKING">Net Banking</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Gateway</label>
                  <select
                    value={payGateway}
                    onChange={(e) => setPayGateway(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-slate-50"
                  >
                    <option value="razorpay">Razorpay Checkout</option>
                    <option value="cashfree">Cashfree Payments</option>
                  </select>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Protected by HMAC signed webhook verification and double-entry ledger lock.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayModal(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPay}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    {submittingPay ? 'Processing...' : `Pay ₹${payAmount}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
