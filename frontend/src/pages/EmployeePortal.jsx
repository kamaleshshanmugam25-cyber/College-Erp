import React, { useState, useEffect } from 'react';
import { api, apiRequest } from '../api/client';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle,
  CalendarCheck2,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

export function EmployeePortal() {
  const [payslips, setPayslips] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [clockActionMsg, setClockActionMsg] = useState(null);
  const [clocking, setClocking] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllAttendance, setShowAllAttendance] = useState(false);

  // Leave Modal state
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [slipRes, attRes, sumRes] = await Promise.all([
        api.getMyPayslips().catch(() => ({ payslips: [] })),
        api.getAttendance().catch(() => []),
        api.getAttendanceSummary().catch(() => null),
      ]);
      setPayslips(slipRes.payslips || []);
      setAttendance(Array.isArray(attRes) ? attRes : attRes.results || []);
      setAttendanceSummary(sumRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClockIn = async () => {
    setClocking(true);
    setClockActionMsg(null);
    try {
      const res = await api.clockInAttendance();
      setClockActionMsg(res.message);
      loadData();
    } catch (err) {
      alert(`Clock-in failed: ${err.message}`);
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    setClockActionMsg(null);
    try {
      const res = await api.clockOutAttendance();
      setClockActionMsg(res.message);
      loadData();
    } catch (err) {
      alert(`Clock-out failed: ${err.message}`);
    } finally {
      setClocking(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    setError(null);
    try {
      await apiRequest('/api/leaves/', {
        method: 'POST',
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });
      setLeaveSuccess('Leave application submitted successfully!');
      setTimeout(() => {
        setLeaveModal(false);
        setLeaveSuccess(null);
        setStartDate('');
        setEndDate('');
        setReason('');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const daysPresent = attendanceSummary?.present ?? attendance.filter(a => a.status === 'PRESENT').length;
  const onDutyDays = attendanceSummary?.on_duty ?? attendance.filter(a => a.status === 'ON_DUTY').length;

  const filteredAttendance = attendance.filter((a) => {
    if (selectedMonth === 'ALL') return true;
    return a.date?.startsWith(`2026-${selectedMonth}`);
  });

  const displayedAttendance = showAllAttendance ? filteredAttendance : filteredAttendance.slice(0, 4);

  if (loading && payslips.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-xs">
        Loading faculty payslips & attendance...
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Faculty Payslips & Attendance</h1>
          <p className="text-xs text-slate-500">
            Monthly payroll receipts, clock-in logs, and leave management
          </p>
        </div>

        <button
          onClick={() => setLeaveModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payslips Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Salary Payslips</span>
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {payslips.length} {payslips.length === 1 ? 'Slip' : 'Slips'}
          </span>
        </div>

        {payslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Gross Salary</th>
                  <th className="py-2.5 px-4">Deductions</th>
                  <th className="py-2.5 px-4">Net Salary</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {new Date(p.year, p.month - 1, 1).toLocaleString('default', { month: 'short' })} {p.year}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      ₹{Number(p.gross_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-rose-600">
                      -₹{Number(p.total_deductions).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700">
                      ₹{Number(p.net_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <a
                        href={p.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No payroll slips released for current period.
          </div>
        )}
      </div>

      {/* Attendance & Biometric Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
              <span>Attendance & Web Clock-In</span>
            </h2>
            <p className="text-xs text-slate-500">Daily punch logs and monthly attendance summary</p>
          </div>

          {/* Quick Clock-In / Clock-Out Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleClockIn}
              disabled={clocking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Clock In</span>
            </button>
            <button
              onClick={handleClockOut}
              disabled={clocking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Clock Out</span>
            </button>
          </div>
        </div>

        {clockActionMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clockActionMsg}</span>
          </div>
        )}

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">Attendance Rate</div>
            <div className="text-lg font-black text-emerald-700">
              {attendanceSummary?.attendance_rate || 100}%
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">Days Present</div>
            <div className="text-lg font-black text-slate-900">
              {daysPresent} {daysPresent === 1 ? 'Day' : 'Days'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">On-Duty</div>
            <div className="text-lg font-black text-blue-700">
              {onDutyDays} {onDutyDays === 1 ? 'Day' : 'Days'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">Today</div>
            <div className="text-xs font-bold text-slate-900 pt-0.5">
              {attendanceSummary?.today ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>In ({attendanceSummary.today.check_in?.slice(0, 5)})</span>
                </span>
              ) : (
                <span className="text-slate-500 font-medium">Not Clocked In</span>
              )}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="font-bold text-slate-800">
            Punch History ({filteredAttendance.length} {filteredAttendance.length === 1 ? 'Record' : 'Records'})
          </div>
          <div className="flex items-center gap-1.5">
            {['ALL', '10', '09'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  selectedMonth === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {m === 'ALL' ? 'All Months' : m === '10' ? 'October 2026' : 'September 2026'}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Records Table */}
        {filteredAttendance.length > 0 ? (
          <div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Check-In</th>
                    <th className="py-2.5 px-4">Check-Out</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedAttendance.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {new Date(a.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-mono">
                        {a.check_in ? (
                          <span className="font-bold text-slate-800">
                            {a.check_in.slice(0, 5)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">
                        {a.check_out ? a.check_out.slice(0, 5) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
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

            {filteredAttendance.length > 4 && (
              <div className="pt-3 text-center">
                <button
                  onClick={() => setShowAllAttendance(!showAllAttendance)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
                >
                  <span>{showAllAttendance ? 'Show Less' : `View More (${filteredAttendance.length - 4} More Records)`}</span>
                  {showAllAttendance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
            No attendance logs found for this period.
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {leaveModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Apply for Faculty Leave</h3>
              <button
                onClick={() => setLeaveModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leaveSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{leaveSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleApplyLeave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Classification</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white"
                  >
                    <option value="CASUAL">Casual Leave (Paid)</option>
                    <option value="SICK">Medical / Sick Leave (Paid)</option>
                    <option value="EARNED">Earned Privilege Leave (Paid)</option>
                    <option value="UNPAID">Leave Without Pay (LOP)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave</label>
                  <textarea
                    rows={2}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason or coverage details..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLeaveModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {submittingLeave ? 'Submitting...' : 'Submit Leave'}
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
