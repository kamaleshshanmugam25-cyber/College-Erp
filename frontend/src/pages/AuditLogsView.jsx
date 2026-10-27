import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText
} from 'lucide-react';

const ACTION_COLORS = {
  USER_LOGIN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  USER_LOGOUT: 'bg-slate-100 text-slate-700 border-slate-200',
  LOGIN_FAILED: 'bg-rose-50 text-rose-800 border-rose-200',
  USER_CREATED: 'bg-blue-50 text-blue-800 border-blue-200',
  USER_UPDATED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  USER_ACTIVATED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  USER_DEACTIVATED: 'bg-amber-50 text-amber-800 border-amber-200',
  ROLE_CHANGED: 'bg-purple-50 text-purple-800 border-purple-200',
  ROLE_ASSIGNED: 'bg-purple-50 text-purple-800 border-purple-200',
  PASSWORD_RESET: 'bg-amber-50 text-amber-800 border-amber-200',
  PERMISSION_CHANGED: 'bg-violet-50 text-violet-800 border-violet-200',
  FEE_ALLOCATED: 'bg-teal-50 text-teal-800 border-teal-200',
  INVOICE_GENERATED: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  PAYMENT_RECORDED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  VOUCHER_POSTED: 'bg-blue-50 text-blue-800 border-blue-200',
  ACCESS_DENIED: 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold',
};

export function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total_records: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);

  const loadLogs = async (page = pagination.page) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pagination.page_size,
        search,
        action: actionFilter,
        role: roleFilter,
        start_date: startDate,
        end_date: endDate,
      };
      const data = await api.getAdminAuditLogs(params);
      if (data.success) {
        setLogs(data.logs || []);
        setStats(data.stats || null);
        setPagination(data.pagination || { page: 1, page_size: 20, total_records: 0, total_pages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [search, actionFilter, roleFilter, startDate, endDate]);

  const toggleExpand = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Audit Trail & Security Logs</span>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200">
              Immutable Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace user logins, account alterations, role assignments, and financial operations across the institution
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadLogs(pagination.page)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs self-start lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Events</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_logs || logs.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Central security journal</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logins Recorded Today</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.today_logins || 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Authenticated sessions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions Today</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{stats?.today_actions || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Modifications & views</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Alerts (403s)</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.security_alerts || 0}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">Denied / Failed attempts</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor username, action, resource, or IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_LOGOUT">USER_LOGOUT</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
            <option value="ROLE_CHANGED">ROLE_CHANGED</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="PERMISSION_CHANGED">PERMISSION_CHANGED</option>
            <option value="FEE_ALLOCATED">FEE_ALLOCATED</option>
            <option value="ACCESS_DENIED">ACCESS_DENIED (403)</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Finance Admin">Finance Admin</option>
            <option value="Accountant">Accountant</option>
            <option value="Finance User">Finance User</option>
            <option value="HR Admin">HR Admin</option>
          </select>

          {(search || actionFilter !== 'ALL' || roleFilter !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => { setSearch(''); setActionFilter('ALL'); setRoleFilter('ALL'); setStartDate(''); setEndDate(''); }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 rounded-xl font-semibold cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900">
            Audit Activity Log ({pagination.total_records || logs.length})
          </span>
          <span className="text-xs text-slate-400">
            Page {pagination.page} of {pagination.total_pages || 1}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-40">Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Affected Resource</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const isExpanded = expandedRowId === l.id;
                  const actionClass = ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-800 border-slate-200';

                  return (
                    <React.Fragment key={l.id}>
                      <tr className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {l.timestamp}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">@{l.actor.username}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                              {l.actor.role}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${actionClass}`}>
                            <span>{l.action}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800">{l.resource}</span>
                          {l.resource_id && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">#{l.resource_id}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {l.ip_address}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpand(l.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer rounded-lg hover:bg-blue-50"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Metadata Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={6} className="p-4 space-y-2">
                            <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                              <span>Metadata & Payload Inspection:</span>
                              <span className="font-mono text-slate-400">User Agent: {l.user_agent || 'Unknown Client'}</span>
                            </div>
                            <pre className="p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto shadow-inner">
                              {JSON.stringify(l.details || {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {logs.length} of {pagination.total_records} audit entries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadLogs(pagination.page - 1)}
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
                onClick={() => loadLogs(pagination.page + 1)}
                disabled={!pagination.has_next}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
