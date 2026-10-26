import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Calculator, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  UserCheck,
  Users,
  Plus,
  BookOpen,
  X,
  ArrowRight,
  Building2,
  Coins
} from 'lucide-react';
import { DepartmentFeeAllocationSection } from '../components/DepartmentFeeAllocationSection';

export function FeeCalculator() {
  const [courses, setCourses] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedQuota, setSelectedQuota] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [allocationMode, setAllocationMode] = useState('batch');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [firstDue, setFirstDue] = useState(new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocationSuccess, setAllocationSuccess] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Course Modal State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [departments, setDepartments] = useState([]);
  const [showDeptAllocation, setShowDeptAllocation] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseDept, setNewCourseDept] = useState('Computer Science');
  const [newCourseFee, setNewCourseFee] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  const loadMeta = async () => {
    try {
      const meta = await api.getFinanceMeta();
      setCourses(meta.courses || []);
      setQuotas(meta.quotas || []);
      setStudents(meta.students || []);
      setDepartments(meta.departments || []);
      // Keep both selectedCourse and selectedQuota blank so placeholders show on load
    } catch (err) {
      setError('Failed to load courses, quotas, or students.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // When course changes, pick matching students
  useEffect(() => {
    if (selectedCourse && students.length > 0) {
      const courseStudents = students.filter((s) => String(s.course_id) === String(selectedCourse));
      if (courseStudents.length > 0) {
        setSelectedStudent(courseStudents[0].id);
      } else {
        setSelectedStudent(students[0]?.id || '');
      }
    } else {
      setSelectedStudent('');
    }
  }, [selectedCourse, students]);

  const handleCalculate = async () => {
    if (!selectedCourse || !selectedQuota) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.calculateFee({
        course: selectedCourse,
        quota: selectedQuota,
        installments: Number(installments),
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourse && selectedQuota) {
      handleCalculate();
    } else {
      setResult(null);
    }
  }, [selectedCourse, selectedQuota, installments]);

  const handleAllocateFee = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedQuota) {
      alert('Please select both a course and a quota category.');
      return;
    }
    if (allocationMode === 'single' && !selectedStudent) {
      alert('Please select a student.');
      return;
    }
    setAllocating(true);
    setError(null);
    setAllocationSuccess(null);
    try {
      const payload = {
        course_id: selectedCourse,
        quota_id: selectedQuota,
        academic_year: academicYear,
        installments: Number(installments),
        first_due: firstDue,
      };
      if (allocationMode === 'batch') {
        payload.allocate_all = true;
      } else {
        payload.student_id = selectedStudent;
      }
      const res = await api.allocateFee(payload);
      if (allocationMode === 'batch') {
        let msg = `Successfully allocated fee schedule to ${res.allocated_count} student(s) in ${res.course}!`;
        if (res.skipped_count > 0) {
          msg += ` (${res.skipped_count} already had active fee schedules)`;
        }
        setAllocationSuccess(msg);
      } else {
        setAllocationSuccess(`Successfully allocated ₹${res.total_amount} across ${res.installments_count} terms to ${res.student || 'student'}!`);
      }
      const meta = await api.getFinanceMeta();
      setStudents(meta.students || []);
      setTimeout(() => setAllocationSuccess(null), 6000);
    } catch (err) {
      setError(err.message || 'Failed to allocate fee.');
    } finally {
      setAllocating(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim() || !newCourseCode.trim() || !newCourseFee) {
      alert('Please fill in all course fields.');
      return;
    }
    setCreatingCourse(true);
    setError(null);
    try {
      const res = await api.createCourse({
        name: newCourseName.trim(),
        code: newCourseCode.trim(),
        department: newCourseDept.trim() || 'Computer Science',
        annual_fee: Number(newCourseFee),
      });
      setAllocationSuccess(`Course "${res.course.name} (${res.course.code})" created under Department of ${res.course.department || newCourseDept} successfully!`);
      setNewCourseName('');
      setNewCourseCode('');
      setNewCourseFee('');
      setShowAddCourse(false);
      const meta = await api.getFinanceMeta();
      setCourses(meta.courses || []);
      setQuotas(meta.quotas || []);
      setStudents(meta.students || []);
      setSelectedCourse(res.course.id);
      setTimeout(() => setAllocationSuccess(null), 6000);
    } catch (err) {
      setError(err.message || 'Failed to create course.');
    } finally {
      setCreatingCourse(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-sm">
        Loading fee calculator metadata...
      </div>
    );
  }

  const enrolledStudents = students.filter((s) => String(s.course_id) === String(selectedCourse));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Institutional Fee Structure & Student Allocation</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">
            Manage academic programs, simulate quota waivers, and allocate official fee obligations to students
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Near Add Academic Course: Professional Allocate Department Fee Button */}
          <button
            type="button"
            onClick={() => setShowDeptAllocation(!showDeptAllocation)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>{showDeptAllocation ? 'Close Department Fee' : '+ Allocate Department Fee'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCourse(!showAddCourse)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            {showAddCourse ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showAddCourse ? 'Close Form' : 'Add Academic Course'}</span>
          </button>
        </div>
      </div>

      {/* Enter Fee & Allocate to Each Department Panel */}
      {showDeptAllocation && (
        <DepartmentFeeAllocationSection
          departments={departments}
          quotas={quotas}
          academicYear={academicYear}
          onClose={() => setShowDeptAllocation(false)}
          onSuccess={() => {
            loadMeta();
            if (selectedCourse && selectedQuota) handleCalculate();
          }}
        />
      )}

      {/* Add Course Form Panel */}
      {showAddCourse && (
        <div className="p-5 bg-white border border-blue-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Add New Academic Course Program</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCourse(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech Information Technology"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. FS-2026-BTECH-IT"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Department</label>
                <select
                  value={newCourseDept}
                  onChange={(e) => setNewCourseDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Computer Applications">Computer Applications</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Life Sciences">Life Sciences</option>
                  <option value="Management Studies">Management Studies</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Electrical & Electronics">Electrical & Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Tuition Fee (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={newCourseFee}
                  onChange={(e) => setNewCourseFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddCourse(false)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingCourse}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {creatingCourse ? 'Creating...' : 'Save & Make Available'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {allocationSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{allocationSuccess}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Controls Card */}
        <div className="md:col-span-5 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 sm:space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Admission Parameters</span>
          </h2>

          {/* Course Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Course Program</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="" disabled>Select a Course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) — ₹{Number(c.annual_fee).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          {/* Quota Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quota & Waiver Category</label>
            <select
              value={selectedQuota}
              onChange={(e) => setSelectedQuota(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="" disabled>Select a Quota</option>
              {quotas.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.code}) — {q.waiver_percent}% Waiver
                </option>
              ))}
            </select>
          </div>

          {/* Installments count */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Installment Split</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setInstallments(num)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    installments === num
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num} {num === 1 ? 'Shot' : 'Terms'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Even split across months with month-end rounding guarantee
            </p>
          </div>
        </div>

        {/* Calculation Result & Allocation Card */}
        <div className="md:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fee Assessment Breakdown</span>
              {loading && <span className="text-xs text-blue-600 animate-pulse font-medium">Recalculating...</span>}
            </div>

            {result ? (
              <div className="mt-3.5 space-y-4">
                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Base Fee</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      ₹{Number(result.annual_fee).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Waiver Saved</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">
                      -₹{Number(result.annual_fee - result.total).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-blue-700 font-bold uppercase">Net Payable</div>
                    <div className="text-sm font-black text-blue-900 mt-0.5">
                      ₹{Number(result.total).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Compact Installment Due Schedule Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">
                      Installment Due Schedule ({result.schedule?.length} Terms)
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Term</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {result.schedule?.map((s) => (
                          <tr key={s.sequence} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-bold text-slate-700">Term {s.sequence}</td>
                            <td className="py-1.5 px-3 text-slate-600 font-mono text-[11px]">{s.due_date}</td>
                            <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                              ₹{Number(s.amount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clean & Compact Allocation Section */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">Student Fee Allocation</span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setAllocationMode('batch')}
                        className={`px-2 py-0.5 rounded font-semibold text-[11px] transition ${
                          allocationMode === 'batch'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({enrolledStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationMode('single')}
                        className={`px-2 py-0.5 rounded font-semibold text-[11px] transition ${
                          allocationMode === 'single'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Single
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAllocateFee} className="space-y-2.5">
                    {allocationMode === 'single' && (
                      <div>
                        <select
                          value={selectedStudent}
                          onChange={(e) => setSelectedStudent(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                        >
                          {enrolledStudents.length > 0 ? (
                            enrolledStudents.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.roll_no})
                              </option>
                            ))
                          ) : (
                            students.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.roll_no})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Session</label>
                        <input
                          type="text"
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">1st Due Date</label>
                        <input
                          type="date"
                          value={firstDue}
                          onChange={(e) => setFirstDue(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={allocating || (allocationMode === 'batch' && enrolledStudents.length === 0)}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <span>
                        {allocating
                          ? 'Allocating...'
                          : allocationMode === 'batch'
                          ? `Allocate Fee to All (${enrolledStudents.length}) Students`
                          : 'Allocate Fee to Selected Student'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Select admission course and category parameters to calculate schedule.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Allocations Summary Table */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">All Academic Courses & Fee Allocation Status</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Overview of all registered programs, base annual fees, enrolled students, and fee allocations
            </p>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 shrink-0">
            {courses.length} Programs Registered
          </span>
        </div>

        {/* MOBILE COURSE CARDS VIEW */}
        <div className="block sm:hidden divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          {courses.map((c) => {
            const isSelected = String(c.id) === String(selectedCourse);
            const isComplete = c.enrolled_count > 0 && c.allocated_count >= c.enrolled_count;
            return (
              <div
                key={c.id}
                className={`p-3.5 space-y-2.5 transition ${isSelected ? 'bg-blue-50/60' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                    <div className="text-[10px] text-blue-700 font-mono font-semibold mt-0.5">{c.code}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">
                      ₹{Number(c.annual_fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Annual Base Fee</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{c.enrolled_count || 0} Enrolled</span>
                  </div>
                  <div>
                    {c.enrolled_count === 0 ? (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">
                        0 Enrolled
                      </span>
                    ) : isComplete ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                        {c.allocated_count} / {c.enrolled_count} Allocated (100%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                        {c.allocated_count} / {c.enrolled_count} Allocated
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse(c.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ Currently Selected for Allocation' : 'Select for Fee Allocation'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Course Program</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Course Code</th>
                <th className="py-2.5 px-4 text-right">Annual Base Fee</th>
                <th className="py-2.5 px-4 text-center">Enrolled Students</th>
                <th className="py-2.5 px-4 text-center">Fee Status (2026-27)</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => {
                const isSelected = String(c.id) === String(selectedCourse);
                const isComplete = c.enrolled_count > 0 && c.allocated_count >= c.enrolled_count;
                return (
                  <tr
                    key={c.id}
                    className={`transition ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        <span>{c.department || 'General'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">
                      ₹{Number(c.annual_fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600">
                      {c.enrolled_count || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.enrolled_count === 0 ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">
                          0 Enrolled
                        </span>
                      ) : isComplete ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                          {c.allocated_count} / {c.enrolled_count} Allocated (100%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                          {c.allocated_count} / {c.enrolled_count} Allocated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourse(c.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Currently Selected' : 'Select & Allocate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}