import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Users, 
  CalendarCheck2, 
  Check, 
  X, 
  AlertCircle, 
  Play, 
  CheckCircle2, 
  Clock,
  Briefcase,
  Calendar,
  Building2,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function HRManagement() {
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [selectedAttMonth, setSelectedAttMonth] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [payrollYear, setPayrollYear] = useState(2026);
  const [payrollMonth, setPayrollMonth] = useState(10);
  const [payrollStatus, setPayrollStatus] = useState(null);
  const [payrollRunning, setPayrollRunning] = useState(false);
  const [showAllLeaves, setShowAllLeaves] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leavesRes, attRes] = await Promise.all([
        api.getLeaves().catch(() => []),
        api.getAttendance().catch(() => []),
      ]);
      setLeaves(Array.isArray(leavesRes) ? leavesRes : leavesRes.results || []);
      setAttendance(Array.isArray(attRes) ? attRes : attRes.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = async (leaveId, isApprove) => {
    setActionLoading(leaveId);
    try {
      if (isApprove) {
        await api.approveLeave(leaveId);
      } else {
        await api.rejectLeave(leaveId);
      }
      loadData();
    } catch (err) {
      alert(`Error updating leave: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunPayroll = async (e) => {
    e.preventDefault();
    setPayrollRunning(true);
    setPayrollStatus(null);
    try {
      const res = await api.runPayroll(Number(payrollYear), Number(payrollMonth));
      setPayrollStatus(`Payroll batch calculation queued successfully for ${payrollMonth}/${payrollYear}!`);
    } catch (err) {
      setPayrollStatus(`Failed to queue payroll: ${err.message}`);
    } finally {
      setPayrollRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Faculty & Staff Human Resources</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Approvals & Payroll Engine</h1>
        <p className="text-xs text-slate-500">
          Manage staff leave requests with attendance synchronization and trigger automated atomic salary disbursements
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trigger Payroll Engine Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Automated Payroll Execution</span>
            </h2>
            <p className="text-xs text-slate-500">
              Evaluates attendance, approved paid leaves, calculates Loss-of-Pay (LOP), PF, ESI & TDS
            </p>
          </div>
        </div>

        {payrollStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{payrollStatus}</span>
          </div>
        )}

        <form onSubmit={handleRunPayroll} className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Month</label>
            <select
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Year</label>
            <input
              type="number"
              value={payrollYear}
              onChange={(e) => setPayrollYear(e.target.value)}
              className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
            />
          </div>

          <div className="pt-5">
            <button
              type="submit"
              disabled={payrollRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{payrollRunning ? 'Queueing Batch...' : 'Run Payroll Batch'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pending Leave Approvals Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-amber-600" />
            <span>Leave Approval Workflow</span>
          </h2>
          <span className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {leaves.length} Requests
          </span>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {leaves.length > 0 ? (
            (showAllLeaves ? leaves : leaves.slice(0, 4)).map((l) => (
              <div key={l.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{l.employee_name || 'Staff Member'}</span>
                    <span className="ml-1.5 text-[10px] text-blue-700 font-mono font-semibold">({l.staff_id || '—'})</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      l.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : l.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {l.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>{l.department || 'General'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {l.leave_type}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-800">{l.start_date} → {l.end_date}</span>
                </div>

                {l.reason && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {l.reason}
                  </div>
                )}

                {l.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleDecision(l.id, true)}
                      disabled={actionLoading === l.id}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleDecision(l.id, false)}
                      disabled={actionLoading === l.id}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No leave requests awaiting approval.
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[580px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Faculty / Staff Member</th>
                <th className="py-2.5 px-4">Department & Leave Type</th>
                <th className="py-2.5 px-4">Duration & Reason</th>
                <th className="py-2.5 px-4 text-right">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {leaves.length > 0 ? (
                (showAllLeaves ? leaves : leaves.slice(0, 4)).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{l.employee_name || 'Staff Member'}</div>
                      <div className="text-[10px] text-blue-700 font-mono font-semibold">{l.staff_id || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{l.department || 'General'}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {l.leave_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{l.start_date} to {l.end_date}</div>
                      <div className="text-[10px] text-slate-500 font-normal truncate max-w-xs">{l.reason || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : l.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {l.status}
                        </span>

                        {l.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDecision(l.id, true)}
                              disabled={actionLoading === l.id}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Approve Leave"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleDecision(l.id, false)}
                              disabled={actionLoading === l.id}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Reject Leave"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No leave requests awaiting approval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {leaves.length > 4 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAllLeaves(!showAllLeaves)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
            >
              <span>{showAllLeaves ? 'Show Less' : `View More (${leaves.length - 4} More Requests)`}</span>
              {showAllLeaves ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Institutional Attendance Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Faculty & Staff Attendance Logs</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Synchronized biometric logs across all academic and administrative departments
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', '10', '09'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedAttMonth(m)}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                  selectedAttMonth === m
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {m === 'ALL' ? 'All Months' : m === '10' ? 'October 2026' : 'September 2026'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty, staff ID, or department..."
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* MOBILE ATTENDANCE CARDS VIEW */}
        <div className="block sm:hidden divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          {attendance
            .filter((a) => {
              const matchMonth = selectedAttMonth === 'ALL' || a.date?.startsWith(`2026-${selectedAttMonth}`);
              const matchSearch =
                !attendanceSearch ||
                a.employee_name?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                a.staff_id?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                a.department?.toLowerCase().includes(attendanceSearch.toLowerCase());
              return matchMonth && matchSearch;
            })
            .slice(0, 30)
            .map((a) => (
              <div key={a.id} className="p-3 bg-white space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{a.employee_name}</span>
                    <span className="text-[10px] font-mono font-semibold text-blue-700">({a.staff_id})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    a.status === 'PRESENT'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : a.status === 'ON_DUTY'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : a.status === 'HALF_DAY'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {a.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">
                      {new Date(a.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                    <span>• {a.department}</span>
                  </div>
                  <div className="font-mono text-slate-700 font-medium">
                    {a.check_in ? a.check_in.slice(0, 5) : '—'} → {a.check_out ? a.check_out.slice(0, 5) : '—'}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* DESKTOP ATTENDANCE TABLE VIEW */}
        <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Faculty / Staff Member</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Check-In / Out</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance
                .filter((a) => {
                  const matchMonth = selectedAttMonth === 'ALL' || a.date?.startsWith(`2026-${selectedAttMonth}`);
                  const matchSearch =
                    !attendanceSearch ||
                    a.employee_name?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                    a.staff_id?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                    a.department?.toLowerCase().includes(attendanceSearch.toLowerCase());
                  return matchMonth && matchSearch;
                })
                .slice(0, 30)
                .map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {new Date(a.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short'
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{a.employee_name}</div>
                      <div className="text-[10px] text-blue-700 font-mono font-semibold">{a.staff_id}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{a.department}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      <span>{a.check_in ? a.check_in.slice(0, 5) : '—'}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span>{a.check_out ? a.check_out.slice(0, 5) : '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {a.working_hours || '8h 00m'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : a.status === 'ON_DUTY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : a.status === 'HALF_DAY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
