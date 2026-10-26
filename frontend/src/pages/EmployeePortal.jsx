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
  Filter,
  RefreshCw,
  Clock,
  XCircle,
  CalendarDays,
  SunMedium,
} from 'lucide-react';

export function EmployeePortal() {
  const [payslips, setPayslips] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [clockActionMsg, setClockActionMsg] = useState(null);
  const [clocking, setClocking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllAttendance, setShowAllAttendance] = useState(false);

  // Attendance Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

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

  const normalizedAttendance = attendance.map((a) => {
    let st = a.status;
    if (st === 'ON_DUTY' || st === 'HOLIDAY') st = 'HALF_DAY';
    return { ...a, status: st };
  });

  const daysPresent = attendanceSummary?.present ?? normalizedAttendance.filter(a => a.status === 'PRESENT').length;
  const daysHalfDay = attendanceSummary?.half_day ?? normalizedAttendance.filter(a => a.status === 'HALF_DAY').length;
  const daysAbsent = normalizedAttendance.filter(a => a.status === 'ABSENT').length;

  const filteredAttendance = normalizedAttendance.filter((a) => {
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchStart = !filterStartDate || a.date >= filterStartDate;
    const matchEnd = !filterEndDate || a.date <= filterEndDate;
    return matchStatus && matchStart && matchEnd;
  });

  const resetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('ALL');
    setShowAllAttendance(false);
  };

  const hasActiveFilter = filterStatus !== 'ALL' || filterStartDate || filterEndDate;

  const displayedAttendance = showAllAttendance ? filteredAttendance : filteredAttendance.slice(0, 6);

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
              <span>Biometric Attendance & Web Clock-In</span>
            </h2>
            <p className="text-xs text-slate-500">Daily biometric punch logs and attendance history</p>
          </div>
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
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clockActionMsg}</span>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-slate-100">
          <div className="p-3 sm:p-4 border-r border-slate-100 space-y-0.5">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Attendance Rate</div>
            <div className="text-base sm:text-lg font-black text-emerald-700">{attendanceSummary?.attendance_rate || 100}%</div>
            <div className="text-[10px] text-slate-400">Current monthly cycle</div>
          </div>
          <div className="p-3 sm:p-4 sm:border-r border-slate-100 space-y-0.5">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Days Present</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{daysPresent} Days</div>
            <div className="text-[10px] text-slate-400">Verified biometric punches</div>
          </div>
          <div className="p-3 sm:p-4 border-r border-t sm:border-t-0 border-slate-100 space-y-0.5">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Half-Day / Absent</div>
            <div className="text-base sm:text-lg font-black text-amber-600">{daysHalfDay} <span className="text-xs text-slate-500 font-semibold">Half</span> · <span className="text-rose-600">{daysAbsent}</span> <span className="text-xs text-slate-500 font-semibold">Abs</span></div>
            <div className="text-[10px] text-slate-400">Leaves & partial shifts</div>
          </div>
          <div className="p-3 sm:p-4 border-t sm:border-t-0 space-y-0.5">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Today's Status</div>
            <div className="text-xs font-bold text-slate-900 pt-0.5">
              {attendanceSummary?.today ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Clocked In ({attendanceSummary.today.check_in?.slice(0, 5)})</span>
                </span>
              ) : (
                <span className="text-slate-500 font-semibold text-[11px]">Not Clocked In Today</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">Shift: 09:00 AM – 05:00 PM</div>
          </div>
        </div>

        {/* ── DATE RANGE + STATUS FILTERS ── */}
        <div className="p-4 sm:p-5 space-y-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Filter Attendance Records
            </span>
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Date Range Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setShowAllAttendance(false); }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setShowAllAttendance(false); }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'ALL',      label: 'All',      color: filterStatus === 'ALL'      ? 'bg-slate-800 text-white border-slate-800'     : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100' },
              { key: 'PRESENT',  label: 'Present',  color: filterStatus === 'PRESENT'  ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
              { key: 'ABSENT',   label: 'Absent',   color: filterStatus === 'ABSENT'   ? 'bg-rose-600 text-white border-rose-600'       : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
              { key: 'HALF_DAY', label: 'Half-Day', color: filterStatus === 'HALF_DAY' ? 'bg-amber-500 text-white border-amber-500'     : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => { setFilterStatus(key); setShowAllAttendance(false); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${color}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Punch History Header */}
        <div className="px-4 sm:px-5 pt-3.5 pb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Attendance Punch History ({filteredAttendance.length} {filteredAttendance.length === 1 ? 'Record' : 'Records'})
          </span>
          {hasActiveFilter && (
            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Filtered View
            </span>
          )}
        </div>

        {/* MOBILE: Attendance Day Cards */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {filteredAttendance.length > 0 ? (
            (showAllAttendance ? filteredAttendance : filteredAttendance.slice(0, 6)).map((a) => {
              const isPresent = a.status === 'PRESENT';
              const isHalfDay = a.status === 'HALF_DAY';
              const isAbsent  = a.status === 'ABSENT';
              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isPresent ? 'bg-emerald-500' :
                      isHalfDay ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`} />
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">
                        {new Date(a.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {a.check_in ? a.check_in.slice(0,5) : '--:--'}
                        {' → '}
                        {a.check_out ? a.check_out.slice(0,5) : '--:--'}
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    isPresent ? 'bg-emerald-50 text-emerald-700' :
                    isHalfDay ? 'bg-amber-50 text-amber-700' :
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {a.status === 'HALF_DAY' ? 'Half-Day' : a.status === 'PRESENT' ? 'Present' : 'Absent'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No records match the selected filters.
            </div>
          )}
        </div>

        {/* DESKTOP: Attendance Table */}
        <div className="hidden sm:block overflow-x-auto">
          {filteredAttendance.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-5">Date</th>
                  <th className="py-2.5 px-4">Check-in Time</th>
                  <th className="py-2.5 px-4">Check-out Time</th>
                  <th className="py-2.5 px-4">Working Hours</th>
                  <th className="py-2.5 px-5 text-right">Biometric Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(showAllAttendance ? filteredAttendance : filteredAttendance.slice(0, 6)).map((a) => {
                  const inTime  = a.check_in  ? a.check_in.slice(0, 5)  : null;
                  const outTime = a.check_out ? a.check_out.slice(0, 5) : null;
                  let workHours = '—';
                  if (inTime && outTime) {
                    const [ih, im] = inTime.split(':').map(Number);
                    const [oh, om] = outTime.split(':').map(Number);
                    const diff = (oh * 60 + om) - (ih * 60 + im);
                    if (diff > 0) workHours = `${Math.floor(diff / 60)}h ${diff % 60}m`;
                  }
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-5 font-semibold text-slate-900">
                        {new Date(a.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{inTime || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{outTime || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{workHours}</td>
                      <td className="py-3 px-5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          a.status === 'PRESENT'  ? 'bg-emerald-50 text-emerald-700' :
                          a.status === 'HALF_DAY' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {a.status === 'HALF_DAY' ? 'Half-Day' : a.status === 'PRESENT' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No attendance records match the selected filters.
            </div>
          )}
        </div>

        {/* Show More / Less */}
        {filteredAttendance.length > 6 && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAllAttendance(!showAllAttendance)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition cursor-pointer"
            >
              <span>{showAllAttendance ? 'Show Less' : `View All ${filteredAttendance.length} Records`}</span>
              {showAllAttendance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
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
