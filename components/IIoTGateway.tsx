import React from 'react';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TelemetryPoint } from '../types';

interface Props {
  data: TelemetryPoint[];
}

const IIoTGateway: React.FC<Props> = ({ data }) => {
  const latest = data[data.length - 1] || { rpm: 0, motorLoad: 0, temperature: 25, displacement: 0, viscosity: 68 };
  
  const chartData = data.slice(-50).map(d => ({
    ...d,
    dispMM: d.displacement * 1000,
    timeStr: d.timestamp.toFixed(1)
  }));

  return (
    <div className="bg-white rounded-xl border border-industrial-700 shadow-lg flex flex-col h-full overflow-hidden">
        {/* Gateway Header */}
        <div className="bg-industrial-800 p-3 border-b border-industrial-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-industrial-text rounded flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-industrial-text uppercase tracking-wider">Edge Gateway</h3>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-industrial-600 font-mono">OPC-UA: CONNECTED</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-industrial-600 font-mono">PACKET RATE</p>
                <p className="text-xs font-bold text-industrial-accent font-mono">100 Hz</p>
            </div>
        </div>

        {/* Sensor Gauges */}
        <div className="grid grid-cols-4 gap-1 p-4 bg-industrial-950/50">
            {/* RPM Gauge */}
            <div className="bg-white p-2 rounded border border-industrial-700 flex flex-col items-center">
                <span className="text-[9px] text-industrial-600 uppercase mb-1">Spindle</span>
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="#0284c7" strokeWidth="3" fill="none" strokeDasharray={125} strokeDashoffset={125 - (125 * Math.min(latest.rpm, 3000)/3000)} className="transition-all duration-300" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-industrial-text font-mono">{(latest.rpm).toFixed(0)}</span>
                </div>
                <span className="text-[9px] text-industrial-accent font-bold mt-1">RPM</span>
            </div>

            {/* Load Gauge */}
            <div className="bg-white p-2 rounded border border-industrial-700 flex flex-col items-center">
                <span className="text-[9px] text-industrial-600 uppercase mb-1">Load</span>
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke={latest.motorLoad > 80 ? '#ef4444' : '#eab308'} strokeWidth="3" fill="none" strokeDasharray={125} strokeDashoffset={125 - (125 * Math.min(latest.motorLoad, 100)/100)} className="transition-all duration-300" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-industrial-text font-mono">{(latest.motorLoad).toFixed(0)}%</span>
                </div>
                <span className="text-[9px] text-orange-500 font-bold mt-1">AMPS</span>
            </div>

            {/* Temp Gauge */}
            <div className="bg-white p-2 rounded border border-industrial-700 flex flex-col items-center">
                <span className="text-[9px] text-industrial-600 uppercase mb-1">Oil Temp</span>
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="#16a34a" strokeWidth="3" fill="none" strokeDasharray={125} strokeDashoffset={125 - (125 * Math.min(latest.temperature, 100)/100)} className="transition-all duration-300" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-industrial-text font-mono">{(latest.temperature).toFixed(1)}</span>
                </div>
                <span className="text-[9px] text-green-600 font-bold mt-1">°C</span>
            </div>

            {/* Viscosity Gauge */}
            <div className="bg-white p-2 rounded border border-industrial-700 flex flex-col items-center">
                <span className="text-[9px] text-industrial-600 uppercase mb-1">Viscosity</span>
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeDasharray={125} strokeDashoffset={125 - (125 * Math.min(latest.viscosity, 150)/150)} className="transition-all duration-300" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-industrial-text font-mono">{(latest.viscosity).toFixed(0)}</span>
                </div>
                <span className="text-[9px] text-purple-600 font-bold mt-1">cSt</span>
            </div>
        </div>

        {/* Live Stream Chart */}
        <div className="flex-1 p-2 min-h-[150px] relative">
            <h4 className="text-[10px] font-mono text-industrial-600 uppercase absolute top-3 left-4 z-10 bg-white/80 px-1 rounded">Vibration Sensor (IEPE)</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorIoT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <YAxis 
                        stroke="#94a3b8" 
                        tick={{fontSize: 9, fill: '#64748b', fontFamily: 'monospace'}}
                        width={30}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '12px' }}
                        itemStyle={{ color: '#6366f1' }}
                        formatter={(value: number) => [`${value.toFixed(3)} mm`, 'Vib']}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="dispMM" 
                        stroke="#6366f1" 
                        strokeWidth={1.5}
                        fillOpacity={1} 
                        fill="url(#colorIoT)" 
                        isAnimationActive={false} 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default IIoTGateway;