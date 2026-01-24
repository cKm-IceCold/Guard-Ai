import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RiskGuardian from './components/RiskGuardian';
import StrategyBuilder from './components/StrategyBuilder';
import ExecutionMode from './components/ExecutionMode';
import TradeJournal from './components/TradeJournal';
import './index.css';

function App() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) return <Login />;

  return (
    <div className="flex h-screen bg-background text-slate-200 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 h-full overflow-y-auto relative p-4 md:p-8">
        <div className="max-w-7xl mx-auto pb-20">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'risk' && <RiskGuardian />}
          {activeTab === 'strategy' && <StrategyBuilder />}
          {activeTab === 'execution' && <ExecutionMode onTradeLogged={() => setActiveTab('journal')} />}
          {activeTab === 'journal' && <TradeJournal />}
        </div>
      </main>
    </div>
  );
}

export default App;
