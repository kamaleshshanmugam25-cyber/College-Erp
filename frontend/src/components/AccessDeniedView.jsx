import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AccessDeniedView({ requiredRole, onGoHome }) {
  const { user } = useAuth();
  const currentRole = user?.role || user?.roles?.[0] || 'User';

  return (
    <div className="min-h-[520px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider border border-rose-200">
            <Lock className="w-3 h-3" />
            <span>Access Denied (403)</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Restricted Module Access
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Your current institutional role does not have authorization to view or manage this module.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-semibold">Current Account:</span>
            <span className="font-mono text-slate-900 font-bold">{user?.username || 'Guest'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-semibold">Assigned Role:</span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800 text-[11px]">
              {currentRole}
            </span>
          </div>
          {requiredRole && (
            <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
              <span className="font-semibold text-rose-700">Required Role:</span>
              <span className="font-bold text-rose-700">{requiredRole}</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Authorized Dashboard</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Contact your Finance Administrator to request elevated access.</span>
        </p>
      </div>
    </div>
  );
}
