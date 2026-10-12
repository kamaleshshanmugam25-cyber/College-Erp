import React from 'react';
import { 
  Server, 
  Database, 
  ShieldCheck, 
  Code2, 
  Cpu, 
  Layers, 
  FileCode2, 
  CheckCircle2 
} from 'lucide-react';

export function SystemInfo() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Server className="w-4 h-4" />
          <span>Platform Architecture</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Decoupled Fullstack Infrastructure</h1>
        <p className="text-xs text-slate-500">
          Clean separation of Django REST API service and React single-page frontend
        </p>
      </div>

      {/* Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Backend Service (`/backend`)</h2>
              <p className="text-xs text-slate-500">Django 5.2 · DRF · Celery · WeasyPrint</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Double-Entry General Ledger:</span>
                <span className="text-slate-500 ml-1">Immutable journal vouchers with strict balance verification.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">HMAC Signature Gateways:</span>
                <span className="text-slate-500 ml-1">Webhook processing for Razorpay and Cashfree with duplicate protection.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">CORS & Cookie Auth:</span>
                <span className="text-slate-500 ml-1">Configured with `django-cors-headers` allowing seamless React proxying.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Automated Test Suite:</span>
                <span className="text-slate-500 ml-1">15 unit tests across core, fees, and HR running cleanly.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Frontend Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Frontend Client (`/frontend`)</h2>
              <p className="text-xs text-slate-500">React 19 · Vite 7 · Tailwind CSS 4 · Lucide</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Role-Based Navigation:</span>
                <span className="text-slate-500 ml-1">Dynamic UI reflecting Super Admin, Finance, HR, Employee & Student permissions.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Live Fee Inflow Trend:</span>
                <span className="text-slate-500 ml-1">Lightweight SVG visualization powered by backend aggregates.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Vite Proxy Layer:</span>
                <span className="text-slate-500 ml-1">Local dev routes `/api/*` and `/portal/*` to `http://localhost:8000`.</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* REST API Endpoints Reference */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Registered REST API Contracts</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { method: 'GET / POST', path: '/api/auth/login/', desc: 'Session authentication & role resolution' },
            { method: 'GET', path: '/api/auth/me/', desc: 'Current user profile & permissions' },
            { method: 'GET', path: '/api/finance/dashboard/', desc: 'Today collections, defaulters, monthly burn, batches' },
            { method: 'POST', path: '/api/finance/calculator/', desc: 'Atomic installment calculation & waiver assessment' },
            { method: 'GET', path: '/api/portal/dues/', desc: 'Student fee obligations & term schedules' },
            { method: 'POST', path: '/api/fees/:id/pay/', desc: 'Payment initiation & gateway order generation' },
            { method: 'GET', path: '/api/portal/payslips/', desc: 'Employee salary slips with PDF download links' },
            { method: 'GET / POST', path: '/api/leaves/', desc: 'Leave application workflow and HR approval' },
          ].map((ep) => (
            <div key={ep.path} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold shrink-0">
                {ep.method}
              </span>
              <div>
                <div className="font-mono font-bold text-slate-900">{ep.path}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{ep.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
