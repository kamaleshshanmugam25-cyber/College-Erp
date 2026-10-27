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
  { id: 'Finance Admin', label: 'Finance Admin', description: 'Institutional financial authority & access control', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'Accountant', label: 'Accountant', description: 'Fee payments, collections, ledger entries & transactions', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'Finance User', label: 'Finance User', description: 'Desk fee structures, student dues & accounts inquiry', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
];

// Roles strictly assignable & creatable by Finance Admin (Finance User and Accountant only)
const ASSIGNABLE_ROLES = [
  { id: 'Finance User', label: 'Finance User', description: 'Desk fee structures, student dues & calculator inquiry', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200', tag: 'Front-Desk' },
  { id: 'Accountant', label: 'Accountant', description: 'Fee payments, transactions, vouchers & ledger accounting', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', tag: 'Accounting' },
];

const FILTER_ROLES = [
  { id: 'ALL', label: 'All Finance Roles' },
  { id: 'Finance User', label: 'Finance User' },
  { id: 'Accountant', label: 'Accountant' },
  { id: 'Finance Admin', label: 'Finance Admin' },
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
    has_custom_permissions: true,
    custom_modules: ['finance-dashboard', 'fee-structures'],
  });
  const [createError, setCreateError] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    department: 'Finance & Accounts',
    staff_id: '',
    role: '',
    is_active: true
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  // Role change state
  const [selectedNewRole, setSelectedNewRole] = useState('Finance User');
  const [selectedModules, setSelectedModules] = useState([]);
  const [submittingRoleChange, setSubmittingRoleChange] = useState(false);

  const toggleModuleSelection = (modId) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const applyPresetModules = (preset, role = selectedNewRole) => {
    if (preset === 'default') {
      if (role === 'Accountant') {
        setSelectedModules(['finance-dashboard', 'fee-structures', 'invoices-receipts', 'scholarships', 'general-ledger', 'financial-reports']);
      } else {
        setSelectedModules(['finance-dashboard', 'fee-structures']);
      }
    } else if (preset === 'all') {
      setSelectedModules(FINANCE_MODULES.map((m) => m.id));
    } else if (preset === 'clear') {
      setSelectedModules([]);
    }
  };

  const handleSelectRoleInModal = (roleId) => {
    setSelectedNewRole(roleId);
    applyPresetModules('default', roleId);
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
        // Enforce finance-team scoping in frontend as well
        const financeOnly = (data.users || []).filter(u =>
          ['Finance User', 'Accountant', 'Finance Admin'].includes(u.role)
        );
        setUsers(financeOnly);
        setStats(data.stats || null);
        setPagination(data.pagination || { page: 1, page_size: 10, total_records: financeOnly.length, total_pages: 1 });
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
      notify(res.message || 'Finance user successfully created!');
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
        has_custom_permissions: true,
        custom_modules: ['finance-dashboard', 'fee-structures'],
      });
      loadUsers(1);
    } catch (err) {
      setCreateError(err.message || 'Failed to create finance user account.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (user) => {
    if (currentUser?.id === user.id) {
      alert("Self-Lockout Safeguard: You cannot deactivate your own administrative account.");
      return;
    }
    const newStatus = !user.is_active;
    const confirmMsg = newStatus
      ? `Are you sure you want to activate @${user.username}?`
      : `Are you sure you want to suspend @${user.username}? They will be blocked from logging into the finance portal.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateAdminUser(user.id, { is_active: newStatus });
      notify(`User @${user.username} is now ${newStatus ? 'Active' : 'Inactive'}.`);
      loadUsers(pagination.page);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Handle Role & Module Access Save
  const handleRoleChangeSubmit = async (e) => {
    e.preventDefault();
    if (!roleChangeUser) return;
    setSubmittingRoleChange(true);
    try {
      await api.updateAdminUser(roleChangeUser.id, {
        role: selectedNewRole,
        has_custom_permissions: true,
        custom_modules: selectedModules,
      });
      notify(`Role for @${roleChangeUser.username} updated to ${selectedNewRole} with ${selectedModules.length} modular access permission(s).`);
      setRoleChangeUser(null);
      loadUsers(pagination.page);
    } catch (err) {
      alert(`Role assignment failed: ${err.message}`);
    } finally {
      setSubmittingRoleChange(false);
    }
  };

  // Handle Edit User Profile
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);
    try {
      await api.updateAdminUser(editingUser.id, {
        name: editForm.name,
        email: editForm.email,
        staff_id: editForm.staff_id,
        role: editForm.role,
        is_active: editForm.is_active,
      });
      notify(`User account for @${editingUser.username} successfully updated.`);
      setEditingUser(null);
      loadUsers(pagination.page);
    } catch (err) {
      alert(`Profile update failed: ${err.message}`);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Password Reset
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!passwordResetUser || !newPassword) return;
    setSubmittingReset(true);
    try {
      await api.resetUserPassword(passwordResetUser.id, newPassword);
      notify(`Password for @${passwordResetUser.username} successfully updated.`);
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
    if (u.role === 'Super Admin') {
      alert("Finance Admin cannot edit Super Admin accounts.");
      return;
    }
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      department: 'Finance & Accounts',
      staff_id: u.staff_id || '',
      role: u.role || 'Finance User',
      is_active: u.is_active
    });
  };

  // Open Role Assignment Modal
  const openRoleChangeModal = (u) => {
    if (u.role === 'Finance Admin' || u.role === 'Super Admin') {
      alert("Finance Admin can only assign roles to Finance User and Accountant accounts.");
      return;
    }
    setRoleChangeUser(u);
    const initialRole = (u.role === 'Accountant') ? 'Accountant' : 'Finance User';
    setSelectedNewRole(initialRole);
    if (Array.isArray(u.custom_modules) && u.custom_modules.length > 0) {
      setSelectedModules([...u.custom_modules]);
    } else {
      applyPresetModules('default', initialRole);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Finance User & Access Management
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Finance Authority
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Finance Admin control center to create institutional finance users, assign operational roles, and declare modular access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadUsers(pagination.page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Finance User</span>
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

      {/* KPI Stats Cards - Scoped to Finance Team */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Finance Team Accounts</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_users || users.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Finance Users, Accountants & Admin</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.active_users || 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Authorized for finance portal</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inactive / Suspended</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.inactive_users || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Access blocked server-side</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Finance Roles Breakdown</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-200">
              {stats?.role_counts?.['Finance User'] || 0} Finance User
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
              {stats?.role_counts?.['Accountant'] || 0} Accountant
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
              {stats?.role_counts?.['Finance Admin'] || 0} Admin
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
            placeholder="Search finance users by name, username, email, staff ID..."
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
            {FILTER_ROLES.map((r) => (
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-slate-900">
              Finance Team Registry ({pagination.total_records || users.length})
            </span>
          </div>
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
                <th className="py-3 px-4">Direct Modular Access</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No finance users found matching the search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isFinanceAdminUser = u.role === 'Finance Admin';
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
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                              <span>@{u.username}</span>
                              <span>·</span>
                              <span className="text-slate-400">{u.email}</span>
                              {u.staff_id && (
                                <>
                                  <span>·</span>
                                  <span className="text-slate-600 font-semibold">ID: {u.staff_id}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getRoleBadge(u.role)}
                          </div>
                          {!isFinanceAdminUser ? (
                            <button
                              type="button"
                              onClick={() => openRoleChangeModal(u)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>Assign Role & Access</span>
                              <span>&rarr;</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic mt-0.5">Primary Administrator</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isFinanceAdminUser ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            <Shield className="w-3 h-3" />
                            <span>All Modules (Full Authority)</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              {(u.custom_modules && u.custom_modules.length > 0)
                                ? `${u.custom_modules.length} of 6 Modules Ticked`
                                : (u.role === 'Accountant' ? '6 of 6 Modules (Role Default)' : '2 of 6 Modules (Role Default)')}
                            </span>
                            <button
                              type="button"
                              onClick={() => openRoleChangeModal(u)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              Configure &rarr;
                            </button>
                          </div>
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
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            title="Edit User Info"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPasswordResetUser(u)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
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

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Total <span className="font-bold text-slate-800">{pagination.total_records}</span> registered finance users
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadUsers(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700">
                {pagination.page} / {pagination.total_pages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => loadUsers(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE NEW FINANCE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Finance User</h3>
                  <p className="text-[11px] text-slate-500">Register a Finance User or Accountant with direct modular access</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

              {/* Step 1: Assigned Role */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>1. Assigned Role</span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Finance Admin Authority
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ASSIGNABLE_ROLES.map((r) => {
                    const isSelected = createForm.role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          const defaultMods = (r.id === 'Accountant')
                            ? ['finance-dashboard', 'fee-structures', 'invoices-receipts', 'scholarships', 'general-ledger', 'financial-reports']
                            : ['finance-dashboard', 'fee-structures'];
                          setCreateForm({ ...createForm, role: r.id, custom_modules: defaultMods });
                        }}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition flex items-start justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{r.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              r.id === 'Finance User' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {r.tag}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 leading-normal">{r.description}</div>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password */}
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

              {/* Tick Process for New User */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Tick Process: Modular Access Declaration</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {createForm.custom_modules.length} of {FINANCE_MODULES.length} Ticked
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tick checkboxes to grant immediate sidebar access.</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const defaultMods = (createForm.role === 'Accountant')
                          ? ['finance-dashboard', 'fee-structures', 'invoices-receipts', 'scholarships', 'general-ledger', 'financial-reports']
                          : ['finance-dashboard', 'fee-structures'];
                        setCreateForm({ ...createForm, custom_modules: defaultMods });
                      }}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 cursor-pointer"
                    >
                      ⚡ Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, custom_modules: FINANCE_MODULES.map(m => m.id) })}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, custom_modules: [] })}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 hover:text-red-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FINANCE_MODULES.map((mod) => {
                    const isChecked = createForm.custom_modules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => {
                          const newMods = isChecked
                            ? createForm.custom_modules.filter(m => m !== mod.id)
                            : [...createForm.custom_modules, mod.id];
                          setCreateForm({ ...createForm, custom_modules: newMods });
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-start gap-2.5 transition select-none ${
                          isChecked ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/40 shadow-2xs' : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          {isChecked ? (
                            <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 leading-snug">{mod.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                              isChecked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {isChecked ? '✓ Granted' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                    className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    {submittingCreate ? 'Creating...' : 'Create Finance User'}
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
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign Role & Module Access</h3>
                  <p className="text-[11px] text-slate-500">Configure operational role and modular permissions for @{roleChangeUser.username}</p>
                </div>
              </div>
              <button onClick={() => setRoleChangeUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleChangeSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* User banner */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {roleChangeUser.name ? roleChangeUser.name.charAt(0).toUpperCase() : roleChangeUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">{roleChangeUser.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">@{roleChangeUser.username} {roleChangeUser.staff_id ? `· ID: ${roleChangeUser.staff_id}` : ''}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Role</span>
                  <span className="font-bold text-blue-700">{roleChangeUser.role}</span>
                </div>
              </div>

              {/* Step 1: Base Role Selection (Finance User vs Accountant only) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>1. Assigned Role</span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Finance Admin Authority
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ASSIGNABLE_ROLES.map((r) => {
                    const isSelected = selectedNewRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRoleInModal(r.id)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-start justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{r.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              r.id === 'Finance User' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {r.tag}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 leading-normal">{r.description}</div>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Tick Process: Modular Access Assignment */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Tick Process: Modular Access Assignment</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {selectedModules.length} of {FINANCE_MODULES.length} Ticked
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tick the boxes to declare access. If unticked, the module will NOT appear in the user's sidebar.
                    </p>
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1 text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => applyPresetModules('default')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 cursor-pointer transition shadow-2xs"
                    >
                      ⚡ Role Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetModules('all')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetModules('clear')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* The Module Checklist with visual tick boxes - NO TRUNCATION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FINANCE_MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModuleSelection(mod.id)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500 shadow-2xs text-slate-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          {isChecked ? (
                            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 leading-snug">{mod.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                              isChecked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {isChecked ? '✓ Granted' : 'Hidden'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 leading-normal">
                            {mod.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit User Details</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email *</label>
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={editForm.staff_id}
                    onChange={(e) => setEditForm({ ...editForm, staff_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={editForm.role}
                    disabled={editForm.role === 'Finance Admin'}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-bold focus:outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {editForm.role === 'Finance Admin' && (
                      <option value="Finance Admin">Finance Admin</option>
                    )}
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
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
                  <span>Active user account</span>
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

      {/* PASSWORD RESET MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
              </div>
              <button onClick={() => setPasswordResetUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Enter a new password for <strong className="text-slate-900">@{passwordResetUser.username}</strong> ({passwordResetUser.name}).
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {submittingReset ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
