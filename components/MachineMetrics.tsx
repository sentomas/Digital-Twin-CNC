import React from 'react';

interface Props {
  rpm: number;
  wear: number;
  rul: number; // in seconds, -1 if stable
  status: string;
}

const MachineMetrics: React.FC<Props> = ({ rpm, wear, rul, status }) => {
  
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
    <div className="grid grid-cols-3 gap-4 mb-4">
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
    </div>
  );
};

export default MachineMetrics;