import React from 'react';

interface Props {
  rpm: number;
  wear: number;
  rul: number; // in seconds, -1 if stable
  status: string;
  sensorHealth?: number; // 0-100
  sensorStatus?: 'OK' | 'WARNING' | 'CRITICAL' | 'FAILED';
}

const MachineMetrics: React.FC<Props> = ({ rpm, wear, rul, status, sensorHealth = 100, sensorStatus = 'OK' }) => {
  
  // Determine Wear Color/Status
  let wearColor = 'text-green-500';
  let wearBg = 'bg-green-500';
  let wearText = 'GOOD';
  
  if (wear > 0.8) {
    wearColor = 'text-red-500';
    wearBg = 'bg-red-500';
    wearText = 'REPLACE';
  } else if (wear > 0.5) {
    wearColor = 'text-yellow-500';
    wearBg = 'bg-yellow-500';
    wearText = 'WARN';
  }

  // RUL Formatting
  const rulDisplay = rul === -1 ? '> 48h' : `${(rul / 60).toFixed(1)} min`;
  const rulColor = rul !== -1 && rul < 600 ? 'text-red-500' : 'text-industrial-text';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {/* RPM Widget */}
      <div className="bg-white p-4 rounded-xl border border-industrial-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span className="text-[10px] uppercase font-bold text-industrial-600 z-10">Spindle Speed</span>
        <div className="text-2xl font-mono font-bold text-industrial-accent z-10 mt-1">
          {rpm.toFixed(0)}
        </div>
        <span className="text-[9px] text-industrial-400 font-mono z-10">RPM</span>
        
        {/* RPM Gauge Background Arc */}
        <svg className="absolute bottom-0 w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
           <path d="M0 20 Q 50 -10 100 20" fill="none" stroke="#0284c7" strokeWidth="2" />
        </svg>
      </div>

      {/* RUL Widget */}
      <div className="bg-white p-4 rounded-xl border border-industrial-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
        <span className="text-[10px] uppercase font-bold text-industrial-600 z-10">Est. RUL</span>
        <div className={`text-2xl font-mono font-bold z-10 mt-1 ${rulColor}`}>
          {rulDisplay}
        </div>
        <span className="text-[9px] text-industrial-400 font-mono z-10">TIME TO FAILURE</span>
        {rul !== -1 && (
            <div className="absolute bottom-0 left-0 h-1 bg-red-500 animate-pulse" style={{ width: '100%' }}></div>
        )}
      </div>

      {/* Tool Wear Widget */}
      <div className="bg-white p-4 rounded-xl border border-industrial-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
        <span className="text-[10px] uppercase font-bold text-industrial-600 z-10">Tool Health</span>
        <div className={`text-2xl font-mono font-bold z-10 mt-1 ${wearColor}`}>
          {((1 - wear) * 100).toFixed(0)}%
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full z-10 mt-1 ${wearBg} bg-opacity-20 ${wearColor}`}>
            {wearText}
        </span>
        
        {/* Progress Circle Background */}
        <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-slate-200">
             <div className={`w-full h-full rounded-full ${wearBg} animate-ping ${wear > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>
        </div>
      </div>

      {/* SENSOR HEALTH WIDGET (NEW) */}
      <div className="bg-white rounded-xl border border-industrial-700 p-4 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-center mb-2 z-10">
            <h3 className="text-industrial-600 text-[10px] font-bold uppercase tracking-wider">SENSOR HEALTH</h3>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
              sensorStatus === 'OK' ? 'bg-emerald-100 text-emerald-600' : 
              sensorStatus === 'FAILED' ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-600'
            }`}>
              {sensorStatus}
            </span>
          </div>
          
          <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden z-10">
            <div 
              className={`h-full transition-all duration-300 ${
                sensorHealth > 50 ? 'bg-emerald-500' : 
                sensorHealth > 20 ? 'bg-amber-500' : 'bg-red-500'
              }`} 
              style={{ width: `${sensorHealth}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 z-10">
            <span>RUL: {(sensorHealth * 20).toFixed(0)} HRS</span>
            <span>{sensorHealth.toFixed(1)}%</span>
          </div>
          
          {/* Subtle Sensor Icon BG */}
          <div className="absolute -bottom-2 -right-2 opacity-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
          </div>
      </div>

    </div>
  );
};

export default MachineMetrics;