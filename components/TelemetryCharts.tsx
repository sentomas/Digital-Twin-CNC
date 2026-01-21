import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TelemetryPoint, AssetHealthStats } from '../types';

interface Props {
  data: TelemetryPoint[];
  stats: AssetHealthStats;
}

const TelemetryCharts: React.FC<Props> = ({ data, stats }) => {
  
  const chartData = data.map(d => ({
    ...d,
    dispMM: d.displacement * 1000,
    timeStr: d.timestamp.toFixed(1)
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPTIMAL': return 'text-industrial-success';
      case 'WARNING': return 'text-industrial-warning';
      case 'CRITICAL': return 'text-industrial-danger';
      default: return 'text-industrial-600';
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-2">
            {[
                { label: 'STATUS', value: stats.status, color: getStatusColor(stats.status) },
                { label: 'DISP (RMS)', value: `${(stats.rmsDisplacement * 1000).toFixed(2)} mm`, color: 'text-industrial-text' },
                { label: 'VEL (PEAK)', value: `${(stats.peakVelocity * 1000).toFixed(1)} mm/s`, color: 'text-industrial-text' },
                { label: 'ACCEL (RMS)', value: `${stats.rmsAcceleration.toFixed(2)} m/s²`, color: 'text-industrial-text' },
            ].map((kpi, i) => (
                <div key={i} className="bg-white p-3 rounded border border-industrial-700 shadow-sm">
                    <p className="text-[10px] text-industrial-600 font-mono uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-sm md:text-base font-bold font-mono ${kpi.color} truncate`}>{kpi.value}</p>
                </div>
            ))}
        </div>

        {/* Professional Real-time Chart */}
        <div className="flex-1 bg-white rounded-xl border border-industrial-700 shadow-lg relative overflow-hidden flex flex-col min-h-[300px]">
            <div className="absolute top-0 left-0 right-0 h-8 bg-industrial-800 border-b border-industrial-700 flex items-center px-4 justify-between z-10">
                <h3 className="text-xs text-industrial-accent font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Real-time Displacement (Z-Axis)
                </h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            </div>
            
            <div className="flex-1 pt-8 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="timeStr" hide={true} />
                        <YAxis 
                            stroke="#64748b" 
                            tick={{fontSize: 10, fill: '#64748b', fontFamily: 'monospace'}}
                            width={35}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '12px', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: '#0284c7' }}
                            labelStyle={{ display: 'none' }}
                            formatter={(value: number) => [`${value.toFixed(3)} mm`, 'Disp']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="dispMM" 
                            stroke="#0284c7" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorDisp)" 
                            isAnimationActive={false} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default TelemetryCharts;