import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { FeeCalculator } from './pages/FeeCalculator';
import { StudentPortal } from './pages/StudentPortal';
import { HRManagement } from './pages/HRManagement';
import { EmployeePortal } from './pages/EmployeePortal';
import { ModuleView } from './pages/ModuleView';
import { LoginPage } from './pages/LoginPage';
import { Building2, RefreshCw } from 'lucide-react';

import { MobileBottomNav } from './components/MobileBottomNav';

function getSavedTab() {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash ? window.location.hash.replace('#', '') : null;
    if (hash) return hash;
    const saved = localStorage.getItem('apex_active_tab');
    if (saved) return saved;
  }
  return null;
}

function MainApp() {
  const { user, loading, hasRole } = useAuth();
  const [activeTab, setActiveTabState] = useState(() => getSavedTab() || 'finance-dashboard');
  const [lastUsername, setLastUsername] = useState(null);

  const handleTabChange = (newTab) => {
    setActiveTabState(newTab);
    localStorage.setItem('apex_active_tab', newTab);
    if (window.location.hash !== `#${newTab}`) {
      window.history.pushState(null, '', `#${newTab}`);
    }
  };

  // Sync browser back/forward buttons and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash && currentHash !== activeTab) {
        setActiveTabState(currentHash);
        localStorage.setItem('apex_active_tab', currentHash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Set default tab on initial login if no tab was already selected/saved
  useEffect(() => {
    if (!user) return;
    if (user.username !== lastUsername) {
      setLastUsername(user.username);
      const savedTab = getSavedTab();
      if (!savedTab) {
        let initialTab = 'finance-dashboard';
        if (hasRole('Student/Parent') && !hasRole('Super Admin', 'Finance Admin')) {
          initialTab = 'student-portal';
        } else if (hasRole('Employee') && !hasRole('Super Admin', 'HR Admin', 'Finance Admin')) {
          initialTab = 'employee-leaves';
        } else if (hasRole('HR Admin') && !hasRole('Super Admin', 'Finance Admin')) {
          initialTab = 'attendance-leaves';
        }
        handleTabChange(initialTab);
      } else {
        if (!window.location.hash) {
          window.history.replaceState(null, '', `#${savedTab}`);
        }
      }
    }
  }, [user?.username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md animate-pulse">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Connecting to ERP Backend Service...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'finance-dashboard':
      case 'financial-reports':
        return <FinanceDashboard />;
      case 'fee-structures':
        return <FeeCalculator />;
      case 'student-details':
      case 'student-portal':
        return <StudentPortal />;
      case 'attendance-leaves':
      case 'payroll-processing':
        return <HRManagement />;
      case 'employee-payslips':
      case 'employee-leaves':
        return <EmployeePortal />;
      default:
        return <ModuleView moduleId={activeTab} />;
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 p-3.5 sm:p-5 md:p-8 pb-4 md:pb-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <MobileBottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
