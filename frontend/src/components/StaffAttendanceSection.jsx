import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function StaffAttendanceSection({
  attendance: initialAttendance,
  title = "Faculty & Staff Attendance Logs",
  subtitle = "Synchronized biometric logs across all academic and administrative departments"
}) {
  const [attendance, setAttendance] = useState(initialAttendance || []);
  const [loading, setLoading] = useState(!initialAttendance || initialAttendance.length === 0);
  const [attFilterStartDate, setAttFilterStartDate] = useState('');
  const [attFilterEndDate, setAttFilterEndDate] = useState('');
  const [attFilterStatus, setAttFilterStatus] = useState('ALL');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Sync if prop changes
  useEffect(() => {
    if (initialAttendance && initialAttendance.length > 0) {
      setAttendance(initialAttendance);
      setLoading(false);
    } else {
      // If no prop passed, fetch directly from api
      let isMounted = true;
      api.getAttendance()
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res) ? res : res.results || [];
            setAttendance(list);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [initialAttendance]);

  // Normalize legacy status if needed
  const normalizedAttendance = attendance.map((a) => {
    let st = a.status;
    if (st === 'ON_DUTY') st = 'HALF_DAY';
    if (st === 'HOLIDAY') st = 'HALF_DAY';
    return { ...a, status: st };
  });

  // Calculate summary metrics
  const totalLogs = normalizedAttendance.length;
  const presentCount = normalizedAttendance.filter((a) => a.status === 'PRESENT').length;
  const halfDayCount = normalizedAttendance.filter((a) => a.status === 'HALF_DAY').length;
  const absentCount = normalizedAttendance.filter((a) => a.status === 'ABSENT').length;
  const attRate = totalLogs > 0 ? Math.round(((presentCount + 0.5 * halfDayCount) / totalLogs) * 100) : 100;

  // Filter attendance
  const filteredAttendance = normalizedAttendance.filter((a) => {
    const matchStatus = attFilterStatus === 'ALL' || a.status === attFilterStatus;
    const matchStart = !attFilterStartDate || a.date >= attFilterStartDate;
    const matchEnd = !attFilterEndDate || a.date <= attFilterEndDate;
    const searchLower = attendanceSearch.toLowerCase().trim();
    const matchSearch =
      !searchLower ||
      a.employee_name?.toLowerCase().includes(searchLower) ||
      a.staff_id?.toLowerCase().includes(searchLower) ||
      a.department?.toLowerCase().includes(searchLower);
    return matchStatus && matchStart && matchEnd && matchSearch;
  });

  const hasActiveFilter = Boolean(attFilterStartDate || attFilterEndDate || attFilterStatus !== 'ALL' || attendanceSearch);

  const resetFilters = () => {
    setAttFilterStartDate('');
    setAttFilterEndDate('');
    setAttFilterStatus('ALL');
    setAttendanceSearch('');
    setShowAll(false);
  };

  const displayedList = showAll ? filteredAttendance : filteredAttendance.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>{title}</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Institutional Attendance Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-slate-100">
        <div className="p-3 sm:p-4 border-r border-slate-100 space-y-0.5">
          <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Attendance Rate</div>
          <div className="text-base sm:text-lg font-black text-emerald-700">{attRate}%</div>
          <div className="text-[10px] text-slate-400">Biometric compliance rate</div>
        </div>
        <div className="p-3 sm:p-4 sm:border-r border-slate-100 space-y-0.5">
          <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Present</div>
          <div className="text-base sm:text-lg font-black text-slate-900">{presentCount} Records</div>
          <div className="text-[10px] text-slate-400">Verified punches</div>
        </div>
        <div className="p-3 sm:p-4 border-r border-t sm:border-t-0 border-slate-100 space-y-0.5">
          <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Half-Day</div>
          <div className="text-base sm:text-lg font-black text-amber-600">{halfDayCount} Records</div>
          <div className="text-[10px] text-slate-400">Partial day logs</div>
        </div>
        <div className="p-3 sm:p-4 border-t sm:border-t-0 space-y-0.5">
          <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Absent</div>
          <div className="text-base sm:text-lg font-black text-rose-600">{absentCount} Records</div>
          <div className="text-[10px] text-slate-400">Leave / unrecorded punches</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="p-4 sm:p-5 space-y-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Records
          </span>
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Search & Date Range Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty, staff ID, or department..."
              value={attendanceSearch}
              onChange={(e) => { setAttendanceSearch(e.target.value); setShowAll(false); }}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={attFilterStartDate}
              onChange={(e) => { setAttFilterStartDate(e.target.value); setShowAll(false); }}
              placeholder="Start Date"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={attFilterEndDate}
              onChange={(e) => { setAttFilterEndDate(e.target.value); setShowAll(false); }}
              placeholder="End Date"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'ALL',      label: 'All',      color: attFilterStatus === 'ALL'      ? 'bg-slate-800 text-white border-slate-800'     : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100' },
            { key: 'PRESENT',  label: 'Present',  color: attFilterStatus === 'PRESENT'  ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
            { key: 'ABSENT',   label: 'Absent',   color: attFilterStatus === 'ABSENT'   ? 'bg-rose-600 text-white border-rose-600'       : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
            { key: 'HALF_DAY', label: 'Half-Day', color: attFilterStatus === 'HALF_DAY' ? 'bg-amber-500 text-white border-amber-500'     : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => { setAttFilterStatus(key); setShowAll(false); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Records Count Bar */}
      <div className="px-4 sm:px-5 pt-3.5 pb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          Attendance Records ({filteredAttendance.length} {filteredAttendance.length === 1 ? 'Record' : 'Records'})
        </span>
        {hasActiveFilter && (
          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            Filtered View
          </span>
        )}
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block sm:hidden divide-y divide-slate-100">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading attendance records...</div>
        ) : displayedList.length > 0 ? (
          displayedList.map((a) => {
            const isPresent = a.status === 'PRESENT';
            const isHalfDay = a.status === 'HALF_DAY';
            return (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isPresent ? 'bg-emerald-500' : isHalfDay ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">{a.employee_name || 'Staff Member'}</div>
                    <div className="text-[10px] text-slate-500">
                      {a.date ? new Date(a.date + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short'
                      }) : '—'}
                      {' · '}{a.department || 'General'}
                      {' · '}
                      <span className="font-mono">
                        {a.check_in ? a.check_in.slice(0, 5) : '--:--'} → {a.check_out ? a.check_out.slice(0, 5) : '--:--'}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    isPresent
                      ? 'bg-emerald-50 text-emerald-700'
                      : isHalfDay
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {isHalfDay ? 'Half-Day' : isPresent ? 'Present' : 'Absent'}
                </span>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">No attendance records match the selected filters.</div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden sm:block overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading attendance records...</div>
        ) : displayedList.length > 0 ? (
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Faculty / Staff Member</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Check-In</th>
                <th className="py-2.5 px-4">Check-Out</th>
                <th className="py-2.5 px-4">Working Hours</th>
                <th className="py-2.5 px-4 text-right">Biometric Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedList.map((a) => {
                const inTime = a.check_in ? a.check_in.slice(0, 5) : null;
                const outTime = a.check_out ? a.check_out.slice(0, 5) : null;
                let workHours = a.working_hours || '—';
                if ((!a.working_hours || a.working_hours === '—') && inTime && outTime) {
                  const [ih, im] = inTime.split(':').map(Number);
                  const [oh, om] = outTime.split(':').map(Number);
                  const diff = (oh * 60 + om) - (ih * 60 + im);
                  if (diff > 0) workHours = `${Math.floor(diff / 60)}h ${diff % 60}m`;
                }
                const isPresent = a.status === 'PRESENT';
                const isHalfDay = a.status === 'HALF_DAY';
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {a.date ? new Date(a.date + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{a.employee_name || 'Staff Member'}</div>
                      <div className="text-[10px] text-blue-700 font-mono font-semibold">{a.staff_id || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{a.department || 'General'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{inTime || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{outTime || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{workHours}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isPresent
                            ? 'bg-emerald-50 text-emerald-700'
                            : isHalfDay
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isHalfDay ? 'Half-Day' : isPresent ? 'Present' : 'Absent'}
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

      {/* Show More / Less Toggle */}
      {filteredAttendance.length > 6 && (
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
          >
            <span>{showAll ? 'Show Less' : `View More (${filteredAttendance.length - 6} More Records)`}</span>
            {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
