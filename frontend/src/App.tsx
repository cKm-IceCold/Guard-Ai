import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RiskGuardian from './components/RiskGuardian';
import StrategyBuilder from './components/StrategyBuilder';
import ExecutionMode from './components/ExecutionMode';
import TradeJournal from './components/TradeJournal';
import PsychologyDashboard from './components/PsychologyDashboard';
import ConnectBroker from './components/ConnectBroker';
import PublicProfile from './pages/PublicProfile';
import { NotificationProvider } from './components/NotificationProvider';
import './index.css';

/**
 * Main Application Layout (Private Routes)
 */
const PrivateApp = () => {
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center">
        <NotificationProvider />
        <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Verifying Authority...</p>
      </div>
    );
  }

  if (!isAuthenticated) return (
    <>
      <NotificationProvider />
      <Login />
    </>
  );

  return (
    <div className="flex h-screen bg-background text-slate-200 overflow-hidden font-sans relative">
      <NotificationProvider />
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>

      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50 -z-10"></div>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isVisible={sidebarVisible}
        setIsVisible={setSidebarVisible}
      />
      <main className={`flex-1 h-full overflow-y-auto relative p-4 md:p-8 pt-20 md:pt-8 transition-all duration-500 ${sidebarVisible ? 'md:ml-72' : 'md:ml-0'}`}>
        <div className="max-w-7xl mx-auto pb-20">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'risk' && <RiskGuardian />}
          {activeTab === 'strategy' && <StrategyBuilder />}
          {activeTab === 'execution' && <ExecutionMode onTradeLogged={() => setActiveTab('journal')} />}
          {activeTab === 'journal' && <TradeJournal />}
          {activeTab === 'analytics' && <PsychologyDashboard />}
          {activeTab === 'broker' && <ConnectBroker />}
        </div>
      </main>
    </div>
  );
};

/**
 * App Entry Point with Router
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: Shareable Profile */}
        <Route path="/u/:username" element={<PublicProfile />} />
        {/* Private Routes: Everything else */}
        <Route path="/*" element={<PrivateApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
