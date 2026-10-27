import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  CheckSquare,
  Square,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Lock,
  Layers,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';

export function RoleAccessMatrixView() {
  const { user, checkAuth } = useAuth();
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadMatrix = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getAccessMatrix();
      if (data.success) {
        setCategories(data.categories || []);
        setRoles(data.roles || []);
        setMatrix(data.matrix || {});
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load access matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  // Show temporary success notification
  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Toggle single cell
  const handleToggle = async (role, moduleId) => {
    const currentVal = !!matrix[role]?.[moduleId];
    const newVal = !currentVal;

    // Optimistic UI update
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [moduleId]: newVal,
      },
    }));

    try {
      await api.updateAccessMatrix({
        role,
        module_id: moduleId,
        is_granted: newVal,
      });
      notifySuccess(`Updated ${moduleId} for ${role}: ${newVal ? 'Granted' : 'Hidden'}`);
      if (checkAuth) checkAuth();
    } catch (err) {
      // Rollback
      setMatrix((prev) => ({
        ...prev,
        [role]: {
          ...(prev[role] || {}),
          [moduleId]: currentVal,
        },
      }));
      setErrorMsg(err.message || 'Failed to update permission');
    }
  };

  // Grant All for Role
  const handleGrantAllForRole = async (role) => {
    const updatedRoleModules = {};
    categories.forEach((cat) => {
      cat.modules.forEach((mod) => {
        updatedRoleModules[mod.id] = true;
      });
    });

    const newMatrix = {
      ...matrix,
      [role]: updatedRoleModules,
    };
    setMatrix(newMatrix);

    setSaving(true);
    try {
      await api.updateAccessMatrix({
        matrix: {
          [role]: updatedRoleModules,
        },
      });
      notifySuccess(`Granted all modules to ${role}`);
      if (checkAuth) checkAuth();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to grant all');
      loadMatrix();
    } finally {
      setSaving(false);
    }
  };

  // Revoke All for Role
  const handleRevokeAllForRole = async (role) => {
    const updatedRoleModules = {};
    categories.forEach((cat) => {
      cat.modules.forEach((mod) => {
        updatedRoleModules[mod.id] = false;
      });
    });

    const newMatrix = {
      ...matrix,
      [role]: updatedRoleModules,
    };
    setMatrix(newMatrix);

    setSaving(true);
    try {
      await api.updateAccessMatrix({
        matrix: {
          [role]: updatedRoleModules,
        },
      });
      notifySuccess(`Revoked all module access for ${role}`);
      if (checkAuth) checkAuth();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to revoke all');
      loadMatrix();
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all roles to standard institutional default permissions?')) return;
    setSaving(true);
    try {
      await api.updateAccessMatrix({ action: 'reset' });
      await loadMatrix();
      notifySuccess('Reset all permissions to institutional defaults');
      if (checkAuth) checkAuth();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset defaults');
    } finally {
      setSaving(false);
    }
  };

  // Filter modules based on search and category
  const filteredCategories = categories.map((cat) => {
    if (selectedCategory !== 'ALL' && cat.category !== selectedCategory) {
      return null;
    }
    const matchingModules = cat.modules.filter((mod) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return mod.name.toLowerCase().includes(q) || mod.id.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q);
    });
    if (matchingModules.length === 0) return null;
    return {
      ...cat,
      modules: matchingModules,
    };
  }).filter(Boolean);

  // Compute stats
  let totalGranted = 0;
  roles.forEach((r) => {
    Object.values(matrix[r] || {}).forEach((v) => {
      if (v) totalGranted += 1;
    });
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Role & Module Access Matrix
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
              title="Reset all permissions to initial system defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
            <button
              type="button"
              onClick={loadMatrix}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module by name or key..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Section:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                <th className="py-3.5 px-4 font-bold text-slate-900 w-72">
                  System Module & Feature
                </th>

                {/* Super Admin Column (Locked) */}
                <th className="py-3.5 px-3 text-center border-l border-slate-200/80 bg-purple-50/40 w-36">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase border border-purple-200">
                      Super Admin
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Full Access
                    </span>
                  </div>
                </th>

                {/* Target Role Columns */}
                {roles.map((role) => (
                  <th key={role} className="py-3.5 px-3 text-center border-l border-slate-200/80 w-36">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                        role === 'Finance Admin'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : role === 'Accountant'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'

                          : role === 'Finance User'
                          ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                          : role === 'Viewer'
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : role === 'HR Admin'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          : role === 'Employee'
                          ? 'bg-teal-100 text-teal-800 border-teal-200'
                          : 'bg-sky-100 text-sky-800 border-sky-200'
                      }`}>
                        {role === 'Student/Parent' ? 'Student' : role}
                      </span>
                      {/* Column Batch Actions */}
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleGrantAllForRole(role)}
                          className="hover:text-blue-600 underline cursor-pointer"
                          title={`Grant all modules to ${role}`}
                        >
                          All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => handleRevokeAllForRole(role)}
                          className="hover:text-red-600 underline cursor-pointer"
                          title={`Revoke all modules for ${role}`}
                        >
                          None
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body Grouped by Category */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCategories.map((catGroup) => (
                <React.Fragment key={catGroup.category}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-100/70 border-t border-b border-slate-200 font-bold text-slate-700 text-[11px]">
                    <td colSpan={roles.length + 2} className="py-2 px-4 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{catGroup.category}</span>
                    </td>
                  </tr>

                  {/* Modules in this Category */}
                  {catGroup.modules.map((mod) => (
                    <tr key={mod.id} className="hover:bg-slate-50/70 transition">
                      {/* Module Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">{mod.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{mod.id}</div>
                      </td>

                      {/* Super Admin Locked Cell */}
                      <td className="py-3 px-3 text-center border-l border-slate-200/80 bg-purple-50/20">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold" title="Super Admin always has full access">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                      </td>

                      {/* Interactive Role Checkbox Cells */}
                      {roles.map((role) => {
                        const isGranted = !!matrix[role]?.[mod.id];

                        return (
                          <td key={role} className="py-3 px-3 text-center border-l border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => handleToggle(role, mod.id)}
                              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-bold text-[11px] ${
                                isGranted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                              title={`Click to ${isGranted ? 'hide' : 'show'} ${mod.name} for ${role}`}
                            >
                              {isGranted ? (
                                <>
                                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Show</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="text-slate-400 font-normal">Hidden</span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active Module Permissions: <strong className="text-slate-800">{totalGranted}</strong> granted</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Enforced at runtime: unticked modules are removed from the role's sidebar immediately.
          </div>
        </div>
      </div>
    </div>
  );
}
