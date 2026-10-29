import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Plus,
  Search,
  Building2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export function HolidaysView() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [declaredHolidayNotification, setDeclaredHolidayNotification] = useState(null);
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal for adding holiday
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: '',
    holiday_type: 'FESTIVAL',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHolidays();
      const list = Array.isArray(res) ? res : (res.results || []);
      const count = res?.count ?? list.length;
      setHolidays(list);
      window.dispatchEvent(new CustomEvent('holidays_updated', { detail: { count } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      setError('Please fill in holiday name and date.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createHoliday({
        name: form.name.trim(),
        date: form.date,
        holiday_type: form.holiday_type,
        description: form.description.trim(),
      });
      const holidayName = form.name.trim();
      const holidayDate = form.date;
      const holidayType = form.holiday_type;
      const holidayDesc = form.description.trim();

      const typeLabelMap = {
        NATIONAL: 'National Holiday',
        FESTIVAL: 'Public Festival / Holiday',
        ACADEMIC: 'Academic Break / Recess',
        RESTRICTED: 'Restricted Holiday',
      };

      setShowAddModal(false);
      setForm({ name: '', date: '', holiday_type: 'FESTIVAL', description: '' });
      await loadHolidays();

      setDeclaredHolidayNotification({
        name: holidayName,
        date: holidayDate,
        type: typeLabelMap[holidayType] || holidayType,
        description: holidayDesc,
      });

      setSuccessToast(`Holiday "${holidayName}" declared successfully!`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      setError(`Failed to declare holiday: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove declared holiday "${name}"?`)) return;
    try {
      await api.deleteHoliday(id);
      await loadHolidays();
      setSuccessToast(`Holiday "${name}" removed successfully.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      setError(`Failed to remove holiday: ${err.message}`);
    }
  };

  // Metrics
  const totalCount = holidays.length;
  const nationalCount = holidays.filter((h) => h.holiday_type === 'NATIONAL').length;
  const festivalCount = holidays.filter((h) => h.holiday_type === 'FESTIVAL').length;
  const academicCount = holidays.filter((h) => h.holiday_type === 'ACADEMIC').length;

  // Filtered List
  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      !search ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.description && h.description.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'ALL' || h.holiday_type === selectedType;

    return matchesSearch && matchesType;
  });

  const isHrOrAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.is_superuser;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Declared Holiday Calendar (2026)</h1>
          <p className="text-xs text-slate-500">
            Institutional holiday schedule and academic recess calendar
          </p>
        </div>

        {isHrOrAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Declare New Holiday</span>
          </button>
        )}
      </div>

      {/* Official Declared Holiday Notification Banner */}
      {declaredHolidayNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-emerald-950 text-sm">
                  Official Holiday Circular: {declaredHolidayNotification.name}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  New Declaration
                </span>
              </div>
              <p className="text-emerald-800 text-xs">
                Scheduled for <strong className="text-emerald-950">{declaredHolidayNotification.date}</strong> ({declaredHolidayNotification.type}). Academic calendar, student schedule, and staff attendance have been updated.
                {declaredHolidayNotification.description && (
                  <span className="italic ml-1">"{declaredHolidayNotification.description}"</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDeclaredHolidayNotification(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1.5 rounded-lg hover:bg-emerald-100 transition cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Calendar Holidays</div>
          <div className="text-2xl font-bold text-slate-900">{totalCount} Days</div>
          <div className="text-[11px] text-slate-500 font-medium">Declared for academic year 2026</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">National & Public Holidays</div>
          <div className="text-2xl font-bold text-slate-900">{nationalCount + festivalCount} Days</div>
          <div className="text-[11px] text-slate-500 font-medium">Gazetted & regional observances</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Recesses</div>
          <div className="text-2xl font-bold text-slate-900">{academicCount} Days</div>
          <div className="text-[11px] text-slate-500 font-medium">Semester & examination breaks</div>
        </div>
      </div>

      {/* Enterprise Holidays Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Institutional Holidays Directory</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ml-1">
              {filteredHolidays.length} Listed
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search holiday..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white w-40 sm:w-48"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-semibold cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="NATIONAL">National</option>
              <option value="FESTIVAL">Festival</option>
              <option value="ACADEMIC">Academic Break</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>
        </div>

        {/* MOBILE HOLIDAYS CARDS VIEW */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {filteredHolidays.length > 0 ? (
            (showAllHolidays ? filteredHolidays : filteredHolidays.slice(0, 4)).map((h) => {
              const dateObj = new Date(h.date);
              const formattedDate = dateObj.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

              return (
                <div key={h.id} className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{h.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                        {h.holiday_type === 'NATIONAL' ? 'National' :
                         h.holiday_type === 'FESTIVAL' ? 'Festival' :
                         h.holiday_type === 'ACADEMIC' ? 'Academic Break' : 'Restricted'}
                      </span>
                      {isHrOrAdmin && (
                        <button
                          onClick={() => handleDeleteHoliday(h.id, h.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Remove holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">{formattedDate} ({dayName})</span>
                    <span className="font-medium text-slate-600">
                      {h.holiday_type === 'ACADEMIC' ? 'Classes Suspended' : 'University Closed'}
                    </span>
                  </div>
                  {h.description && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {h.description}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No holidays matched current search or filter.
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date & Day</th>
                <th className="py-2.5 px-4">Holiday Name & Circular</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4 text-right">Observance</th>
                {isHrOrAdmin && <th className="py-2.5 px-4 text-center w-16">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredHolidays.length > 0 ? (
                (showAllHolidays ? filteredHolidays : filteredHolidays.slice(0, 4)).map((h) => {
                  const dateObj = new Date(h.date);
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                  return (
                    <tr key={h.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{formattedDate}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{dayName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{h.name}</div>
                        {h.description && (
                          <div className="text-[10px] text-slate-500 font-normal truncate max-w-sm">
                            {h.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-block">
                          {h.holiday_type === 'NATIONAL' ? 'National Holiday' :
                           h.holiday_type === 'FESTIVAL' ? 'Public Festival' :
                           h.holiday_type === 'ACADEMIC' ? 'Academic Recess' : 'Restricted Holiday'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {h.holiday_type === 'ACADEMIC' ? 'Classes Suspended' : 'University Closed'}
                        </span>
                      </td>
                      {isHrOrAdmin && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteHoliday(h.id, h.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title={`Remove holiday ${h.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isHrOrAdmin ? 5 : 4} className="py-8 text-center text-slate-400">
                    No holidays matched current search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredHolidays.length > 4 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAllHolidays(!showAllHolidays)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition shadow-2xs cursor-pointer"
            >
              <span>{showAllHolidays ? 'Show Less' : `View More (${filteredHolidays.length - 4} More Holidays)`}</span>
              {showAllHolidays ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Declare Institutional Holiday</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Founders Day Recess"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category / Type</label>
                <select
                  value={form.holiday_type}
                  onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                >
                  <option value="NATIONAL">National Holiday</option>
                  <option value="FESTIVAL">Festival / Public Holiday</option>
                  <option value="ACADEMIC">Academic Break / Recess</option>
                  <option value="RESTRICTED">Restricted Holiday</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Brief description or official circular notice..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {submitting ? 'Declaring...' : 'Declare Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HolidaysView;
