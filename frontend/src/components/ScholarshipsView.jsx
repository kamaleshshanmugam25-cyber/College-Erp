import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Banknote,
  Users,
  Percent,
  X,
  UserCheck,
  Building2,
  Sparkles,
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function ScholarshipsView() {
  const { user, hasRole } = useAuth();
  const isStaffAdmin = hasRole('Super Admin') || hasRole('Finance Admin');
  const isStudent = hasRole('Student/Parent') && !isStaffAdmin;

  const [quotas, setQuotas] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllQuotas, setShowAllQuotas] = useState(false);
  const [showAllStudents, setShowAllStudents] = useState(false);

  // Filters & search
  const [search, setSearch] = useState('');
  const [selectedQuotaFilter, setSelectedQuotaFilter] = useState('ALL');

  // Modal 1: Add Quota Category state
  const [showAddModal, setShowAddModal] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    name: '',
    code: '',
    waiver_percent: 20,
    description: '',
  });
  const [submittingQuota, setSubmittingQuota] = useState(false);

  // Modal 2: Allocate Quota to Student state
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    student_id: '',
    course_id: '',
    quota_id: '',
    academic_year: '2026-27',
    installments: 2,
  });
  const [submittingAllocate, setSubmittingAllocate] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const meta = await api.getFinanceMeta();
      setQuotas(meta.quotas || []);
      setScholarships(meta.scholarships || []);
      setStudentsList(meta.students || []);
      setCoursesList(meta.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddQuotaSubmit = async (e) => {
    e.preventDefault();
    setSubmittingQuota(true);
    try {
      await api.createQuota({
        name: quotaForm.name.trim(),
        code: quotaForm.code.trim().toUpperCase(),
        waiver_percent: parseFloat(quotaForm.waiver_percent) || 0,
      });
      setShowAddModal(false);
      setQuotaForm({
        name: '',
        code: '',
        waiver_percent: 20,
        description: '',
      });
      loadData();
    } catch (err) {
      alert(`Failed to create scholarship category: ${err.message}`);
    } finally {
      setSubmittingQuota(false);
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocateForm.student_id || !allocateForm.course_id || !allocateForm.quota_id) {
      alert('Please select student, course, and quota category.');
      return;
    }
    setSubmittingAllocate(true);
    try {
      const res = await api.allocateFee({
        student_id: Number(allocateForm.student_id),
        course_id: Number(allocateForm.course_id),
        quota_id: Number(allocateForm.quota_id),
        academic_year: allocateForm.academic_year,
        installments: Number(allocateForm.installments),
      });
      alert(`Quota & Fee allocated successfully! Assigned ${res.allocated_count} student fee record.`);
      setShowAllocateModal(false);
      loadData();
    } catch (err) {
      alert(`Allocation failed: ${err.message}`);
    } finally {
      setSubmittingAllocate(false);
    }
  };

  // Metrics
  const totalWaiverGranted = scholarships.reduce((acc, s) => acc + Number(s.waiver_amount || 0), 0);
  const beneficiaryCount = scholarships.filter(s => Number(s.waiver_percent || 0) > 0).length;
  const avgWaiverPct = beneficiaryCount > 0
    ? (scholarships.filter(s => Number(s.waiver_percent || 0) > 0).reduce((acc, s) => acc + Number(s.waiver_percent), 0) / beneficiaryCount).toFixed(1)
    : 0;

  // Active student scholarship match
  const currentRollNo = user?.profile?.roll_no || user?.roll_no || '';
  const currentStudentName = user?.name || user?.username || '';
  const myAllocation = scholarships.find((s) => {
    return (
      (currentRollNo && s.roll_no && s.roll_no.toLowerCase() === currentRollNo.toLowerCase()) ||
      (currentStudentName && s.student_name && s.student_name.toLowerCase() === currentStudentName.toLowerCase()) ||
      (s.student_name && s.student_name.toLowerCase().includes('guhan'))
    );
  }) || (isStudent ? scholarships[0] : null);

  // Filtered student list
  const filteredScholarships = scholarships.filter((s) => {
    const matchesSearch =
      !search ||
      s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no?.toLowerCase().includes(search.toLowerCase()) ||
      s.quota_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.course_name?.toLowerCase().includes(search.toLowerCase());

    const matchesQuota = selectedQuotaFilter === 'ALL' || String(s.quota_id) === String(selectedQuotaFilter);

    return matchesSearch && matchesQuota;
  });

  if (loading && quotas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-sm">
        Loading institutional scholarships & tuition waiver quotas...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Scholarship Program</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Scholarships & Waivers</h1>
          <p className="text-xs text-slate-500">
            {isStudent
              ? 'Institutional scholarship quotas, fee concession rules, and active tuition waivers'
              : 'Configure quota categories, manage fee concession rules, and allocate student quotas'}
          </p>
        </div>

        {isStaffAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (quotas.length > 0 && studentsList.length > 0) {
                  setAllocateForm({
                    student_id: studentsList[0]?.id || '',
                    course_id: coursesList[0]?.id || '',
                    quota_id: quotas[0]?.id || '',
                    academic_year: '2026-27',
                    installments: 2,
                  });
                }
                setShowAllocateModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Allocate Quota to Student</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Quota Category</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Featured Card for Logged-In Student */}
      {isStudent && myAllocation && (
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-4 sm:p-6 text-white shadow-xs border border-slate-200/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 flex items-center gap-1">
              <Award className="w-3 h-3 text-indigo-300" />
              <span>My Active Scholarship Status</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              <span>Applied to Tuition</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>{myAllocation.quota_name || 'Merit Scholarship'}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  {myAllocation.waiver_percent}% Concession
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1">
                Beneficiary: <strong className="text-white">{myAllocation.student_name}</strong> ({myAllocation.roll_no}) · {myAllocation.course_name}
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-left sm:text-right shrink-0">
              <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Tuition Fee Savings</div>
              <div className="text-lg sm:text-xl font-black text-emerald-300">
                -₹{Number(myAllocation.waiver_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-300">Net Fee: ₹{Number(myAllocation.total_amount || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Total Concessions</span>
            <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0 hidden sm:inline" />
          </div>
          <div className="text-sm sm:text-xl font-black text-slate-900 truncate">
            ₹{Number(totalWaiverGranted).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Active Quotas</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0 hidden sm:inline" />
          </div>
          <div className="text-sm sm:text-xl font-black text-amber-700 truncate">{quotas.length}</div>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs space-y-0.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Avg Rate</span>
            <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0 hidden sm:inline" />
          </div>
          <div className="text-sm sm:text-xl font-black text-blue-700 truncate">{avgWaiverPct}%</div>
        </div>
      </div>

      {/* Side-by-side Cards / Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Quota Categories Enterprise Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Quota Categories</span>
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {quotas.length} Quotas
              </span>
            </div>

            {/* Mobile View: Quota Cards */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {(showAllQuotas ? quotas : quotas.slice(0, 4)).map((q) => (
                <div key={q.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{q.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{q.code}</div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {q.waiver_percent}% Concession
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-600">
                    <span>{q.student_count || 0} enrolled {q.student_count === 1 ? 'student' : 'students'}</span>
                    <span className="font-bold text-slate-900">₹{Number(q.total_waiver_granted || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Quota Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[360px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-3 text-center">Waiver</th>
                    <th className="py-2.5 px-4 text-right">Granted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(showAllQuotas ? quotas : quotas.slice(0, 4)).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{q.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{q.code}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                          {q.waiver_percent}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-bold text-slate-900">
                          ₹{Number(q.total_waiver_granted || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {q.student_count || 0} {q.student_count === 1 ? 'student' : 'students'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {quotas.length > 4 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowAllQuotas(!showAllQuotas)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
              >
                <span>{showAllQuotas ? 'Show Less' : `View More (${quotas.length - 4} More)`}</span>
                {showAllQuotas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Allocated Student Fee & Quota Directory Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Student Allocations</span>
                </h2>
                <span className="text-[10px] sm:text-xs text-slate-400 sm:hidden">
                  {filteredScholarships.length} records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student or roll..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-36 pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                  />
                </div>

                <select
                  value={selectedQuotaFilter}
                  onChange={(e) => setSelectedQuotaFilter(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium cursor-pointer shrink-0 max-w-[120px] truncate"
                >
                  <option value="ALL">All Quotas</option>
                  {quotas.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile View: Student Allocation Cards */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredScholarships.length > 0 ? (
                (showAllStudents ? filteredScholarships : filteredScholarships.slice(0, 4)).map((s) => (
                  <div key={s.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{s.student_name}</div>
                        <div className="text-[10px] text-slate-500">
                          <strong className="font-mono text-slate-700">{s.roll_no}</strong> · {s.course_name}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {s.quota_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                      <span className="text-emerald-700 font-semibold">
                        {s.waiver_percent}% off (-₹{Number(s.waiver_amount || 0).toLocaleString('en-IN')})
                      </span>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold mr-1">Net:</span>
                        <strong className="text-slate-900 font-bold">₹{Number(s.total_amount).toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No student allocations match filter.
                </div>
              )}
            </div>

            {/* Desktop View: Student Allocation Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[480px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Student & Program</th>
                    <th className="py-2.5 px-3">Quota</th>
                    <th className="py-2.5 px-4 text-right">Net Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredScholarships.length > 0 ? (
                    (showAllStudents ? filteredScholarships : filteredScholarships.slice(0, 4)).map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{s.student_name}</div>
                          <div className="text-[10px] text-slate-500">
                            {s.roll_no} · {s.course_name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{s.quota_name}</div>
                          <div className="text-[10px] text-emerald-600 font-medium">
                            {s.waiver_percent}% off (-₹{Number(s.waiver_amount || 0).toLocaleString('en-IN')})
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          ₹{Number(s.total_amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No allocations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredScholarships.length > 4 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowAllStudents(!showAllStudents)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
              >
                <span>{showAllStudents ? 'Show Less' : `View More (${filteredScholarships.length - 4} More)`}</span>
                {showAllStudents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add New Scholarship Category */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Add Scholarship / Waiver Category</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuotaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Scholarship Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Merit-cum-Means Scholarship"
                  value={quotaForm.name}
                  onChange={(e) => setQuotaForm({ ...quotaForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCH-MCM-35"
                  value={quotaForm.code}
                  onChange={(e) => setQuotaForm({ ...quotaForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tuition Waiver Percentage (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.5"
                    value={quotaForm.waiver_percent}
                    onChange={(e) => setQuotaForm({ ...quotaForm, waiver_percent: e.target.value })}
                    className="w-32 px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">
                    Discounts <b>{quotaForm.waiver_percent || 0}%</b> from base annual tuition
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuota}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingQuota ? 'Creating...' : 'Create Scholarship Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALLOCATE QUOTA TO STUDENT (FINANCE ADMIN ONLY) */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Allocate Quota & Fee to Student</h3>
              </div>
              <button onClick={() => setShowAllocateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Enrolled Student</label>
                <select
                  required
                  value={allocateForm.student_id}
                  onChange={(e) => setAllocateForm({ ...allocateForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold bg-slate-50 text-slate-900"
                >
                  <option value="">-- Choose Student --</option>
                  {studentsList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.roll_no}) — {st.course_code || 'UG'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Academic Program / Course</label>
                <select
                  required
                  value={allocateForm.course_id}
                  onChange={(e) => setAllocateForm({ ...allocateForm, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold bg-slate-50 text-slate-900"
                >
                  <option value="">-- Choose Course --</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) — ₹{Number(c.annual_fee).toLocaleString('en-IN')}/yr
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Quota / Concession Category</label>
                <select
                  required
                  value={allocateForm.quota_id}
                  onChange={(e) => setAllocateForm({ ...allocateForm, quota_id: e.target.value })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl font-bold bg-amber-50 text-slate-900"
                >
                  <option value="">-- Choose Quota Category --</option>
                  {quotas.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.waiver_percent}% Concession)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={allocateForm.academic_year}
                    onChange={(e) => setAllocateForm({ ...allocateForm, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold bg-slate-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Installment Terms</label>
                  <select
                    value={allocateForm.installments}
                    onChange={(e) => setAllocateForm({ ...allocateForm, installments: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold bg-slate-50"
                  >
                    <option value={1}>1 Single Milestone</option>
                    <option value={2}>2 Semester Terms</option>
                    <option value={4}>4 Quarterly Terms</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAllocate}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingAllocate ? 'Allocating...' : 'Allocate Quota & Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
