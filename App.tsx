
import React, { useState, useEffect } from 'react';
import {
  Bell, Settings, User, Search, Globe, Zap,
  TrendingUp, Activity, BarChart3, MessageSquare,
  FileText, Download, Clock, ExternalLink, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
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
  { id: '1', type: 'FLASH', time: '14:22:05', content: '美联储理事沃勒：当前数据并不支持急于降息。美元短线走强。', highlight: '突发' },
  { id: '2', type: 'DATA', time: '14:15:42', content: '印度1月黄金进口量同比大增 45%，至 67吨。实物需求强劲支撑。', highlight: '数据' },
  { id: '3', type: 'NOTICE', time: '14:02:11', content: '伦敦金银市场协会 (LBMA) 下调年度波动率预期。', highlight: '公告' },
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

  const getTicker = (symbol: string) => (dashboard?.tickers || []).find((t: any) => t.ticker === symbol);
  const getMacro = (name: string) => (dashboard?.macro || []).find((m: any) => m.indicator_name === name);

  const gold = getTicker('GC=F');
  const usdCny = getTicker('CNY=X');
  const realYield = getMacro('10Y_Real_Yield');
  const tnx = getTicker('^TNX');

  const pivotData = dashboard?.today_strategy?.pivot_points;
  const pivotList = pivotData ? [
    { label: 'R2 (强阻力)', val: pivotData.R2, color: 'text-red-400' },
    { label: 'R1 (弱阻力)', val: pivotData.R1, color: 'text-red-300' },
    { label: 'PIVOT (多空平衡)', val: pivotData.P, color: 'text-amber-500' },
    { label: 'S1 (弱支撑)', val: pivotData.S1, color: 'text-green-300' },
    { label: 'S2 (强支撑)', val: pivotData.S2, color: 'text-green-400' },
  ] : [];

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    const aiResponse = await getMarketAnalysis(chatInput);
    const aiMsg: ChatMessage = { role: 'ai', content: aiResponse || "Analysis unavailable.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const dynamicTechnicalBars = pivotData ? [
    { name: 'S2', value: pivotData.S2, color: '#ef4444' },
    { name: 'S1', value: pivotData.S1, color: '#ef4444' },
    { name: 'Pivot', value: pivotData.P, color: '#22c55e' },
    { name: 'R1', value: pivotData.R1, color: '#22c55e' },
    { name: 'R2', value: pivotData.R2, color: '#22c55e' },
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
            <a href="#" className="hover:text-white transition-colors">宏观透视</a>
            <a href="#" className="hover:text-white transition-colors">智能研报</a>
            <a href="#" className="hover:text-white transition-colors">系统设置</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
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
          <span className="text-[10px] font-bold text-gray-500 uppercase">国内溢价 (CNY/G)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono">+3.20</span>
            <span className="text-xs font-bold text-green-500">+0.15%</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 min-w-[300px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase">全球市场情绪监测</span>
          <div className="flex-1 h-1.5 bg-[#121214] rounded-full overflow-hidden relative border border-[#232326]">
            <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 w-full opacity-20"></div>
            <div className="absolute left-[78%] top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-10"></div>
          </div>
          <span className="text-[10px] font-bold text-amber-500 uppercase">78% 避险情绪强劲</span>
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
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={macroHistory}>
                  <defs>
                    <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
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
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', border: '1px solid #232326', fontSize: '10px' }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="nominal_yield" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNominal)" name="Nominal" />
                  <Area type="monotone" dataKey="real_yield" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorReal)" name="Real" />
                  <Area type="monotone" dataKey="breakeven_inflation" stroke="#a855f7" strokeWidth={1} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorInf)" name="Inflation" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm">
              <span className="text-[10px] text-gray-500 uppercase font-bold block mb-2">FedWatch 3月会议概率</span>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1"><span>维持利率 (5.25-5.50)</span> <span className="text-amber-500">82.4%</span></div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: '82.4%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1"><span>降息 25BP</span> <span className="text-blue-500">17.6%</span></div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: '17.6%' }}></div></div>
                </div>
              </div>
            </div>
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm">
              <span className="text-[10px] text-gray-500 uppercase font-bold block mb-2">美元信用墙 (利息/GDP)</span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold font-mono text-red-500">14.2%</span>
                  <span className="block text-[8px] text-red-500/80 mt-1 uppercase font-black">Warning Level</span>
                </div>
                <div className="w-16 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yieldData.slice(-4)}>
                      <Area type="monotone" dataKey="nominal" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Q2: Institutional & Sentiment */}
        <Card title="象限 2: 机构与情绪 (Institutional & Sentiment)">
          <div className="bg-[#0c0c0e] p-4 border border-amber-500/20 rounded-sm mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-center">
              <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Institutional Bullish Divergence Detected</span>
              <div className="text-gray-400 text-xs mt-1">Managed Money Net Long: +182,400 Lots (<span className="text-green-500">▲ 4.2%</span>)</div>
            </div>
          </div>

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
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-2.5 font-bold">PBoC (中国央行)</td>
                <td className="text-right text-green-500 font-mono">+16.4t</td>
                <td className="text-right font-mono">2,250.4t</td>
                <td className="text-right text-green-500 font-mono">▲ 0.73%</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-2.5 font-bold">CBRT (土耳其央行)</td>
                <td className="text-right text-green-500 font-mono">+12.1t</td>
                <td className="text-right font-mono">552.1t</td>
                <td className="text-right text-green-500 font-mono">▲ 2.24%</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-2.5 font-bold">RBI (印度央行)</td>
                <td className="text-right text-green-500 font-mono">+8.7t</td>
                <td className="text-right font-mono">812.3t</td>
                <td className="text-right text-green-500 font-mono">▲ 1.08%</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm flex justify-between items-center">
              <div>
                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">实物黄金溢价 (上海-伦敦)</span>
                <span className="text-lg font-bold font-mono text-green-500">+$3.25/oz</span>
              </div>
              <span className="text-[9px] bg-white/5 px-2 py-1 rounded text-gray-400 font-bold">PREMIUM STEADY</span>
            </div>
            <div className="bg-[#0c0c0e] p-3 border border-[#232326] rounded-sm flex justify-between items-center">
              <div>
                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">流动性健康指数 (LHI)</span>
                <span className="text-lg font-bold font-mono text-green-400">HEALTHY 1.25</span>
              </div>
              <div className="flex gap-0.5 items-end">
                {[2, 3, 5, 4, 6].map((h, i) => <div key={i} className="w-1 bg-green-500/80 rounded-t-sm" style={{ height: h * 3 }}></div>)}
              </div>
            </div>
          </div>
        </Card>

        {/* Q3: Technical Edge */}
        <Card title="象限 3: 技术面博弈 (Technical Edge)">
          <div className="flex gap-2 mb-4">
            <button className="px-3 py-1 bg-amber-500 text-black font-black text-[10px] rounded-sm">4H</button>
            <button className="px-3 py-1 bg-[#232326] text-gray-400 font-bold text-[10px] rounded-sm">1D</button>
            <button className="px-3 py-1 bg-[#232326] text-gray-400 font-bold text-[10px] rounded-sm">1W</button>
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
                  <span className="text-3xl font-black font-mono text-amber-500">18.42</span>
                  <div className="text-right">
                    <span className="text-green-500 text-[10px] font-bold block">▲ +2.1%</span>
                    <span className="text-[8px] text-gray-500 uppercase">High Volatility Alert</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">RSI (14) 指标状态</span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold font-mono">68.5</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full relative overflow-hidden">
                    <div className="absolute left-[30%] right-[30%] top-0 bottom-0 border-x border-white/20"></div>
                    <div className="h-full bg-amber-500" style={{ width: '68.5%' }}></div>
                  </div>
                  <span className="text-[9px] text-amber-500 uppercase font-black">Near Overbought</span>
                </div>
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
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              {intelStream.map((item) => (
                <div key={item.id} className="grid grid-cols-[100px_80px_1fr] items-start gap-4 text-[11px] group">
                  <span className="text-gray-600 font-mono font-bold group-hover:text-gray-400 transition-colors">{item.time}</span>
                  <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] text-center w-fit ${item.type === 'FLASH' ? 'bg-amber-500 text-black' :
                    item.type === 'DATA' ? 'bg-green-500 text-black' :
                      item.type === 'ALERT' ? 'bg-red-500 text-white' : 'bg-[#232326] text-gray-400'
                    }`}>
                    [{item.highlight}]
                  </span>
                  <p className="text-gray-300 group-hover:text-white transition-colors">
                    {item.content}
                  </p>
                </div>
              ))}
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
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> SHA 14:24</div>
            <div>NY 01:24</div>
            <div>LDN 06:24</div>
            <div>TYO 15:24</div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>Data Sync Active</span>
            <Activity className="w-3 h-3 text-green-500" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
