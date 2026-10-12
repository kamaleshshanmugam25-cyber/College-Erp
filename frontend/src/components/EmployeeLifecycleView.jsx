import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Users,
  GraduationCap,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Filter,
  Eye,
  ShieldCheck,
  Banknote,
  Briefcase,
  X,
  Award,
  TrendingUp,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function EmployeeLifecycleView() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllStaff, setShowAllStaff] = useState(false);

  // Filters & search
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [profileModalEmp, setProfileModalEmp] = useState(null);
  const [manageModalEmp, setManageModalEmp] = useState(null);
  const [appraisalModalEmp, setAppraisalModalEmp] = useState(null);

  // Onboard form state
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    email: '',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    employee_type: 'TEACHING',
    lifecycle_status: 'PROBATION',
    joining_date: new Date().toISOString().split('T')[0],
    basic_salary: 40000,
    hra: 12000,
    allowances: 5000,
    pf_applicable: true,
    bank_name: 'State Bank of India',
    account_number: '',
    ifsc: 'SBIN0001234',
  });
  const [submittingOnboard, setSubmittingOnboard] = useState(false);

  // Manage form state
  const [manageStatus, setManageStatus] = useState('CONFIRMED');
  const [manageDesignation, setManageDesignation] = useState('');
  const [submittingManage, setSubmittingManage] = useState(false);

  // Appraisal form state
  const [appraisalForm, setAppraisalForm] = useState({
    review_cycle: '2026 Annual Performance Review',
    rating: 'OUTSTANDING',
    kpi_score: 95,
    attendance_score: 98,
    increment_percent: 15,
    revised_designation: '',
    comments: '',
  });
  const [submittingAppraisal, setSubmittingAppraisal] = useState(false);
  const [appraisalSuccessMsg, setAppraisalSuccessMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, statsRes] = await Promise.all([
        api.getEmployees().catch(() => []),
        api.getEmployeeStats().catch(() => null),
      ]);
      setEmployees(Array.isArray(empRes) ? empRes : empRes?.results || []);
      setStats(statsRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.staff_id?.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    const matchesType = selectedType === 'ALL' || emp.employee_type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || emp.lifecycle_status === selectedStatus;

    return matchesSearch && matchesDept && matchesType && matchesStatus;
  });

  // Confirm probation action
  const handleConfirmProbation = async (empId) => {
    try {
      await api.confirmEmployee(empId);
      loadData();
    } catch (err) {
      alert(`Error confirming probation: ${err.message}`);
    }
  };

  // Open manage modal
  const handleOpenManage = (emp) => {
    setManageModalEmp(emp);
    setManageStatus(emp.lifecycle_status);
    setManageDesignation(emp.designation);
  };

  // Submit manage form
  const handleSubmitManage = async (e) => {
    e.preventDefault();
    if (!manageModalEmp) return;
    setSubmittingManage(true);
    try {
      if (manageStatus !== manageModalEmp.lifecycle_status) {
        await api.transitionEmployeeStatus(manageModalEmp.id, manageStatus);
      }
      if (manageDesignation !== manageModalEmp.designation) {
        await api.updateEmployee(manageModalEmp.id, { designation: manageDesignation });
      }
      setManageModalEmp(null);
      loadData();
    } catch (err) {
      alert(`Error updating employee: ${err.message}`);
    } finally {
      setSubmittingManage(false);
    }
  };

  // Submit onboard form
  const handleSubmitOnboard = async (e) => {
    e.preventDefault();
    setSubmittingOnboard(true);
    try {
      await api.createEmployee(onboardForm);
      setShowOnboardModal(false);
      setOnboardForm({
        name: '',
        email: '',
        department: 'Computer Science',
        designation: 'Assistant Professor',
        employee_type: 'TEACHING',
        lifecycle_status: 'PROBATION',
        joining_date: new Date().toISOString().split('T')[0],
        basic_salary: 40000,
        hra: 12000,
        allowances: 5000,
        pf_applicable: true,
        bank_name: 'State Bank of India',
        account_number: '',
        ifsc: 'SBIN0001234',
      });
      loadData();
    } catch (err) {
      alert(`Error onboarding staff: ${err.message}`);
    } finally {
      setSubmittingOnboard(false);
    }
  };

  // Open Appraisal Modal
  const handleOpenAppraisal = (emp) => {
    setAppraisalModalEmp(emp);
    setAppraisalForm({
      review_cycle: 'FY 2025-26 Faculty Performance Evaluation',
      rating: 'OUTSTANDING',
      kpi_score: 95,
      attendance_score: 98,
      increment_percent: 10,
      revised_designation: emp.designation,
      comments: '',
    });
    setAppraisalSuccessMsg(null);
  };

  // Submit Appraisal Form
  const handleSubmitAppraisal = async (e) => {
    e.preventDefault();
    if (!appraisalModalEmp) return;
    setSubmittingAppraisal(true);
    setAppraisalSuccessMsg(null);
    try {
      const res = await api.appraiseEmployee(appraisalModalEmp.id, appraisalForm);
      setAppraisalSuccessMsg(res.message);
      setTimeout(() => {
        setAppraisalModalEmp(null);
        loadData();
      }, 1800);
    } catch (err) {
      alert(`Appraisal failed: ${err.message}`);
    } finally {
      setSubmittingAppraisal(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROBATION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>On Probation</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Confirmed</span>
          </span>
        );
      case 'NOTICE_PERIOD':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Notice Period</span>
          </span>
        );
      case 'RELIEVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1 w-fit">
            <span>Relieved</span>
          </span>
        );
      default:
        return <span className="text-slate-500 text-xs">{status}</span>;
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[350px] text-slate-500 text-sm">
        Loading employee directory & statutory profiles...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Faculty & Staff Directory & Appraisal Performance Engine
          </h1>
          <p className="text-xs text-slate-500">
            Lifecycle tracking, annual performance appraisals, and salary increments
          </p>
        </div>

        <button
          onClick={() => setShowOnboardModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Staff Member</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Headcount</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_headcount || employees.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stats?.teaching_count || 0} Teaching · {stats?.non_teaching_count || 0} Staff
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">On Probation</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats?.probation_count || 0}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting confirmation evaluation</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Active Confirmed Staff</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.confirmed_count || 0}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff name, ID, designation, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Department selector */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {stats?.departments?.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="TEACHING">Teaching Faculty</option>
              <option value="NON_TEACHING">Non-Teaching Staff</option>
              <option value="CONTRACT">Contractual / Adjunct</option>
            </select>
          </div>
        </div>

        {/* Lifecycle Status Tab Badges */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Staff', count: employees.length },
            { id: 'PROBATION', label: 'On Probation', count: employees.filter(e => e.lifecycle_status === 'PROBATION').length },
            { id: 'CONFIRMED', label: 'Confirmed', count: employees.filter(e => e.lifecycle_status === 'CONFIRMED').length },
            { id: 'NOTICE_PERIOD', label: 'Notice Period', count: employees.filter(e => e.lifecycle_status === 'NOTICE_PERIOD').length },
            { id: 'RELIEVED', label: 'Relieved', count: employees.filter(e => e.lifecycle_status === 'RELIEVED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                selectedStatus === tab.id ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Employee Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-900">
            Staff Directory ({filteredEmployees.length})
          </div>
          <span className="text-xs text-slate-500">
            Showing records matching current filters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Staff ID & Employee</th>
                <th className="py-2.5 px-4">Department & Designation</th>
                <th className="py-2.5 px-4">Gross Salary & Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length > 0 ? (
                (showAllStaff ? filteredEmployees : filteredEmployees.slice(0, 4)).map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    {/* Staff ID & Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[10px] text-blue-700 font-mono font-semibold">{emp.staff_id}</div>
                    </td>

                    {/* Department & Designation */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.designation}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{emp.department}</div>
                    </td>

                    {/* Salary & Status */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">
                        ₹{Number(emp.gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="mt-0.5">{getStatusBadge(emp.lifecycle_status)}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAppraisal(emp)}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          title="Perform Annual Appraisal & Salary Increment"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>Appraise</span>
                        </button>

                        <button
                          onClick={() => handleOpenManage(emp)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No staff records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length > 4 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAllStaff(!showAllStaff)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
            >
              <span>{showAllStaff ? 'Show Less' : `View More (${filteredEmployees.length - 4} More Staff Members)`}</span>
              {showAllStaff ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>


      {/* MODAL 1: PERFORM APPRAISAL & SALARY INCREMENT MODAL */}
      {appraisalModalEmp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Perform Appraisal</h3>
                  <p className="text-[11px] text-slate-500">{appraisalModalEmp.name} ({appraisalModalEmp.staff_id})</p>
                </div>
              </div>
              <button onClick={() => setAppraisalModalEmp(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {appraisalSuccessMsg ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Appraisal Saved</span>
                </div>
                <div>{appraisalSuccessMsg}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAppraisal} className="space-y-3.5">
                {/* Compact Salary Strip */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Current</span>
                    <span className="font-bold text-slate-800">
                      ₹{Number(appraisalModalEmp.gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-600 font-medium block">Revised (+{appraisalForm.increment_percent || 0}%)</span>
                    <span className="font-bold text-emerald-700">
                      ₹{Number(appraisalModalEmp.gross_salary * (1 + parseFloat(appraisalForm.increment_percent || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rating</label>
                    <select
                      value={appraisalForm.rating}
                      onChange={(e) => setAppraisalForm({ ...appraisalForm, rating: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="OUTSTANDING">Outstanding (5.0)</option>
                      <option value="EXCEEDS">Exceeds (4.0)</option>
                      <option value="MEETS">Meets (3.0)</option>
                      <option value="NEEDS_IMPROVEMENT">Needs Improvement (2.0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hike (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={appraisalForm.increment_percent}
                      onChange={(e) => setAppraisalForm({ ...appraisalForm, increment_percent: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revised Designation</label>
                  <input
                    type="text"
                    value={appraisalForm.revised_designation}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, revised_designation: e.target.value })}
                    placeholder={appraisalModalEmp.designation}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Comments</label>
                  <textarea
                    rows={2}
                    value={appraisalForm.comments}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, comments: e.target.value })}
                    placeholder="Enter appraisal remarks..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAppraisalModalEmp(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAppraisal}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {submittingAppraisal ? 'Saving...' : 'Save Appraisal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ONBOARD STAFF MODAL */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Onboard New Faculty / Staff Member</h3>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOnboard} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Rajesh Sharma"
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="rajesh@apex.edu"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.department}
                    onChange={(e) => setOnboardForm({ ...onboardForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.designation}
                    onChange={(e) => setOnboardForm({ ...onboardForm, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    required
                    value={onboardForm.basic_salary}
                    onChange={(e) => setOnboardForm({ ...onboardForm, basic_salary: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">HRA (₹)</label>
                  <input
                    type="number"
                    value={onboardForm.hra}
                    onChange={(e) => setOnboardForm({ ...onboardForm, hra: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Allowances (₹)</label>
                  <input
                    type="number"
                    value={onboardForm.allowances}
                    onChange={(e) => setOnboardForm({ ...onboardForm, allowances: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOnboard}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {submittingOnboard ? 'Onboarding...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE LIFECYCLE STAGE MODAL */}
      {manageModalEmp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Manage Employee Lifecycle Stage</h3>
              <button onClick={() => setManageModalEmp(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lifecycle Stage</label>
                <select
                  value={manageStatus}
                  onChange={(e) => setManageStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-900"
                >
                  <option value="PROBATION">On Probation</option>
                  <option value="CONFIRMED">Confirmed / Active</option>
                  <option value="NOTICE_PERIOD">Notice Period</option>
                  <option value="RELIEVED">Relieved / Exited</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={manageDesignation}
                  onChange={(e) => setManageDesignation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManageModalEmp(null)}
                  className="px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {submittingManage ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW EMPLOYEE PROFILE MODAL */}
      {profileModalEmp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {profileModalEmp.name ? profileModalEmp.name.charAt(0).toUpperCase() : 'E'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{profileModalEmp.name}</h3>
                  <div className="text-[11px] text-slate-500 font-mono">{profileModalEmp.staff_id} · {profileModalEmp.email}</div>
                </div>
              </div>
              <button onClick={() => setProfileModalEmp(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800">{profileModalEmp.department}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation</span>
                  <span className="font-semibold text-slate-800">{profileModalEmp.designation}</span>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">Monthly Compensation</span>
                  <span className="font-extrabold text-sm text-emerald-700">
                    ₹{Number(profileModalEmp.gross_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setProfileModalEmp(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
