import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Star,
  CheckCircle2,
  FileCheck,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

export function MyAppraisalsView() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showAllAppraisals, setShowAllAppraisals] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAppraisals();
      const list = Array.isArray(res) ? res : (res?.results || []);
      setAppraisals(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const latestAppraisal = appraisals[0] || null;

  const getRatingBadge = (rating) => {
    switch (rating) {
      case 'OUTSTANDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
            <span>5.0 Outstanding</span>
          </span>
        );
      case 'EXCEEDS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <Star className="w-3 h-3 fill-blue-600 text-blue-600" />
            <span>4.0 Exceeds</span>
          </span>
        );
      case 'MEETS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-purple-600" />
            <span>3.0 Meets</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Under Review</span>
          </span>
        );
    }
  };

  if (loading && appraisals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-xs">
        Loading performance appraisals...
      </div>
    );
  }

  const displayedAppraisals = showAllAppraisals ? appraisals : appraisals.slice(0, 4);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Performance Appraisals</h1>
        <p className="text-xs text-slate-500">Appraisal reviews, ratings, and salary revision history</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Latest Appraisal Summary Strip */}
      {latestAppraisal && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Review Cycle</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{latestAppraisal.review_cycle}</span>
              {getRatingBadge(latestAppraisal.rating)}
            </div>
            <div className="text-xs text-slate-500">
              {latestAppraisal.employee_name || user?.name} · {latestAppraisal.revised_designation || latestAppraisal.previous_designation || 'Staff'} ({latestAppraisal.department || 'Faculty'})
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Salary Revision</div>
              <div className="text-xs font-bold text-slate-900">
                ₹{Number(latestAppraisal.previous_gross || 0).toLocaleString('en-IN')} → <span className="text-emerald-700 font-extrabold">₹{Number(latestAppraisal.revised_gross || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
              +{latestAppraisal.increment_percent}% Hike
            </span>
          </div>
        </div>
      )}

      {/* Appraisal History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            <span>Appraisal History</span>
          </h2>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {appraisals.length} Records
          </span>
        </div>

        {appraisals.length > 0 ? (
          <>
            {/* MOBILE CARDS VIEW */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {displayedAppraisals.map((app) => (
                <div key={app.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{app.review_cycle}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {app.revised_designation || app.previous_designation || 'Staff Member'}
                      </div>
                    </div>
                    <div className="shrink-0">{getRatingBadge(app.rating)}</div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Salary Revision</span>
                      <span className="text-slate-600 font-semibold text-[11px]">
                        ₹{Number(app.previous_gross).toLocaleString('en-IN')} → <strong className="text-slate-900">₹{Number(app.revised_gross).toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      +{app.increment_percent}% Hike
                    </span>
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => setSelectedCert(app)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Increment Letter</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Review Cycle & Rating</th>
                    <th className="py-2.5 px-4">Salary Revision</th>
                    <th className="py-2.5 px-4">Designation</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedAppraisals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{app.review_cycle}</div>
                        <div className="mt-1">{getRatingBadge(app.rating)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-700">+{app.increment_percent}% Hike</div>
                        <div className="text-[11px] text-slate-500">
                          ₹{Number(app.previous_gross).toLocaleString('en-IN')} → <strong className="text-slate-900">₹{Number(app.revised_gross).toLocaleString('en-IN')}</strong>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {app.revised_designation || app.previous_designation || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedCert(app)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Letter</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-400 py-8 text-center">
            No appraisals recorded yet.
          </div>
        )}

        {appraisals.length > 4 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAllAppraisals(!showAllAppraisals)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
            >
              <span>{showAllAppraisals ? 'Show Less' : `View More (${appraisals.length - 4} More)`}</span>
              {showAllAppraisals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Official Certificate / Appraisal Letter Modal */}
      {selectedCert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Appraisal & Increment Letter</span>
              </h3>
              <button
                onClick={() => setSelectedCert(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs text-slate-700">
              <div className="text-center pb-2 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">University HR Administration</h4>
                <div className="text-[10px] text-slate-500">Performance Evaluation Certificate</div>
              </div>

              <div className="space-y-2">
                <p>
                  Certified that <strong>{selectedCert.employee_name || user?.name}</strong> ({selectedCert.staff_id}) has completed review for <strong>{selectedCert.review_cycle}</strong>.
                </p>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span>Performance Rating:</span>
                    <strong className="text-emerald-700">{selectedCert.rating}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Approved Salary Increment:</span>
                    <strong className="text-emerald-600">+{selectedCert.increment_percent}%</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span>Revised Gross Salary:</span>
                    <strong className="text-slate-900">₹{Number(selectedCert.revised_gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / month</strong>
                  </div>
                </div>

                {selectedCert.comments && (
                  <p className="text-slate-600 italic">
                    <strong>Remarks:</strong> {selectedCert.comments}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div>Evaluated By: {selectedCert.appraised_by_name || 'HR Administration'}</div>
                <div>Issued: {new Date(selectedCert.appraised_at).toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Letter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
