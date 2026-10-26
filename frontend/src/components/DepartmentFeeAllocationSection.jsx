import React, { useState, useEffect } from 'react';
import {
  Building2,
  Coins,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  X,
  Check,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';

export function DepartmentFeeAllocationSection({
  departments = [],
  quotas = [],
  academicYear = '2026-27',
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'single'

  // Single Department Form State
  const [selectedDept, setSelectedDept] = useState(departments[0]?.department || '');
  const [customDept, setCustomDept] = useState('');
  const [singleFee, setSingleFee] = useState(departments[0]?.suggested_fee || 25000);
  const [singleQuota, setSingleQuota] = useState(quotas[0]?.id || '');
  const [singleInstallments, setSingleInstallments] = useState(1);
  const [singleDue, setSingleDue] = useState(new Date().toISOString().split('T')[0]);
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Matrix State: fee and terms entered for EACH department
  const [matrixFees, setMatrixFees] = useState({});
  const [matrixInstallments, setMatrixInstallments] = useState({});
  const [matrixQuota, setMatrixQuota] = useState(quotas[0]?.id || '');
  const [matrixDue, setMatrixDue] = useState(new Date().toISOString().split('T')[0]);
  const [submittingDept, setSubmittingDept] = useState(null); // specific dept being submitted
  const [submittingAll, setSubmittingAll] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Initialize matrix inputs when departments change
  useEffect(() => {
    const feesInit = {};
    const instInit = {};
    departments.forEach((d) => {
      feesInit[d.department] = d.suggested_fee || d.current_allocated_fee || 25000;
      instInit[d.department] = 1;
    });
    setMatrixFees(feesInit);
    setMatrixInstallments(instInit);
    if (!selectedDept && departments[0]) {
      setSelectedDept(departments[0].department);
      setSingleFee(departments[0].suggested_fee || 25000);
    }
  }, [departments]);

  useEffect(() => {
    if (quotas.length > 0 && !singleQuota) {
      setSingleQuota(quotas[0].id);
      setMatrixQuota(quotas[0].id);
    }
  }, [quotas]);

  // Handle single department submission
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const deptToUse = selectedDept === '__CUSTOM__' ? customDept.trim() : selectedDept;
    if (!deptToUse) {
      setError('Please select or specify a department name.');
      return;
    }
    if (!singleFee || Number(singleFee) <= 0) {
      setError('Please enter a valid tuition fee amount greater than zero.');
      return;
    }

    setSubmittingSingle(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await api.allocateDepartmentFee({
        department: deptToUse,
        fee_amount: Number(singleFee),
        quota_id: singleQuota,
        installments: 1,
        academic_year: academicYear,
        first_due: singleDue,
      });

      setFeedback(res.message || `Successfully allocated ₹${Number(singleFee).toLocaleString('en-IN')} to Department of ${deptToUse}!`);
      if (onSuccess) onSuccess();
      setTimeout(() => setFeedback(null), 7000);
    } catch (err) {
      setError(err.message || 'Failed to allocate department fee.');
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Handle individual department row submission in matrix
  const handleMatrixRowSubmit = async (deptName) => {
    const feeVal = matrixFees[deptName];
    if (!feeVal || Number(feeVal) <= 0) {
      setError(`Please enter a valid fee amount for ${deptName}.`);
      return;
    }

    setSubmittingDept(deptName);
    setError(null);
    setFeedback(null);

    try {
      const res = await api.allocateDepartmentFee({
        department: deptName,
        fee_amount: Number(feeVal),
        quota_id: matrixQuota,
        installments: 1,
        academic_year: academicYear,
        first_due: matrixDue,
      });

      setFeedback(res.message || `Successfully allocated ₹${Number(feeVal).toLocaleString('en-IN')} to ${deptName}!`);
      if (onSuccess) onSuccess();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err) {
      setError(err.message || `Failed to allocate fee for ${deptName}.`);
    } finally {
      setSubmittingDept(null);
    }
  };

  // Handle batch allocation for ALL departments at once
  const handleMatrixAllSubmit = async () => {
    const batch = departments.map((d) => ({
      department: d.department,
      fee_amount: Number(matrixFees[d.department] || d.suggested_fee || 25000),
      installments: 1,
    }));

    setSubmittingAll(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await api.allocateDepartmentFee({
        batch_allocations: batch,
        quota_id: matrixQuota,
        academic_year: academicYear,
        first_due: matrixDue,
      });

      setFeedback(res.message || 'Successfully allocated fees across all academic departments!');
      if (onSuccess) onSuccess();
      setTimeout(() => setFeedback(null), 7000);
    } catch (err) {
      setError(err.message || 'Failed to batch allocate department fees.');
    } finally {
      setSubmittingAll(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white border border-indigo-200 rounded-3xl shadow-sm space-y-5 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Enter Fee & Allocate by Department
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {academicYear}
              </span>
            </div>

          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Each Department Matrix ({departments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Department
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: EACH DEPARTMENT MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Shared Parameters (Due Date) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Enter Tuition Fee Amount for Each Department</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase shrink-0">
                Due Date:
              </label>
              <input
                type="date"
                value={matrixDue}
                onChange={(e) => setMatrixDue(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Department Fee Rows / Cards */}
          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">Academic Department & Programs</div>
              <div className="col-span-2 text-center">Enrolled Students</div>
              <div className="col-span-3">Enter Fee Amount (₹)</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {departments.map((dept) => {
              const currentFee = matrixFees[dept.department] !== undefined 
                ? matrixFees[dept.department] 
                : dept.suggested_fee || 25000;
              const currentTerms = matrixInstallments[dept.department] || 1;
              const isSubmittingThis = submittingDept === dept.department;

              return (
                <div
                  key={dept.department}
                  className="p-3.5 sm:p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-2xs transition-all space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center"
                >
                  {/* Dept details */}
                  <div className="sm:col-span-5 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {dept.department}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {dept.courses?.map((c) => c.name).join(', ') || `${dept.courses_count} Program(s)`}
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Students Badge */}
                  <div className="sm:col-span-2 flex sm:justify-center items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 sm:hidden">Enrolled: </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dept.enrolled_count} Students</span>
                    </span>
                  </div>

                  {/* Fee Input Box */}
                  <div className="sm:col-span-3 space-y-1">
                    <div className="sm:hidden text-[10px] font-bold text-slate-500 uppercase">
                      Enter Fee (₹):
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="Enter Fee"
                        value={currentFee}
                        onChange={(e) => setMatrixFees({ ...matrixFees, [dept.department]: e.target.value })}
                        className="w-full pl-7 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        min="1"
                        step="100"
                        required
                      />
                    </div>
                  </div>

                  {/* Individual Allocate Button */}
                  <div className="sm:col-span-2 flex sm:justify-end">
                    <button
                      type="button"
                      onClick={() => handleMatrixRowSubmit(dept.department)}
                      disabled={isSubmittingThis || submittingAll}
                      className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isSubmittingThis ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Allocating...</span>
                        </>
                      ) : (
                        <span>Allocate Fee</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Batch Action Footer */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
            <div className="text-[11px] text-indigo-900 font-medium">
              Ready to allocate entered fees across all {departments.length} departments for Session {academicYear}.
            </div>

            <button
              type="button"
              onClick={handleMatrixAllSubmit}
              disabled={submittingAll || submittingDept !== null}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {submittingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Allocating to All Departments...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Allocate Fees to All ({departments.length}) Departments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SINGLE DEPARTMENT ALLOCATION FORM */}
      {activeTab === 'single' && (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Department Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Academic Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  const found = departments.find((d) => d.department === e.target.value);
                  if (found) setSingleFee(found.suggested_fee || 25000);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                required
              >
                {departments.map((d) => (
                  <option key={d.department} value={d.department}>
                    {d.department} ({d.enrolled_count} Students Enrolled)
                  </option>
                ))}
                <option value="__CUSTOM__">+ Add Custom Department Name</option>
              </select>

              {selectedDept === '__CUSTOM__' && (
                <input
                  type="text"
                  placeholder="Enter Department Name (e.g. Civil Engineering)"
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              )}
            </div>

            {/* Fee Amount to Allocate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tuition Fee Amount to Allocate (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 30000"
                  value={singleFee}
                  onChange={(e) => setSingleFee(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  min="1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={singleDue}
              onChange={(e) => setSingleDue(e.target.value)}
              className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submittingSingle}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {submittingSingle ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Allocating Fee...</span>
                </>
              ) : (
                <>
                  <span>Allocate Fee to {selectedDept === '__CUSTOM__' ? customDept || 'Department' : selectedDept}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
