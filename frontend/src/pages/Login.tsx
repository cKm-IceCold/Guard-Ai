import { useState } from 'react';
import { authService } from '../services/endpoints';
import { useAuthStore } from '../store/useAuthStore';
import { notify } from '../components/NotificationProvider';

const Login = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                const data = await authService.login(email, password);
                login(data.access, data.refresh);
            } else {
                await authService.register(username, email, password);
                // After registration, auto-login
                const data = await authService.login(email, password);
                login(data.access, data.refresh);
            }
            notify.success(mode === 'login' ? "Access Granted. Welcome back." : "Registration Successful.");
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.response?.data?.error || "Connection failed. System offline.";
            setError(msg);
            notify.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden p-6">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 bg-grid opacity-30"></div>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10"></div>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-1000">
                <div className="text-center mb-10">

                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2 italic">GUARD AI</h1>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.4em] font-black opacity-60">Traders Only</p>
                </div>

                <div className="glass-card shadow-2xl p-10 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <h2 className="text-sm font-black text-white mb-8 uppercase tracking-widest text-center">
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </h2>

                    {error && (
                        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-[10px] font-black text-center animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'register' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Display Name</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-lg">person</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="terminal-input w-full pl-12"
                                        placeholder="EliteTrader"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-lg">alternate_email</span>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="terminal-input w-full pl-12"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Password</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-lg">lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="terminal-input w-full pl-12"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full btn-primary flex items-center justify-center gap-3 ${loading ? 'opacity-70 animate-pulse' : ''}`}
                        >
                            <span className="material-symbols-outlined animate-glide">
                                {mode === 'login' ? 'login' : 'how_to_reg'}
                            </span>
                            {loading ? 'VERIFYING...' : (mode === 'login' ? 'LOGIN TO DASHBOARD' : 'AUTHORIZE NEW ACCOUNT')}
                        </button>

                        <div className="pt-6 border-t border-border mt-8 text-center">
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="text-[10px] text-primary font-black uppercase tracking-widest hover:brightness-125 transition-all"
                            >
                                {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-8 text-[9px] text-center text-slate-700 font-mono tracking-widest uppercase opacity-40">
                    Proprietary Algorithm Enforcement Module
                </p>
            </div>
        </div>
    );
};

export default Login;
