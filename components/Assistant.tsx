
import React, { useState, useRef, useEffect } from 'react';
import { chatWithPartner } from '../services/geminiService';
import { ChatMessage } from '../types';

const Assistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello Trader. I'm Guard AI. I'm monitoring the volatility spikes in crypto and the current FOMC sentiment. How can I assist with your strategy today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithPartner(history, input);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: new Date() }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-[#14141a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">G</div>
          <div>
            <h3 className="font-bold text-sm">Guard AI Strategist</h3>
            <span className="text-[10px] text-green-500 uppercase font-bold tracking-widest">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800/50 text-slate-200 border border-slate-700 rounded-tl-none'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <span className="text-[10px] opacity-50 block mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 animate-pulse">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                <div className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about volatility, risk, or your current trades..."
            className="w-full bg-[#0a0a0c] border border-slate-700 rounded-xl px-4 py-4 pr-16 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
