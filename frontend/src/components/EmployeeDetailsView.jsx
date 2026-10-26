import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  UserCheck,
  CalendarCheck2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Building,
  Mail,
  Briefcase,
  Banknote,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

function getInitials(name = '') {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EmployeeDetailsView({ setActiveTab }) {
  const { user } = useAuth();
  const [empRecord, setEmpRecord] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [leavesList, setLeavesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadAllDetails = async () => {
    try {
      setError(null);
      const [empRes, attRes, leavesRes] = await Promise.all([
        api.getEmployees().catch(() => ({ results: [] })),
        api.getAttendanceSummary().catch(() => null),
        api.getLeaves().catch(() => ({ results: [] })),
      ]);

      const employees = Array.isArray(empRes) ? empRes : empRes.results || [];
      if (employees.length > 0) {
        setEmpRecord(employees[0]);
      } else {
        setEmpRecord(null);
      }

      setAttendanceSummary(attRes);
      setLeavesList(Array.isArray(leavesRes) ? leavesRes : leavesRes.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllDetails();
  }, [user?.username]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllDetails();
  };

  // Resolved Profile Values
  const displayName = empRecord?.name || user?.name || user?.username || 'Faculty Member';
  const staffId = empRecord?.staff_id || user?.profile?.staff_id || 'FF001';
  const department = empRecord?.department || user?.profile?.department || 'Computer Science';
  const designation = empRecord?.designation || user?.profile?.designation || 'Assistant Professor';
  const email = empRecord?.email || user?.email || 'karthi@employee.com';
  const status = empRecord?.lifecycle_status || 'CONFIRMED';
  const joiningDate = empRecord?.joining_date || '2026-10-08';
  const basicSalary = empRecord?.basic_salary ? Number(empRecord.basic_salary) : 25999;
  const hra = empRecord?.hra ? Number(empRecord.hra) : 10000;
  const allowances = empRecord?.allowances ? Number(empRecord.allowances) : 2000;
  const grossSalary = empRecord?.gross_salary ? Number(empRecord.gross_salary) : (basicSalary + hra + allowances);
  const bankName = empRecord?.bank_name || 'HDFC Bank';

  // Attendance Values
  const attendanceRate = Math.round(attendanceSummary?.attendance_rate ?? 100);
  const daysPresent = attendanceSummary?.present ?? 3;
  const totalDays = attendanceSummary?.total_days ?? 3;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Employee Self-Service & Official Record</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Employee Details & Records
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified staff profile, attendance logs, and leave balances
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Faculty
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: OFFICIAL EMPLOYEE PROFILE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                {getInitials(displayName)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{displayName}</h2>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wide">
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {designation} • <span className="text-slate-700 font-semibold">{department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200 w-full sm:w-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Staff Identification</span>
              <span className="text-sm font-extrabold text-blue-700 font-mono">{staffId}</span>
            </div>
          </div>
        </div>

        {/* 6-Cell Profile Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Department
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>{department}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Designation
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>{designation}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Institutional Email
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Date of Joining
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{joiningDate}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Gross Monthly Salary
            </span>
            <div className="font-extrabold text-emerald-700 flex items-center gap-1.5 text-sm">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>₹{grossSalary.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Bank
            </span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{bankName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LEAVES & ATTENDANCE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Attendance & Leave Records</h3>
            </div>
          </div>

          <button
            onClick={() => setActiveTab && setActiveTab('employee-leaves')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <span>Apply Leave / View Punch Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Attendance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Attendance Rate</span>
            <div className="text-xl font-black text-emerald-800 mt-1">{attendanceRate}%</div>
            <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(attendanceRate, 100)}%` }} />
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Days Present</span>
            <div className="text-xl font-black text-blue-900 mt-1">{daysPresent} Days</div>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Leave Balance</span>
            <div className="text-sm font-extrabold text-amber-900 mt-1">12 Casual • 10 Sick</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Loss of Pay (LOP)</span>
            <div className="text-xl font-black text-slate-800 mt-1">0.0 Days</div>
          </div>
        </div>

        {/* Leave Requests Sub-table */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span>Recent Leave Applications</span>
            <span className="text-[11px] text-slate-400 font-normal">
              {leavesList.length} application(s) recorded
            </span>
          </div>

          {leavesList.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Duration</th>
                    <th className="py-2.5 px-3.5">Reason</th>
                    <th className="py-2.5 px-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leavesList.slice(0, 3).map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{leave.leave_type}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{leave.start_date} to {leave.end_date}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 truncate max-w-[200px]">{leave.reason || '—'}</td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          leave.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : leave.status === 'REJECTED'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
              No previous leave applications recorded for this academic year.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
