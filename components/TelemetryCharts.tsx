import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ScatterChart, Scatter, LineChart, Line, ReferenceArea, Legend } from 'recharts';
import { TelemetryPoint, AssetHealthStats, TrendRecord } from '../types';

interface Props {
  data: TelemetryPoint[];
  stats: AssetHealthStats;
  trendHistory: TrendRecord[];
}

const TelemetryCharts: React.FC<Props> = ({ data, stats, trendHistory }) => {
  const [activeTab, setActiveTab] = useState<'TIME' | 'SPECTRUM' | 'PREDICTION'>('TIME');
  const [showModelDetails, setShowModelDetails] = useState(false);

  // --- Data Preparation ---
  const chartData = data.map(d => ({
    ...d,
    dispMicron: d.displacement * 1000 * 1000, // Convert to microns for clearer charts
    velMM: d.velocity * 1000,
    // Format timestamp to show relative seconds in the buffer
    timeLabel: (d.timestamp % 100).toFixed(2)
  }));
  
  const latestTelemetry = data[data.length - 1] || { temperature: 45, viscosity: 68 };

  // --- FFT Computation (Spectrum) ---
  const spectrumData = useMemo(() => {
    if (data.length < 32) return [];
    
    // Discrete Fourier Transform (DFT) implementation
    // We analyze the Displacement signal
    const N = Math.min(data.length, 128); // Use last 128 points for FFT window
    const sampleRate = 200; // From Physics Engine DT=0.005 (1/0.005 = 200Hz)
    const spectrum = [];
    
    // Calculate up to Nyquist frequency (100Hz)
    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        // Apply Hanning Window to reduce spectral leakage
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
        const val = data[data.length - N + n].displacement * window;
        
        const angle = -2 * Math.PI * k * n / N;
        real += val * Math.cos(angle);
        imag += val * Math.sin(angle);
      }
      const magnitude = Math.sqrt(real * real + imag * imag) * 2 / N; // Normalize
      const freq = k * sampleRate / N;
      
      // Filter out DC component (0Hz) and very low freqs
      if (k > 0) {
        spectrum.push({ freq: freq.toFixed(1), magnitude: magnitude * 1000 }); // Convert to mm
      }
    }
    return spectrum;
  }, [data]);

  // --- Prediction Model (RUL) ---
  const predictionResult = useMemo(() => {
    const warningLimit = 4.5; // ISO 10816 Zone B/C boundary
    const criticalLimit = 11.2; // ISO 10816 Zone C/D boundary
    
    // 1. Process Historical Data
    const history = trendHistory.map(h => ({
        time: h.time.toFixed(0),
        rawTime: h.time,
        history: h.rmsVelocity,
        forecast: null as number | null,
        limitWarning: warningLimit,
        limitCritical: criticalLimit
    }));

    // 2. Generate Forecast
    // Start from the last known point
    const lastPoint = trendHistory[trendHistory.length - 1] || { time: 0, rmsVelocity: stats.peakVelocity * 1000 * 0.707 };
    const startVal = lastPoint.rmsVelocity;
    const startTime = lastPoint.time;

    // Physics-based degradation model
    // V(t) = V0 * e^(lambda * t)
    
    // Base Degradation Factor from Vibration Status
    let stressFactor = 0.05; 
    if (stats.status === 'WARNING') stressFactor = 0.15;
    if (stats.status === 'CRITICAL') stressFactor = 0.35;
    
    // Refine Lambda with Tribology factors (Viscosity & Temp)
    // Lower Viscosity = Thinner film = Higher wear/vibration growth risk
    // Reference: ISO VG 68. 
    const viscFactor = Math.pow(68 / Math.max(10, latestTelemetry.viscosity), 0.5); 
    
    // Temperature Factor: Thermal expansion affects preload/clearance
    const tempFactor = Math.max(1, latestTelemetry.temperature / 50);

    // Dynamic Lambda
    const lambda = stressFactor * (1 + (stats.rmsAcceleration / 10)) * viscFactor * tempFactor;

    const forecast = [];
    let failureTime = -1;

    // Project 20 "Time Units" into future
    for(let i=0; i<=20; i++) { 
        const tOffset = i * 2; // Each step is 2 time units
        const t = startTime + tOffset;
        const val = startVal * Math.exp(lambda * (tOffset * 0.1)); // Scale time for visual curve
        
        // Detect Failure Crossing
        if (failureTime === -1 && val >= criticalLimit) {
            failureTime = t;
        }

        forecast.push({
            time: t.toFixed(0),
            rawTime: t,
            history: i === 0 ? startVal : null, // Connect lines
            forecast: val,
            limitWarning: warningLimit,
            limitCritical: criticalLimit
        });
    }

    return {
        chartData: [...history, ...forecast],
        failureTime: failureTime,
        currentVal: startVal,
        lambda: lambda,
        limit: criticalLimit,
        viscFactor,
        tempFactor
    };
  }, [stats, trendHistory, latestTelemetry.viscosity, latestTelemetry.temperature]);

  // --- CSV Export Functionality ---
  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "export.csv";

    if (activeTab === 'TIME') {
        csvContent += "Timestamp,Displacement_um,Velocity_mm_s\n";
        chartData.forEach(row => {
            csvContent += `${row.timestamp},${row.dispMicron},${row.velMM}\n`;
        });
        filename = "vibra_time_waveform.csv";
    } else if (activeTab === 'SPECTRUM') {
        csvContent += "Frequency_Hz,Magnitude_mm\n";
        spectrumData.forEach(row => {
            csvContent += `${row.freq},${row.magnitude}\n`;
        });
        filename = "vibra_fft_spectrum.csv";
    } else if (activeTab === 'PREDICTION') {
        csvContent += "Time,History_RMS,Forecast_RMS\n";
        predictionResult.chartData.forEach(row => {
            csvContent += `${row.rawTime},${row.history || ''},${row.forecast || ''}\n`;
        });
        filename = "vibra_rul_forecast.csv";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
        {/* Analytics Tabs */}
        <div className="flex bg-industrial-800 rounded-lg p-1 border border-industrial-700">
            {['TIME', 'SPECTRUM', 'PREDICTION'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded transition-colors
                        ${activeTab === tab 
                            ? 'bg-industrial-text text-white shadow-sm' 
                            : 'text-industrial-600 hover:text-industrial-text hover:bg-industrial-700'
                        }`}
                >
                    {tab === 'TIME' && 'Live Monitor'}
                    {tab === 'SPECTRUM' && 'FFT Spectrum'}
                    {tab === 'PREDICTION' && 'RUL Forecast'}
                </button>
            ))}
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 bg-white rounded-xl border border-industrial-700 shadow-lg relative overflow-hidden flex flex-col min-h-[300px]">
            
            {/* Header / Legend / Export */}
            <div className="h-8 bg-white border-b border-industrial-800 flex items-center px-4 justify-between">
                <h3 className="text-xs text-industrial-600 font-bold font-mono uppercase">
                    {activeTab === 'TIME' && "Time Waveform & Phase Plane"}
                    {activeTab === 'SPECTRUM' && "Frequency Domain Analysis"}
                    {activeTab === 'PREDICTION' && "Trend Analysis & RUL Prediction"}
                </h3>
                
                <div className="flex items-center gap-4">
                    {activeTab === 'TIME' && (
                        <div className="flex items-center gap-4 text-[10px] font-mono mr-2">
                            <span className="flex items-center gap-1 group relative cursor-help">
                                <div className="w-2 h-2 bg-sky-500 rounded-full"></div> Disp
                            </span>
                            <span className="flex items-center gap-1 group relative cursor-help">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Orbit
                            </span>
                        </div>
                    )}
                    
                    {/* Export Button */}
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-1 px-2 py-1 bg-industrial-800 hover:bg-industrial-700 text-industrial-600 rounded text-[10px] font-bold border border-industrial-700 transition"
                        title="Export current chart data to CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>

            <div className="flex-1 p-2 w-full h-full relative">
                
                {/* --- TIME DOMAIN TAB --- */}
                {activeTab === 'TIME' && (
                    <div className="flex h-full gap-2">
                        {/* Waveform */}
                        <div className="flex-[2] h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        tick={{fontSize: 9, fill: '#64748b'}}
                                        width={30}
                                        label={{ value: 'µm', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#64748b' }}
                                    />
                                    <XAxis 
                                        dataKey="timeLabel" 
                                        tick={{fontSize: 10, fill: '#64748b'}} 
                                        interval={40}
                                        label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#64748b' }}
                                        height={20}
                                    />
                                    <Tooltip 
                                        isAnimationActive={false}
                                        contentStyle={{ backgroundColor: '#fff', fontSize: '10px' }}
                                        formatter={(val: number) => [val.toFixed(1) + ' µm', 'Disp']}
                                    />
                                    <Area type="monotone" dataKey="dispMicron" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorDisp)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="absolute top-2 left-10 text-[10px] bg-white/80 px-1 rounded text-sky-600 font-bold">MAGNITUDE (µm)</div>
                        </div>
                        
                        {/* Orbit Plot (Phase Plane) */}
                        <div className="flex-1 h-full border-l border-industrial-800 pl-2 relative bg-industrial-950/30 rounded">
                             <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart>
                                    <XAxis type="number" dataKey="dispMicron" hide domain={['auto', 'auto']} />
                                    <YAxis type="number" dataKey="velMM" hide domain={['auto', 'auto']} />
                                    <Scatter name="Orbit" data={chartData.slice(-50)} fill="#6366f1" line={{ stroke: '#6366f1', strokeWidth: 1 }} shape={() => null} isAnimationActive={false} />
                                </ScatterChart>
                            </ResponsiveContainer>
                            <div className="absolute bottom-2 right-2 text-[10px] text-indigo-600 font-bold text-right">ORBIT<br/>(Disp vs Vel)</div>
                        </div>
                    </div>
                )}

                {/* --- SPECTRUM TAB --- */}
                {activeTab === 'SPECTRUM' && (
                    <div className="h-full w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spectrumData}>
                                <defs>
                                    <linearGradient id="colorSpec" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                    dataKey="freq" 
                                    tick={{fontSize: 10, fill: '#64748b'}} 
                                    label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }} 
                                    height={30}
                                />
                                <YAxis 
                                    tick={{fontSize: 10, fill: '#64748b'}} 
                                    width={30} 
                                    label={{ value: 'Mag (mm)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', fontSize: '11px' }}
                                    labelFormatter={(label) => `${label} Hz`}
                                    formatter={(val: number) => [val.toFixed(4) + ' mm', 'Magnitude']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="magnitude" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={2} 
                                    fill="url(#colorSpec)" 
                                    isAnimationActive={false} 
                                />
                                
                                {/* Harmonic Markers */}
                                <ReferenceLine x={stats.dominantFrequency} stroke="#16a34a" strokeDasharray="3 3" label={{ value: '1X', position: 'insideTop', fontSize: 10, fill: '#16a34a' }} />
                                <ReferenceLine x={stats.dominantFrequency * 2} stroke="#ca8a04" strokeDasharray="3 3" label={{ value: '2X', position: 'insideTop', fontSize: 10, fill: '#ca8a04' }} />
                                <ReferenceLine x={stats.dominantFrequency * 3} stroke="#ca8a04" strokeDasharray="3 3" label={{ value: '3X', position: 'insideTop', fontSize: 10, fill: '#ca8a04' }} />
                                <ReferenceLine x={stats.dominantFrequency * 4} stroke="#dc2626" strokeDasharray="3 3" label={{ value: '4X', position: 'insideTop', fontSize: 10, fill: '#dc2626' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="absolute top-2 right-4 text-[10px] bg-white/80 px-2 py-1 rounded border border-industrial-200 shadow-sm text-industrial-500">
                            RPM Harmonics
                        </div>
                    </div>
                )}

                {/* --- PREDICTION TAB --- */}
                {activeTab === 'PREDICTION' && (
                    <div className="relative h-full w-full">
                        {/* RUL Overlay Info */}
                        <div 
                            className="absolute top-2 right-2 z-10 bg-white/95 p-3 rounded-lg border border-industrial-700 shadow-lg text-right max-w-[240px] transition-all"
                            onMouseEnter={() => setShowModelDetails(true)}
                            onMouseLeave={() => setShowModelDetails(false)}
                        >
                             <div className="flex justify-between items-center mb-1">
                                <div className="text-[10px] text-industrial-400 cursor-help">ⓘ Model Info</div>
                                <h4 className="text-[10px] font-bold text-industrial-600 uppercase tracking-widest">Estimated Failure</h4>
                             </div>
                             
                             {predictionResult.failureTime !== -1 ? (
                                <div className="text-red-600">
                                    <div className="text-2xl font-bold font-mono">T + {predictionResult.failureTime.toFixed(0)}s</div>
                                    <div className="text-[10px] font-medium">Critical Threshold Violation</div>
                                </div>
                             ) : (
                                // Find this block around line 369:
<div className="text-green-600">
    {/* Use &gt; instead of just > */}
    <div className="text-xl font-bold font-mono">&gt; 1000h</div>
    <div className="text-[10px] font-medium">Operation Stable</div>
</div>
                             )}

                             {/* Expandable Math Details */}
                             {showModelDetails && (
                                <div className="mt-3 pt-3 border-t border-slate-200 text-left text-[10px] space-y-2 bg-slate-50 p-2 rounded">
                                    <div className="font-mono text-industrial-500">
                                        <div className="mb-1 font-bold text-slate-700">Degradation Model:</div>
                                        V(t) = V₀ · e^(λt)
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                        <span className="text-slate-500">Current (V₀):</span>
                                        <span className="font-mono">{predictionResult.currentVal.toFixed(2)}</span>
                                        
                                        <span className="text-slate-500">Limit (V_lim):</span>
                                        <span className="font-mono text-red-500">{predictionResult.limit}</span>
                                        
                                        <span className="text-slate-500">Rate (λ):</span>
                                        <span className="font-mono text-orange-500">{predictionResult.lambda.toFixed(4)}</span>
                                    </div>
                                    
                                    {/* NEW: Tribology Factors */}
                                    <div className="mt-2 border-t border-slate-200 pt-1">
                                        <div className="font-bold text-slate-700 mb-1">Impact Factors:</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Viscosity ({latestTelemetry.viscosity.toFixed(0)} cSt):</span>
                                            <span className={`font-mono ${predictionResult.viscFactor > 1.1 ? 'text-red-500' : 'text-green-600'}`}>
                                                x{predictionResult.viscFactor.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Temp ({latestTelemetry.temperature.toFixed(1)}°C):</span>
                                            <span className={`font-mono ${predictionResult.tempFactor > 1.1 ? 'text-red-500' : 'text-green-600'}`}>
                                                x{predictionResult.tempFactor.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-slate-400 italic text-[9px] mt-1">
                                        *Lambda (λ) calculated dynamically from real-time stress, oil viscosity, and temperature.
                                    </div>
                                </div>
                             )}

                             {!showModelDetails && (
                                 <div className="mt-2 pt-2 border-t border-slate-200">
                                    <div className="flex justify-between text-[10px] gap-4">
                                        <span className="text-slate-500">Current RMS:</span>
                                        <span className="font-mono font-bold">{predictionResult.currentVal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] gap-4">
                                        <span className="text-slate-500">Degradation Rate:</span>
                                        <span className="font-mono font-bold">{(predictionResult.lambda * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] gap-4 text-slate-400 mt-1">
                                        <span>Oil Temp: {latestTelemetry.temperature.toFixed(1)}°C</span>
                                    </div>
                                 </div>
                             )}
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={predictionResult.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="time" 
                                    tick={{fontSize: 10, fill: '#64748b'}} 
                                    label={{ value: 'Simulation Time (Seconds)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
                                    height={30}
                                />
                                <YAxis 
                                    label={{ value: 'Velocity RMS (mm/s)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }} 
                                    tick={{fontSize: 10, fill: '#64748b'}} 
                                />
                                <Tooltip contentStyle={{ fontSize: '12px' }}/>
                                <Legend wrapperStyle={{fontSize: '10px'}} />

                                {/* Zones */}
                                <ReferenceArea y1={0} y2={4.5} fill="#22c55e" fillOpacity={0.05} />
                                <ReferenceArea y1={4.5} y2={11.2} fill="#eab308" fillOpacity={0.05} />
                                <ReferenceArea y1={11.2} y2={100} fill="#ef4444" fillOpacity={0.05} />
                                
                                {/* Limit Lines */}
                                <ReferenceLine y={4.5} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'ISO Warning', fontSize: 9, fill: '#ca8a04', position: 'insideRight' }}/>
                                <ReferenceLine y={11.2} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'ISO Critical', fontSize: 9, fill: '#dc2626', position: 'insideRight' }}/>

                                {/* Data Lines */}
                                <Line type="monotone" dataKey="history" stroke="#0f172a" strokeWidth={2} dot={false} name="Actual Data" isAnimationActive={false} />
                                <Line type="monotone" dataKey="forecast" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Physics Model Forecast" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default TelemetryCharts;
