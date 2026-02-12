
import React, { useState, useEffect } from 'react';
import {
  Bell, Settings, User, Search, Globe, Zap,
  TrendingUp, Activity, BarChart3, MessageSquare,
  FileText, Download, Clock, ExternalLink, ChevronRight, ShieldAlert
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceDot
} from 'recharts';
import { getMarketAnalysis } from './services/geminiService';
import { ChatMessage, IntelMessage } from './types';
import { fetchDashboardState, DashboardState, fetchMacroHistory } from './services/api';

// --- Sub-components ---
const Card = ({ title, children, subtitle, className = "" }: any) => (
  <div className={`bg-[#121214] border border-[#232326] rounded-sm p-4 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</h3>
      </div>
      {subtitle && <span className="text-[10px] text-gray-500 font-mono">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const technicalBars = [
  { name: 'S2', value: 120, color: '#ef4444' },
  { name: 'S1', value: 110, color: '#ef4444' },
  { name: 'Pivot', value: 140, color: '#22c55e' },
  { name: 'R1', value: 180, color: '#22c55e' },
  { name: 'R2', value: 160, color: '#22c55e' },
  { name: 'R3', value: 240, color: '#fbbf24' },
];

const intelStream: IntelMessage[] = [
  { id: '1', type: 'FLASH', time: '14:22:05', content: '美联储理事沃勒：当前数据并不支持急于降息。美元短线走强。', highlight: '突发', url: 'https://finance.yahoo.com/news/feds-waller-says-no-rush-231500350.html' },
  { id: '2', type: 'DATA', time: '14:15:42', content: '印度1月黄金进口量同比大增 45%，至 67吨。实物需求强劲支撑。', highlight: '数据', url: 'https://www.reuters.com/markets/commodities/indias-jan-gold-imports-jump-as-prices-drop-2024-02-14/' },
  { id: '3', type: 'NOTICE', time: '14:02:11', content: '伦敦金银市场协会 (LBMA) 下调年度波动率预期。', highlight: '公告', url: 'https://www.lbma.org.uk/' },
  { id: '4', type: 'ALERT', time: '13:45:00', content: 'COMEX 黄金期货市场出现 $4亿 卖盘压制，价格在 2345 遇阻。', highlight: '异动' },
];

// --- Mock Data ---
const yieldData = [
  { time: '09:00', nominal: 4.15, real: 1.85 },
  { time: '10:00', nominal: 4.18, real: 1.90 },
  { time: '11:00', nominal: 4.25, real: 1.98 },
  { time: '12:00', nominal: 4.21, real: 1.95 },
  { time: '13:00', nominal: 4.19, real: 1.92 },
  { time: '14:00', nominal: 4.21, real: 1.95 },
];

const App: React.FC = () => {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: '终端初始化成功。当前金价 2342.15。正在扫描美债、美元指数与CFTC持仓变动...', timestamp: '14:22' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);

  // Macro History State
  const [historyRange, setHistoryRange] = useState('1mo');
  const [macroHistory, setMacroHistory] = useState<any[]>([]);
  const [technicalRange, setTechnicalRange] = useState('1D');
  const [countdown, setCountdown] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      const data = await fetchDashboardState();
      if (data) setDashboard(data);
    };
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchMacroHistory(historyRange);
      if (data) setMacroHistory(data);
    };
    loadHistory();
  }, [historyRange]);

  // Countdown timer for FedWatch
  useEffect(() => {
    const updateCountdown = () => {
      const fed = dashboard?.today_strategy?.fedwatch;
      if (!fed?.meeting_datetime_utc) {
        setCountdown('');
        return;
      }

      const now = new Date();
      const meetingDate = new Date(fed.meeting_datetime_utc);
      const diff = meetingDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('会议进行中');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown(`${days}天 ${hours}小时 ${minutes}分`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [dashboard]);

  const triggerSync = async (full: boolean = false) => {
    setIsSyncing(true);
    try {
      const apiUrl = typeof window !== 'undefined' && (window as any).VITE_API_URL ? (window as any).VITE_API_URL : '';
      const url = `${apiUrl}/api/cron/sync${full ? '?full=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log('Sync result:', data);
      alert(full ? '全量同步完成' : '快速同步完成');
      // Reload dashboard data
      const newData = await fetchDashboardState();
      if (newData) setDashboard(newData);
    } catch (error) {
      console.error('Sync error:', error);
      alert('同步失败: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateFedWatchManually = async () => {
    const pauseStr = prompt("请输入维持利率概率 (%)", "84.2");
    if (pauseStr === null) return;
    const cutStr = prompt("请输入降息 25BP 概率 (%)", "15.8");
    if (cutStr === null) return;

    const prob_pause = parseFloat(pauseStr);
    const prob_cut_25 = parseFloat(cutStr);

    if (isNaN(prob_pause) || isNaN(prob_cut_25)) {
      alert("请输入有效数字");
      return;
    }

    try {
      const apiUrl = typeof window !== 'undefined' && (window as any).VITE_API_URL ? (window as any).VITE_API_URL : '';
      const response = await fetch(`${apiUrl}/api/admin/fedwatch/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prob_pause, prob_cut_25, meeting_date: "2026-03-18" })
      });

      if (response.ok) {
        alert("FedWatch 数据已手动更新并保存至数据库");
        const newData = await fetchDashboardState();
        if (newData) setDashboard(newData);
      } else {
        alert("更新失败");
      }
    } catch (error) {
      alert("错误: " + error.message);
    }
  };

  const getTicker = (symbol: string) => (dashboard?.tickers || []).find((t: any) => t.ticker === symbol);
  const getMacro = (name: string) => (dashboard?.macro || []).find((m: any) => m.indicator_name === name);

  const gold = getTicker('GC=F');
  const usdCny = getTicker('CNY=X');
  const realYield = getMacro('10Y_Real_Yield');
  const tnx = getTicker('^TNX');

  const allPivots = dashboard?.today_strategy?.pivot_points;
  // If allPivots is the new nested structure, use it. Else fallback to 1D or the flat structure for backwards compatibility
  const currentPivots = allPivots ? (allPivots[technicalRange.toLowerCase()] || allPivots) : null;

  const pivotList = currentPivots ? [
    { label: 'R2 (强阻力)', val: currentPivots.R2, color: 'text-red-400' },
    { label: 'R1 (弱阻力)', val: currentPivots.R1, color: 'text-red-300' },
    { label: 'PIVOT (多空平衡)', val: currentPivots.P, color: 'text-amber-500' },
    { label: 'S1 (弱支撑)', val: currentPivots.S1, color: 'text-green-300' },
    { label: 'S2 (强支撑)', val: currentPivots.S2, color: 'text-green-400' },
  ] : [];


  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getMarketAnalysis(chatInput, dashboard);
      const aiMsg: ChatMessage = {
        role: 'ai',
        content: aiResponse || "Neural core busy. Please retry.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const dynamicTechnicalBars = currentPivots ? [
    { name: 'S2', value: currentPivots.S2, color: '#ef4444' },
    { name: 'S1', value: currentPivots.S1, color: '#ef4444' },
    { name: 'Pivot', value: currentPivots.P, color: '#22c55e' },
    { name: 'R1', value: currentPivots.R1, color: '#22c55e' },
    { name: 'R2', value: currentPivots.R2, color: '#22c55e' },
  ] : technicalBars;


  return (
    <div className="min-h-screen flex flex-col select-none">
      {/* ... header ... */}
      <header className="sticky top-0 z-50 bg-[#080809]/90 backdrop-blur-md border-b border-[#232326] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-1 rounded-sm">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <h1 className="text-lg font-black tracking-tighter flex items-center gap-2">
              GOLDTRACER PRO <span className="text-[10px] text-amber-500/80 font-mono">V5.0</span>
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <a href="#" className="text-amber-500">情报终端</a>
            <a href="#" className="hover:text-white transition">持仓分析</a>
            <a href="#" className="hover:text-white transition">AI视图</a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerSync(false)}
            disabled={isSyncing}
            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[9px] font-bold text-amber-500 uppercase tracking-wider transition disabled:opacity-50"
          >
            {isSyncing ? '同步中...' : '快速同步'}
          </button>
          <button
            onClick={() => triggerSync(true)}
            disabled={isSyncing}
            className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded text-[9px] font-bold text-purple-500 uppercase tracking-wider transition disabled:opacity-50"
          >
            全量同步
          </button>
          <div className="flex items-center gap-2 bg-[#121214] px-3 py-1 rounded-full border border-[#232326]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-gray-300 font-mono uppercase">AI Compute: Online</span>
          </div>
          <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-gray-400"><Settings className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-gray-400"><Bell className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-gray-400"><User className="w-4 h-4" /></button>
        </div>
      </header>

      {/* --- Tickers Bar --- */}
      <div className="bg-[#0c0c0e] border-b border-[#232326] px-4 py-2 flex items-center gap-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase">XAU/USD 现货黄金</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono">
              {gold?.last_price != null ? gold.last_price.toFixed(2) : '---'}
            </span>
            <span className={`text-xs font-bold ${gold?.change_percent != null && gold.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {gold?.change_percent != null ? (gold.change_percent >= 0 ? '+' : '') + gold.change_percent.toFixed(2) + '%' : '---'}
            </span>
          </div>
        </div>
        <div className="w-[1px] h-6 bg-[#232326]"></div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase">USD/CNY 离岸汇率</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono">
              {usdCny?.last_price != null ? usdCny.last_price.toFixed(4) : '---'}
            </span>
            <span className={`text-xs font-bold ${usdCny?.change_percent != null && usdCny.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {usdCny?.change_percent != null ? (usdCny.change_percent >= 0 ? '+' : '') + usdCny.change_percent.toFixed(2) + '%' : '---'}
            </span>
          </div>
        </div>
        <div className="w-[1px] h-6 bg-[#232326]"></div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase">DXY/美元指数</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono">
              {getTicker('DX-Y.NYB')?.last_price != null ? getTicker('DX-Y.NYB').last_price.toFixed(2) : '---'}
            </span>
            <span className={`text-xs font-bold ${getTicker('DX-Y.NYB')?.change_percent != null && getTicker('DX-Y.NYB').change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {getTicker('DX-Y.NYB')?.change_percent != null ? (getTicker('DX-Y.NYB').change_percent >= 0 ? '+' : '') + getTicker('DX-Y.NYB').change_percent.toFixed(2) + '%' : '---'}
            </span>
          </div>
        </div>
        <div className="w-[1px] h-6 bg-[#232326]"></div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase">国内溢价 (CNY/G)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono">
              {getMacro('Domestic_Premium')?.value != null ? (Number(getMacro('Domestic_Premium').value) >= 0 ? '+' : '') + Number(getMacro('Domestic_Premium').value).toFixed(2) : '+3.20'}
            </span>
            <span className="text-xs font-bold text-green-500">LIVE</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 min-w-[300px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase">全球市场情绪监测</span>
          <div className="flex-1 h-1.5 bg-[#121214] rounded-full overflow-hidden relative border border-[#232326]">
            <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 w-full opacity-20"></div>
            {(() => {
              const sentiment = getMacro('Market_Sentiment')?.value != null ? Number(getMacro('Market_Sentiment').value) : 78;
              return (
                <>
                  <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-10 transition-all duration-1000" style={{ left: `${sentiment}%` }}></div>
                </>
              );
            })()}
          </div>
          <span className="text-[10px] font-bold text-amber-500 uppercase">
            {getMacro('Market_Sentiment')?.value != null ? `${Number(getMacro('Market_Sentiment').value).toFixed(0)}%` : '78%'} 避险情绪
          </span>
        </div>
      </div>

      {/* --- Main Dashboard Content --- */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Q1: Macro & Policy */}
        <Card title="象限 1: 宏观与政策 (Macro & Policy)" subtitle={`Range: ${historyRange.toUpperCase()}`}>
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] text-gray-500 block mb-1">10年期美债收益率 (名义/实际/通胀)</span>
                <span className="text-2xl font-black font-mono">
                  {tnx?.last_price != null ? tnx.last_price.toFixed(2) + '%' : '--%'} / {realYield?.value != null ? Number(realYield.value).toFixed(2) + '%' : '--%'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* Timeframe Filter */}
                <div className="flex bg-black/40 p-0.5 rounded border border-white/5">
                  {['1D', '1W', '1MO', '3MO', '1Y'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setHistoryRange(r.toLowerCase())}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all ${historyRange === r.toLowerCase() ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 text-[9px] font-bold uppercase tracking-tighter">
                  <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500"></div> 名义</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-amber-500"></div> 实际</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-purple-500"></div> 通胀</div>
                </div>
              </div>
            </div>
            <div className={`h-48 w-full ${historyRange === '5d' || historyRange === '1d' ? 'max-w-[400px]' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={macroHistory}>
                  <defs>
                    <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorInf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                  <XAxis
                    dataKey="log_date"
                    hide={historyRange === '1d'}
                    fontSize={9}
                    tick={{ fill: '#4b5563' }}
                    tickFormatter={(val) => val && typeof val === 'string' ? val.split('-').slice(1).join('/') : val}
                    padding={{ left: 10, right: 10 }}
                  />
                  {/* Separate axes for height amplification */}
                  <YAxis yAxisId="nom" hide domain={['dataMin', 'dataMax']} />
                  <YAxis yAxisId="vol" hide domain={['dataMin', 'dataMax']} allowDecimals={true} />

                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', border: '1px solid #232326', fontSize: '10px' }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />

                  {/* Nominal uses its own scale */}
                  <Area yAxisId="nom" type="monotone" dataKey="nominal_yield" stroke="#3b82f6" strokeWidth={1} strokeOpacity={0.5} fillOpacity={1} fill="url(#colorNominal)" name="Nominal" />

                  {/* Real & Inflation share a zoomed scale to show 0.01% changes clearly */}
                  <Area yAxisId="vol" type="monotone" dataKey="real_yield" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" name="Real" />
                  <Area yAxisId="vol" type="monotone" dataKey="breakeven_inflation" stroke="#a855f7" strokeWidth={1} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorInf)" name="Inflation" />

                  {/* Highlight Peak & Bottom for Real (on the zoomed scale) */}
                  {(() => {
                    const validData = macroHistory.filter(d => d.real_yield != null);
                    if (validData.length === 0) return null;
                    const maxPt = validData.reduce((prev, curr) => (curr.real_yield > prev.real_yield ? curr : prev), validData[0]);
                    const minPt = validData.reduce((prev, curr) => (curr.real_yield < prev.real_yield ? curr : prev), validData[0]);

                    return (
                      <>
                        {maxPt && (
                          <ReferenceDot
                            yAxisId="vol"
                            x={maxPt.log_date}
                            y={maxPt.real_yield}
                            r={4}
                            fill="#fff"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            label={{ position: 'top', value: `Top: ${maxPt.real_yield}%`, fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' }}
                          />
                        )}
                        {minPt && minPt !== maxPt && (
                          <ReferenceDot
                            yAxisId="vol"
                            x={minPt.log_date}
                            y={minPt.real_yield}
                            r={4}
                            fill="#fff"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            label={{ position: 'bottom', value: `Btm: ${minPt.real_yield}%`, fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' }}
                          />
                        )}
                      </>
                    );
                  })()}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm">
              {(() => {
                const fed = dashboard?.today_strategy?.fedwatch;
                const pPause = fed?.prob_pause ?? 82.4;
                const pCut = fed?.prob_cut_25 ?? 17.6;
                return (
                  <>
                    <div className="mb-2 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">{fed?.meeting_name || 'FedWatch 会议概率'}</span>
                        {fed?.meeting_time && (
                          <span className="text-[8px] text-amber-500/80 font-mono block mt-0.5">{fed.meeting_time}</span>
                        )}
                        {countdown && (
                          <span className="text-[9px] text-red-500 font-black block mt-1">⏱ 倒计时: {countdown}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] text-blue-400 hover:underline"
                        >
                          CME数据↗
                        </a>
                        <button
                          onClick={updateFedWatchManually}
                          className="text-[9px] text-gray-500 hover:text-white"
                          title="手动修正数据"
                        >
                          修正
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1"><span>维持利率 (5.25-5.50)</span> <span className="text-amber-500">{pPause}%</span></div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${pPause}%` }}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1"><span>降息 25BP</span> <span className="text-blue-500">{pCut}%</span></div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pCut}%` }}></div></div>
                      </div>
                    </div>
                    {fed?.last_verified && (
                      <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center opacity-60">
                        <span className="text-[8px] text-gray-400">数据最后核验: {fed.last_verified}</span>
                        <span className="text-[8px] text-amber-500/50 font-mono">LIVE / MANUAL</span>
                      </div>
                    )}
                  </>

                );
              })()}
            </div>


            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm">
              <span className="text-[10px] text-gray-500 uppercase font-bold block mb-2">美元信用墙 (利息/GDP)</span>
              <div className="flex items-center justify-between">
                <div>
                  {(() => {
                    const debtMetric = getMacro('Debt_Interest_GDP')?.value != null ? Number(getMacro('Debt_Interest_GDP').value) : 14.2;
                    const isWarning = debtMetric > 12;
                    return (
                      <>
                        <span className={`text-2xl font-bold font-mono ${isWarning ? 'text-red-500' : 'text-green-500'}`}>
                          {debtMetric.toFixed(1)}%
                        </span>
                        <span className={`block text-[8px] mt-1 uppercase font-black ${isWarning ? 'text-red-500/80 animate-pulse' : 'text-green-500/80'}`}>
                          {isWarning ? 'Warning Level' : 'Stable Level'}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="w-16 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={macroHistory.slice(-10)}>
                      <Area type="monotone" dataKey="nominal_yield" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Q2: Institutional & Sentiment */}
        <Card title="象限 2: 机构与情绪 (Institutional & Sentiment)">
          {(() => {
            const mm = (dashboard?.institutional || []).find(s => s.label === "Managed Money Net Long");
            const mmVal = mm?.value ? Number(mm.value).toLocaleString() : '182,400';
            const mmChange = mm?.change_value ? (Number(mm.change_value) >= 0 ? '▲ ' : '▼ ') + Math.abs(Number(mm.change_value)).toLocaleString() : '▲ 4.2%';
            const mmColor = (mm?.change_value && Number(mm.change_value) >= 0) || !mm?.change_value ? 'text-green-500' : 'text-red-500';

            return (
              <div className="bg-[#0c0c0e] p-4 border border-amber-500/20 rounded-sm mb-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-center">
                  <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Institutional Sentiment Monitor</span>
                  <div className="text-gray-400 text-xs mt-1">Managed Money Net Long: {mmVal} Lots (<span className={mmColor}>{mmChange}</span>)</div>
                </div>
              </div>
            );
          })()}

          <table className="w-full text-[11px] mb-4">
            <thead>
              <tr className="text-gray-500 uppercase font-bold border-b border-[#232326]">
                <th className="text-left pb-2">全球央行黄金储备</th>
                <th className="text-right pb-2">月度变动</th>
                <th className="text-right pb-2">总持有量</th>
                <th className="text-right pb-2">变动率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232326]/30">
              {[
                { label: 'USA (美联储)', key: 'USA (Fed) Reserve' },
                { label: 'CBR (俄罗斯央行)', key: 'CBR (Russia) Reserve' },
                { label: 'PBoC (中国央行)', key: 'PBoC Gold Reserve' },
                { label: 'NBP (波兰央行)', key: 'NBP (Poland) Reserve' },
                { label: 'CBRT (土耳其央行)', key: 'CBRT Gold Reserve' },
                { label: 'RBI (印度央行)', key: 'RBI Gold Reserve' },
                { label: 'CBI (伊朗央行)', key: 'CBI (Iran) Reserve' }

              ].map((item, idx) => {

                const data = (dashboard?.institutional || []).find(s => s.label === item.key);
                const val = data?.value ? Number(data.value).toLocaleString() + 't' : '---';
                const chg = data?.change_value ? (Number(data.change_value) >= 0 ? '+' : '') + Number(data.change_value).toFixed(1) + 't' : '+0.0t';
                const pct = data?.value && data?.change_value ? (Number(data.change_value) / Number(data.value) * 100).toFixed(2) + '%' : '0.00%';
                const isPositive = !data?.change_value || Number(data.change_value) >= 0;

                return (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-bold">{item.label}</td>
                    <td className={`text-right font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{chg}</td>
                    <td className="text-right font-mono">{val}</td>
                    <td className={`text-right font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? '▲' : '▼'} {pct}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm flex justify-between items-center">
              <div>
                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">实物溢价 (SH-LDN)</span>
                <span className="text-lg font-bold font-mono text-green-500">
                  {getMacro('Domestic_Premium')?.value != null ? `+$${(Number(getMacro('Domestic_Premium').value) / 7.2 * 31.1).toFixed(2)}/oz` : '+$3.25/oz'}
                </span>
              </div>
              <span className="text-[8px] bg-white/5 px-2 py-1 rounded text-gray-400 font-bold">LIVE</span>
            </div>

            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm flex justify-between items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
              <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] text-gray-500 uppercase font-bold">地缘风险 (GPR)</span>
                  <ShieldAlert className="w-3 h-3 text-red-500 animate-pulse" />
                </div>
                <div className="flex items-end justify-between">
                  {(() => {
                    const gpr = (dashboard?.macro || []).find(i => i.indicator_name === 'GPR_Index');
                    const val = gpr?.value ? Number(gpr.value).toFixed(2) : '142.50';
                    return (
                      <>
                        <span className="text-lg font-bold font-mono text-red-500">{val}</span>
                        <span className="text-[8px] px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded font-black uppercase tracking-tighter">High Tension</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm flex justify-between items-center group relative overflow-hidden">
              <div className="relative z-10 w-full">
                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">流动性健康 (LHI)</span>
                <div className="flex items-end justify-between">
                  {(() => {
                    const lhi = (dashboard?.macro || []).find(i => i.indicator_name === 'Liquidity_Health');
                    const val = lhi?.value ? Number(lhi.value).toFixed(2) : '1.25';
                    return (
                      <>
                        <span className="text-lg font-bold font-mono text-green-400">{val}</span>
                        <div className="flex gap-0.5 items-end pb-1">
                          {[2, 3, 5, 4, 6].map((h, i) => <div key={i} className="w-1 bg-green-500/80 rounded-t-sm" style={{ height: h * 2.5 }}></div>)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

        </Card>


        {/* Q3: Technical Edge */}
        <Card title="象限 3: 技术面博弈 (Technical Edge)">
          <div className="flex gap-2 mb-4">
            {['4H', '1D', '1W'].map((range) => (
              <button
                key={range}
                onClick={() => setTechnicalRange(range)}
                className={`px-3 py-1 font-black text-[10px] rounded-sm transition-colors ${technicalRange === range ? 'bg-amber-500 text-black' : 'bg-[#232326] text-gray-400 hover:bg-[#2d2d30]'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="h-48 w-full mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicTechnicalBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {dynamicTechnicalBars.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">经典枢轴位 (Pivot Points)</span>
              {(pivotList.length > 0 ? pivotList : [
                { label: 'R3 (极强阻力)', val: '2382.4', color: 'text-gray-300' },
                { label: 'R2 (强阻力)', val: '2368.1', color: 'text-gray-300' },
                { label: 'R1 (弱阻力)', val: '2354.8', color: 'text-gray-300' },
                { label: 'PIVOT (多空平衡)', val: '2332.1', color: 'text-amber-500' },
                { label: 'S1 (弱支撑)', val: '2315.5', color: 'text-gray-300' },
              ]).map((p, i) => (
                <div key={i} className="flex justify-between text-[11px] font-mono border-b border-[#232326]/30 pb-1">
                  <span className="text-gray-500">{p.label}</span>
                  <span className={`font-bold ${p.color}`}>{p.val}</span>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">GVZ 黄金波动率指数</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black font-mono text-amber-500">
                    {getMacro('GVZ_Index')?.value ? Number(getMacro('GVZ_Index').value).toFixed(2) : '18.42'}
                  </span>
                  <div className="text-right">
                    <span className="text-green-500 text-[10px] font-bold block">▲ LIVE</span>
                    <span className="text-[8px] text-gray-500 uppercase">Volatility Risk Monitor</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">RSI (14) 指标状态</span>
                {(() => {
                  const rsiVal = getMacro('RSI_14')?.value ? Number(getMacro('RSI_14').value) : 68.5;
                  const status = rsiVal > 70 ? 'Overbought' : rsiVal < 30 ? 'Oversold' : 'Neutral';
                  const color = rsiVal > 70 ? 'text-red-500' : rsiVal < 30 ? 'text-green-500' : 'text-amber-500';

                  return (
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold font-mono">{rsiVal.toFixed(1)}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full relative overflow-hidden">
                        <div className="absolute left-[30%] right-[30%] top-0 bottom-0 border-x border-white/20 z-10"></div>
                        <div className={`h-full ${rsiVal > 70 ? 'bg-red-500' : rsiVal < 30 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${rsiVal}%` }}></div>
                      </div>
                      <span className={`text-[9px] ${color} uppercase font-black`}>{status}</span>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        </Card>

        {/* Q4: AI Action Center */}
        <Card title="象限 4: AI 智慧行动中心 (AI Action Center)" subtitle="GPT-4o Pro Trading Engine">
          {/* Dynamic AI Advice */}
          {(() => {
            const strategy = dashboard?.today_strategy;
            const advice = strategy?.trade_advice;
            const hasAdvice = advice && advice.entry;

            return (
              <div className="bg-[#121214] border-2 border-green-500/30 rounded p-4 mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-500 text-black font-black text-xs rounded-sm">BUY ORDER</span>
                    <h4 className="text-sm font-bold">日内交易策略建议 (PIVOT)</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 uppercase block">Confidence Score</span>
                    <span className="text-lg font-bold font-mono text-green-500">{hasAdvice ? (advice.confidence * 100).toFixed(1) + '%' : '--%'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-black/40 p-3 rounded text-center border border-[#232326]">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">入场点位 (Pivot)</span>
                    <span className="text-xl font-bold font-mono text-amber-500 underline decoration-amber-500/30">
                      {hasAdvice ? advice.entry : '---'}
                    </span>
                  </div>
                  <div className="bg-black/40 p-3 rounded text-center border border-[#232326]">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">目标止盈 (R1)</span>
                    <span className="text-xl font-bold font-mono text-green-500 underline decoration-green-500/30">
                      {hasAdvice ? advice.tp : '---'}
                    </span>
                  </div>
                  <div className="bg-black/40 p-3 rounded text-center border border-red-500/20">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">严格止损 (S1)</span>
                    <span className="text-xl font-bold font-mono text-red-500 underline decoration-red-500/30">
                      {hasAdvice ? advice.sl : '---'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 italic bg-white/5 p-3 rounded border-l-2 border-amber-500">
                  {hasAdvice ? `逻辑：${advice.note || '价格目前处于枢轴点附近，建议依据关键点位部署。'}` : 'Waiting for market data synchronization...'}
                </p>
              </div>
            );
          })()}

          <div className="bg-black/20 border border-[#232326] rounded-sm flex flex-col h-[400px]">
            <div className="p-3 border-b border-[#232326] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">实时 AI 深度交互分析</span>
              </div>
              <span className="text-[9px] text-gray-500">DIRECT TERMINAL ACCESS</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
              {/* Combine Intel Stream and Live News */}
              {(dashboard?.news || []).length > 0 ? (
                dashboard.news.map((item: any, i: number) => (
                  <div key={`news-${i}`} className="flex flex-col gap-1 border-l-2 border-amber-500/30 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black px-1 rounded ${item.msg_type === 'DATA' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        {item.msg_type || 'FLASH'}
                      </span>
                      <span className="text-[8px] text-gray-600 font-mono">
                        {new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-gray-300 hover:text-white transition">
                      {item.title}
                    </a>
                  </div>
                ))
              ) : (
                intelStream.map((item, i) => (
                  <div key={`mock-${i}`} className="flex flex-col gap-1 border-l-2 border-gray-500/30 pl-3 py-1 opacity-50">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-gray-500">{item.type}</span>
                      <span className="text-[8px] text-gray-600 font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-500">{item.content}</p>
                  </div>
                ))
              )}

              <div className="w-full h-px bg-white/5 my-4"></div>

              {messages.map((m, i) => (
                <div key={`chat-${i}`} className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase ${m.role === 'ai' ? 'text-amber-500' : 'text-blue-500'}`}>
                      {m.role === 'ai' ? 'AI_CORE:' : 'USER:'}
                    </span>
                    <span className="text-[8px] text-gray-600 font-mono">{m.timestamp}</span>
                  </div>
                  <div className={`text-xs leading-relaxed ${m.role === 'ai' ? 'text-gray-300' : 'text-gray-400 italic'}`}>
                    {m.content.split('\n').map((line, li) => (
                      <p key={li} className="mb-1">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-amber-500/50 animate-pulse">
                  <span className="text-[10px] font-black">AI_CORE IS THINKING...</span>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#232326] bg-[#121214]">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入您的查询指令 (例如: '分析持仓背离' or '计算今日风险溢价')..."
                  className="w-full bg-black border border-[#232326] rounded-sm py-2 px-4 text-xs focus:outline-none focus:border-amber-500/50 transition-colors pr-12"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-500 hover:text-amber-400 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="col-span-full bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-sm font-black text-xs uppercase flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
              <FileText className="w-4 h-4" />
              生成深度研究报告 (Generate Deep Research Report)
            </button>
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded flex justify-between items-center group cursor-pointer hover:border-amber-500/30 transition-colors">
              <div>
                <span className="text-[9px] text-gray-500 uppercase block mb-1">最近生成报告</span>
                <span className="text-[11px] font-bold">XAU_Weekly_Analysis_20240320.pdf</span>
              </div>
              <Download className="w-4 h-4 text-gray-500 group-hover:text-amber-500 transition-colors" />
            </div>
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded flex justify-between items-center group cursor-pointer hover:border-amber-500/30 transition-colors">
              <div>
                <span className="text-[9px] text-gray-500 uppercase block mb-1">情绪热图分析</span>
                <span className="text-[11px] font-bold">Sentiment_Matrix_v2.csv</span>
              </div>
              <Download className="w-4 h-4 text-gray-500 group-hover:text-amber-500 transition-colors" />
            </div>
          </div>
        </Card>

        {/* Bottom Panel: Live Intel Stream */}
        <div className="lg:col-span-2">
          <Card title="实时情报流 (Live Intel Stream)" subtitle="LIVE STREAMING" className="h-fit">
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {(dashboard?.news || intelStream).map((item: any, idx: number) => {
                const timeStr = item.published_at ? new Date(item.published_at).toLocaleTimeString('zh-CN', { hour12: false }) : item.time;
                const mType = item.msg_type || item.type;
                const tag = item.highlight || (mType === 'FLASH' ? '快讯' : mType);

                return (
                  <div key={item.id || idx} className="grid grid-cols-[80px_80px_1fr_30px] items-start gap-4 text-[11px] group">
                    <span className="text-gray-600 font-mono font-bold group-hover:text-gray-400 transition-colors shrink-0">{timeStr}</span>
                    <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] text-center w-[60px] shrink-0 ${mType === 'FLASH' ? 'bg-amber-500 text-black' :
                      mType === 'DATA' ? 'bg-green-500 text-black' :
                        mType === 'ALERT' ? 'bg-red-500 text-white' : 'bg-[#232326] text-gray-400'
                      }`}>
                      [{tag}]
                    </span>
                    <p className="text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                      {item.title || item.content}
                    </p>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" title="查看研报详情" className="text-gray-600 hover:text-amber-500 transition-colors p-0.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : <div className="w-3.5"></div>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </main>

      {/* --- Footer Status Bar --- */}
      <footer className="bg-[#080809] border-t border-[#232326] px-4 py-2 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-green-500/80">System Integrity:</span>
            <span className="text-gray-300">Encrypted L3 Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500/80">AI Engine:</span>
            <span className="text-gray-300">GPT-4o Pro (14.5 TFLOPs)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500/80">API Latency:</span>
            <span className="text-gray-300">14ms</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-[#232326] pr-4">
            {(() => {
              const now = new Date();
              const utcHour = now.getUTCHours();

              const markets = [
                { name: 'ASIA', start: 0, end: 9, color: 'text-blue-500', label: 'Physical' },
                { name: 'EURO', start: 7, end: 16, color: 'text-purple-500', label: 'Benchmark' },
                { name: 'USA', start: 13, end: 22, color: 'text-amber-500', label: 'Speculative' }
              ];

              return (
                <div className="flex gap-3">
                  {markets.map(m => {
                    const isActive = utcHour >= m.start && utcHour < m.end;
                    return (
                      <div key={m.name} className={`flex flex-col items-center gap-0.5 ${isActive ? 'opacity-100' : 'opacity-20'}`}>
                        <span className={`text-[8px] font-black ${isActive ? m.color : 'text-gray-500'}`}>{m.name}</span>
                        <div className={`w-8 h-1 rounded-full ${isActive ? (m.name === 'USA' ? 'bg-amber-500' : m.name === 'EURO' ? 'bg-purple-500' : 'bg-blue-500') : 'bg-gray-800'}`}></div>
                        {isActive && <span className="text-[6px] text-gray-400 scale-75">{m.label}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-4 border-r border-[#232326] pr-4">
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> SHA {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })}</div>
            <div>NY {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' })}</div>
            <div>LDN {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' })}</div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>Data Sync Active</span>
            <Activity className="w-3 h-3 text-green-500 animate-[pulse_2s_infinite]" />
          </div>
        </div>

      </footer>
    </div>
  );
};

export default App;
