import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  KeyRound,
  ShieldCheck,
  Building2,
  Mail,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  X,
  Lock,
  Edit2,
  Eye,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Briefcase,
  Zap,
  CheckSquare,
  Square,
  SlidersHorizontal
} from 'lucide-react';

const FINANCE_MODULES = [
  { id: 'fee-structures', label: 'Fee Structures & Calculator', desc: 'Tuition slabs, fee calculator & student dues', category: 'Fees' },
  { id: 'invoices-receipts', label: 'Invoices & Receipts', desc: 'Official student invoices, counter collection & PDF receipts', category: 'Fees' },
  { id: 'finance-dashboard', label: 'Financial Overview', desc: 'Collections, inflow pillars & overview cards', category: 'Analytics' },
  { id: 'scholarships', label: 'Scholarships & Waivers', desc: 'Merit concessions, quota waivers & grants', category: 'Concessions' },
  { id: 'general-ledger', label: 'General & Journal Ledger', desc: 'Double-entry vouchers & account books', category: 'Accounting' },
  { id: 'financial-reports', label: 'Financial Reports', desc: 'Financial summaries, balance sheets & audit books', category: 'Accounting' },
];

const AVAILABLE_ROLES = [
  { id: 'Finance Admin', label: 'Finance Admin', description: 'Full financial authority, user management & access control', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'Finance User', label: 'Finance User', description: 'Desk fee collections, receipt generation & accounts inquiry', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'Accountant', label: 'Accountant', description: 'Fee payments, collections, ledger entries & transactions', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'Fee Manager', label: 'Fee Manager', description: 'Course fees, quota waivers, concessions & student dues', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'HR Admin', label: 'HR / Staff', description: 'Staff directory, attendance approvals & payroll records', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'Viewer', label: 'Viewer', description: 'Read-only access to authorized finance reports & statements', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'Super Admin', label: 'Super Admin', description: 'Root institutional system administrator', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
];

const DEPARTMENTS = [
  'Finance & Accounts',
  'Tuition & Fee Collection',
  'General Accounting & Audit',
  'Financial Aid & Scholarships',
  'Human Resources & Payroll',
  'Administration & Operations',
  'Academic Affairs'
];

export function UserManagementView() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total_records: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [detailsUser, setDetailsUser] = useState(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    username: '',
    name: '',
    email: '',
    staff_id: '',
    department: 'Finance & Accounts',
    role: 'Finance User',
    password: '',
    is_active: true,
    has_custom_permissions: false,
    custom_modules: ['fee-structures', 'invoices-receipts'],
  });
  const [createError, setCreateError] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    department: '',
    staff_id: '',
    role: '',
    is_active: true
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  // Role change state
  const [selectedNewRole, setSelectedNewRole] = useState('');
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [submittingRoleChange, setSubmittingRoleChange] = useState(false);

  const toggleModuleSelection = (modId) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const applyPresetModules = (preset) => {
    if (preset === 'desk') {
      setSelectedModules(['fee-structures', 'invoices-receipts']);
      setHasCustomPermissions(true);
    } else if (preset === 'desk_overview') {
      setSelectedModules(['finance-dashboard', 'fee-structures', 'invoices-receipts']);
      setHasCustomPermissions(true);
    } else if (preset === 'all') {
      setSelectedModules(FINANCE_MODULES.map((m) => m.id));
      setHasCustomPermissions(true);
    } else if (preset === 'clear') {
      setSelectedModules([]);
    }
  };

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const loadUsers = async (page = pagination.page) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pagination.page_size,
        search,
        role: selectedRole,
        status: selectedStatus,
      };
      const data = await api.getAdminUsers(params);
      if (data.success) {
        setUsers(data.users || []);
        setStats(data.stats || null);
        setPagination(data.pagination || { page: 1, page_size: 10, total_records: 0, total_pages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load user registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [search, selectedRole, selectedStatus]);

  // Handle Create User Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSubmittingCreate(true);
    try {
      const res = await api.createAdminUser(createForm);
      notify(res.message || 'User successfully created!');
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        name: '',
        email: '',
        staff_id: '',
        department: 'Finance & Accounts',
        role: 'Finance User',
        password: '',
        is_active: true,
        has_custom_permissions: false,
        custom_modules: ['fee-structures', 'invoices-receipts'],
      });
      loadUsers(1);
    } catch (err) {
      setCreateError(err.message || 'Error creating user');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);
    try {
      const res = await api.updateAdminUser(editingUser.id, editForm);
      notify(res.message || 'User details updated.');
      setEditingUser(null);
      loadUsers(pagination.page);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Role Assignment Submit
  const handleRoleChangeSubmit = async (e) => {
    e.preventDefault();
    if (!roleChangeUser || !selectedNewRole) return;
    setSubmittingRoleChange(true);
    try {
      const payload = {
        role: selectedNewRole,
        has_custom_permissions: hasCustomPermissions,
        custom_modules: hasCustomPermissions ? selectedModules : [],
      };
      const res = await api.updateAdminUser(roleChangeUser.id, payload);
      notify(`Role & permissions for ${roleChangeUser.username} updated.`);
      setRoleChangeUser(null);
      loadUsers(pagination.page);
    } catch (err) {
      alert(`Role assignment failed: ${err.message}`);
    } finally {
      setSubmittingRoleChange(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionWord} the account for '${user.username}'?`)) {
      return;
    }
    try {
      await api.updateAdminUser(user.id, { is_active: newStatus });
      notify(`Account '${user.username}' ${newStatus ? 'activated' : 'deactivated'}.`);
      loadUsers(pagination.page);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Handle Password Reset Submit
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!passwordResetUser || !newPassword) return;
    setSubmittingReset(true);
    try {
      const res = await api.resetAdminUserPassword(passwordResetUser.id, newPassword);
      notify(res.message || 'Password successfully reset.');
      setPasswordResetUser(null);
      setNewPassword('');
    } catch (err) {
      alert(`Password reset failed: ${err.message}`);
    } finally {
      setSubmittingReset(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      department: u.department || 'Finance & Accounts',
      staff_id: u.staff_id || '',
      role: u.role || 'Accountant',
      is_active: u.is_active
    });
  };

  // Open Role Assignment Modal
  const openRoleChangeModal = (u) => {
    setRoleChangeUser(u);
    setSelectedNewRole(u.role || 'Finance User');
    setHasCustomPermissions(Boolean(u.has_custom_permissions));
    setSelectedModules(
      Array.isArray(u.custom_modules) && u.custom_modules.length > 0
        ? [...u.custom_modules]
        : (u.role === 'Finance User' ? ['fee-structures', 'invoices-receipts'] : ['fee-structures', 'invoices-receipts', 'finance-dashboard'])
    );
  };

  const getRoleBadge = (roleName) => {
    const roleObj = AVAILABLE_ROLES.find(r => r.id === roleName);
    const cls = roleObj ? roleObj.badgeClass : 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
        <ShieldCheck className="w-3 h-3 shrink-0" />
        <span>{roleName}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Finance User & Role Management</span>
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
              Access Control
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance Admin control center to create users, assign institutional roles, and enforce security permissions
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => loadUsers(pagination.page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Refresh User Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => { setCreateError(''); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered Users</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_users || users.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Central authentication directory</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.active_users || 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Authorized for login</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inactive / Suspended</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.inactive_users || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Access blocked server-side</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Finance Roles Breakdown</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
              {stats?.role_counts?.['Finance Admin'] || 0} Admin
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
              {stats?.role_counts?.['Accountant'] || 0} Accountant
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
              {stats?.role_counts?.['Fee Manager'] || 0} Fee Mgr
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
              {stats?.role_counts?.['Viewer'] || 0} Viewer
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, username, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            {AVAILABLE_ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {(search || selectedRole !== 'ALL' || selectedStatus !== 'all') && (
            <button
              onClick={() => { setSearch(''); setSelectedRole('ALL'); setSelectedStatus('all'); }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 rounded-xl font-semibold cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900">
            Institutional Users Registry ({pagination.total_records || users.length})
          </span>
          <span className="text-xs text-slate-400">
            Showing Page {pagination.page} of {pagination.total_pages || 1}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">ID</th>
                <th className="py-3 px-4">User & Identity</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No users found matching the search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        #{u.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              <span>@{u.username}</span>
                              <span>·</span>
                              <span className="text-slate-400">{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getRoleBadge(u.role)}
                            {u.has_custom_permissions ? (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Custom ({u.custom_modules?.length || 0})
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => openRoleChangeModal(u)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer"
                          >
                            Assign Role & Access &rarr;
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{u.department}</div>
                        {u.staff_id && (
                          <div className="text-[10px] text-slate-400 font-mono">ID: {u.staff_id}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          title={isCurrent ? "You cannot deactivate your own account" : `Click to ${u.is_active ? 'deactivate' : 'activate'}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {u.last_login || <span className="text-slate-300">Never</span>}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                            title="Edit User Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => { setPasswordResetUser(u); setNewPassword(''); }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {users.length} of {pagination.total_records} accounts
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadUsers(pagination.page - 1)}
                disabled={!pagination.has_previous}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-slate-800">
                {pagination.page} / {pagination.total_pages}
              </span>
              <button
                type="button"
                onClick={() => loadUsers(pagination.page + 1)}
                disabled={!pagination.has_next}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Finance User</h3>
                  <p className="text-[11px] text-slate-500">Assign role and configure system permissions</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Babu"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh_b"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@apex.edu"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Employee / Staff ID</label>
                  <input
                    type="text"
                    placeholder="e.g. FIN004"
                    value={createForm.staff_id}
                    onChange={(e) => setCreateForm({ ...createForm, staff_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold focus:outline-none cursor-pointer"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Initial Password *</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    required
                    placeholder="At least 4 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: 'password123' })}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Use Default
                  </button>
                </div>
              </div>

              {/* Custom Modular Permissions for New User */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={createForm.has_custom_permissions}
                    onChange={(e) => setCreateForm({ ...createForm, has_custom_permissions: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Assign explicit custom module permissions now</span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">Optional</span>
                </label>

                {createForm.has_custom_permissions && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Select Modules to Grant:</span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, custom_modules: ['fee-structures', 'invoices-receipts'] })}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          ⚡ Fees & Invoices
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, custom_modules: FINANCE_MODULES.map(m => m.id) })}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {FINANCE_MODULES.map((mod) => {
                        const isChecked = createForm.custom_modules.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            className={`p-2 rounded-lg border text-left cursor-pointer flex items-center gap-2 text-xs transition ${
                              isChecked ? 'bg-white border-blue-500 font-bold text-slate-900 shadow-2xs' : 'bg-slate-100/60 border-slate-200 text-slate-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newMods = e.target.checked
                                  ? [...createForm.custom_modules, mod.id]
                                  : createForm.custom_modules.filter(m => m !== mod.id);
                                setCreateForm({ ...createForm, custom_modules: newMods });
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{mod.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Activate account immediately</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {submittingCreate ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ROLE & MODULE ACCESS MODAL */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign Role & Module Access</h3>
                  <p className="text-[11px] text-slate-500">Configure role and modular access for @{roleChangeUser.username}</p>
                </div>
              </div>
              <button onClick={() => setRoleChangeUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleChangeSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* User banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">User Account</span>
                  <span className="font-bold text-slate-900">{roleChangeUser.name} (@{roleChangeUser.username})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Role</span>
                  <span className="font-bold text-blue-700">{roleChangeUser.role}</span>
                </div>
              </div>

              {/* Step 1: Base Role Selection */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>1. Assigned Institutional Role</span>
                  <span className="text-[10px] font-normal text-slate-400">Select base role</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.filter(r => r.id !== 'Super Admin').map((r) => {
                    const isSelected = selectedNewRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedNewRole(r.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 ring-1 ring-blue-500 shadow-2xs'
                            : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="font-bold text-xs text-slate-900 truncate">{r.label}</div>
                          <div className="text-[10px] text-slate-500 truncate">{r.id}</div>
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Permission Assignment Policy */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 block mb-2">
                  <span>2. Modular Access Policy</span>
                </label>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setHasCustomPermissions(false)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      !hasCustomPermissions
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">Standard Role Policy</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Inherits access from Role & Permissions matrix</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasCustomPermissions(true);
                      if (selectedModules.length === 0) {
                        setSelectedModules(['fee-structures', 'invoices-receipts']);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      hasCustomPermissions
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span>Custom Module Assignment</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">Explicit</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Explicitly assign fee structures, invoices, etc.</p>
                  </button>
                </div>

                {/* If Custom Module Assignment is selected */}
                {hasCustomPermissions && (
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        Assigned Modules ({selectedModules.length} selected):
                      </span>
                      {/* Presets */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => applyPresetModules('desk')}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-blue-700 font-bold hover:bg-blue-50 cursor-pointer"
                        >
                          ⚡ Fees & Invoices
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetModules('desk_overview')}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-cyan-700 font-bold hover:bg-cyan-50 cursor-pointer"
                        >
                          ⚡ Front-Desk Suite
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetModules('all')}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetModules('clear')}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {FINANCE_MODULES.map((mod) => {
                        const isChecked = selectedModules.includes(mod.id);
                        return (
                          <div
                            key={mod.id}
                            onClick={() => toggleModuleSelection(mod.id)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-white border-blue-500 shadow-2xs text-slate-900'
                                : 'bg-slate-100/50 border-slate-200 text-slate-500 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold leading-tight">
                                {mod.label}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {mod.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleChangeUser(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRoleChange}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {submittingRoleChange ? 'Saving...' : 'Save Role & Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit User Details</h3>
                  <p className="text-[11px] text-slate-500">@{editingUser.username}</p>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={editForm.staff_id}
                    onChange={(e) => setEditForm({ ...editForm, staff_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold focus:outline-none cursor-pointer"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    disabled={currentUser?.id === editingUser.id}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active Account</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {submittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
                  <p className="text-[11px] text-slate-500">@{passwordResetUser.username}</p>
                </div>
              </div>
              <button onClick={() => setPasswordResetUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enter New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset || !newPassword}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {submittingReset ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
