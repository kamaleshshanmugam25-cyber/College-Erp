import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RoleAccessMatrixView } from '../components/RoleAccessMatrixView';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Layers,
  Sparkles,
  Info,
  Shield,
  HelpCircle,
  LayoutDashboard
} from 'lucide-react';

const ROLES = [
  { id: 'Finance Admin', label: 'Finance Admin', badge: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Full financial authority, user management, and security administration' },
  { id: 'Finance User', label: 'Finance User', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', desc: 'Desk fee structures and student inquiries' },
  { id: 'Accountant', label: 'Accountant', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'Fee payments, collections, ledger entries, vouchers, and transactions' },
  { id: 'HR Admin', label: 'HR / Staff', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', desc: 'Staff lifecycle records, attendance, leave approvals, and payroll' },
  { id: 'Super Admin', label: 'Super Admin', badge: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Root institutional system administrator (all permissions locked)' },
];

const ACTIONS = [
  { id: 'view', label: 'View', desc: 'Read & access module' },
  { id: 'create', label: 'Create', desc: 'Create new records' },
  { id: 'edit', label: 'Edit', desc: 'Modify existing records' },
  { id: 'delete', label: 'Delete', desc: 'Remove records' },
  { id: 'approve', label: 'Approve', desc: 'Authorize workflows' },
  { id: 'export', label: 'Export', desc: 'Download CSV / reports' },
];

export function RolePermissionView() {
  const [viewMode, setViewMode] = useState('sidebar'); // 'sidebar' | 'granular'
  const [selectedRole, setSelectedRole] = useState('Finance Admin');
  const [modules, setModules] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAdminPermissions();
      if (res.success) {
        setModules(res.modules || []);
        setMatrix(res.matrix || {});
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (modId, action) => {
    if (selectedRole === 'Super Admin') {
      alert('Super Admin permissions are permanently locked to full access.');
      return;
    }

    // Critical safeguard: Prevent removing admin access to user management
    if (selectedRole === 'Finance Admin' && (modId === 'user-management' || modId === 'role-permissions') && action === 'view') {
      alert('Self-Lockout Protection: You cannot revoke viewing permissions for administrative tools on Finance Admin.');
      return;
    }

    const currentVal = !!matrix[selectedRole]?.[modId]?.[action];
    const newVal = !currentVal;

    // Optimistic UI update
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || {}),
        [modId]: {
          ...(prev[selectedRole]?.[modId] || {}),
          [action]: newVal,
        }
      }
    }));

    try {
      const currentModPerms = {
        ...(matrix[selectedRole]?.[modId] || {}),
        [action]: newVal,
      };
      await api.updateAdminPermission({
        role: selectedRole,
        module_id: modId,
        permissions: currentModPerms,
      });
      notify(`Updated ${action.toUpperCase()} for ${modId} on ${selectedRole}.`);
    } catch (err) {
      // Revert on error
      setMatrix((prev) => ({
        ...prev,
        [selectedRole]: {
          ...(prev[selectedRole] || {}),
          [modId]: {
            ...(prev[selectedRole]?.[modId] || {}),
            [action]: currentVal,
          }
        }
      }));
      setErrorMsg(err.message || 'Failed to save permission change.');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all roles to institutional default least-privilege permissions?')) return;
    setSaving(true);
    try {
      await api.resetAdminPermissions();
      notify('Permissions reset to system defaults.');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Reset failed.');
    } finally {
      setSaving(false);
    }
  };

  const activeRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  const filteredModules = modules.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setViewMode('sidebar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            viewMode === 'sidebar'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Sidebar Module Assignment (Accountant, Finance User, etc.)</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('granular')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            viewMode === 'granular'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Granular Action Matrix (CRUD)</span>
        </button>
      </div>

      {viewMode === 'sidebar' ? (
        <RoleAccessMatrixView />
      ) : (
        <>
          {/* Executive Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Granular Role & Permission Matrix</span>
                <span className="text-[11px] font-semibold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Least Privilege
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure action-level permissions (View, Create, Edit, Delete, Approve, Export) for each institutional role
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
                title="Reset to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Role Selection Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs flex flex-wrap gap-1.5">
        {ROLES.map((r) => {
          const isActive = selectedRole === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRole(r.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Role Card & Scope Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-white p-5 rounded-2xl border border-blue-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Active Role: {activeRoleObj.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${activeRoleObj.badge}`}>
              {activeRoleObj.id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {activeRoleObj.desc}
          </p>
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search module or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-72">Module & Feature</th>
                {ACTIONS.map((act) => (
                  <th key={act.id} className="py-3.5 px-3 text-center border-l border-slate-200/80 w-24">
                    <div className="font-bold text-slate-800">{act.label}</div>
                    <div className="text-[9px] text-slate-400 font-normal normal-case">{act.desc}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModules.map((mod) => {
                const modPerms = matrix[selectedRole]?.[mod.id] || {};
                const isSuperAdmin = selectedRole === 'Super Admin';

                return (
                  <tr key={mod.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{mod.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{mod.id} · {mod.category}</div>
                    </td>

                    {ACTIONS.map((act) => {
                      const isGranted = isSuperAdmin ? true : !!modPerms[act.id];
                      const isLockedAdminTool = (selectedRole === 'Finance Admin' && (mod.id === 'user-management' || mod.id === 'role-permissions') && act.id === 'view');

                      return (
                        <td key={act.id} className="py-3.5 px-3 text-center border-l border-slate-200/80">
                          {isSuperAdmin ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-700 font-bold" title="Super Admin full access">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggle(mod.id, act.id)}
                              disabled={isLockedAdminTool}
                              title={isLockedAdminTool ? "Administrative safeguard: Cannot revoke viewing on admin role" : `Click to ${isGranted ? 'revoke' : 'grant'} ${act.label}`}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                isGranted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-300 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {isGranted ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Changes save automatically and take effect across user sessions immediately.</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Protected by Server-Side Action Validation
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
