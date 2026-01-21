import React, { useState, useMemo } from 'react';
import { usePhysicsEngine } from './hooks/usePhysicsEngine';
import { PhysicsParams, AssetHealthStats, ControllerState } from './types';
import DigitalTwinVisualizer from './components/DigitalTwinVisualizer';
import CncController from './components/CncController';
import IIoTGateway from './components/IIoTGateway';
import AiAnalyst from './components/AiAnalyst';

// Initial default parameters (Fixed Machine Constants)
const MACHINE_CONSTANTS: PhysicsParams = {
  mass: 150,       
  stiffness: 12000, 
  damping: 200,    
  baseForce: 300,  // Material Hardness factor
  noiseLevel: 0.0001, // Sensor noise
  frequency: 0,
  force: 0
};

const App: React.FC = () => {
  // 1. Controller State (Operational Parameters)
  const [controllerState, setControllerState] = useState<ControllerState>({
    isCycleActive: false,
    feedOverride: 1.0,   // 100%
    spindleOverride: 1.0, // 100%
    targetRpc: 3000,
    activeGCodeLine: 0
  });

  // 2. Physics Engine (Simulates Machine + Sensors based on Controller)
  const { telemetry, currentStat } = usePhysicsEngine(MACHINE_CONSTANTS, controllerState);

  // 3. Cloud Analytics (Computes aggregates from Telemetry)
  const stats: AssetHealthStats = useMemo(() => {
    const recentWindow = telemetry.slice(-30);
    if (recentWindow.length === 0) {
      return { 
        rmsDisplacement: 0, peakVelocity: 0, rmsAcceleration: 0, dominantFrequency: 0, avgLoad: 0, status: 'OPTIMAL' 
      };
    }

    const sumSqDisp = recentWindow.reduce((sum, p) => sum + Math.pow(p.displacement, 2), 0);
    const rmsDisp = Math.sqrt(sumSqDisp / recentWindow.length);
    const maxVel = Math.max(...recentWindow.map(p => Math.abs(p.velocity)));
    const sumSqAcc = recentWindow.reduce((sum, p) => sum + Math.pow(p.acceleration, 2), 0);
    const rmsAcc = Math.sqrt(sumSqAcc / recentWindow.length);
    const avgLoad = recentWindow.reduce((sum, p) => sum + p.motorLoad, 0) / recentWindow.length;

    let status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
    if (rmsDisp > 0.00005 || avgLoad > 95) status = 'CRITICAL';
    else if (rmsDisp > 0.00002 || avgLoad > 80) status = 'WARNING';

    return {
      rmsDisplacement: rmsDisp,
      peakVelocity: maxVel,
      rmsAcceleration: rmsAcc,
      dominantFrequency: (controllerState.targetRpc * controllerState.spindleOverride) / 60,
      avgLoad,
      status
    };
  }, [telemetry, controllerState]);

  return (
    <div className="min-h-screen bg-industrial-950 text-industrial-text p-4 font-sans flex flex-col">
      
      {/* Header */}
      <header className="flex-none mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg border border-industrial-700 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-industrial-accent rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-industrial-text tracking-tight">VibraTwin <span className="text-industrial-600 font-light">CNC</span></h1>
                <p className="text-xs text-industrial-600 uppercase tracking-widest">Digital Twin & IIoT Simulator</p>
            </div>
        </div>
        
        <div className="flex gap-6 text-right">
            <div>
                <span className="text-[10px] text-industrial-600 uppercase font-bold block">Simulation Time</span>
                <span className="font-mono text-lg text-industrial-accent font-bold">{currentStat.t.toFixed(1)}s</span>
            </div>
            <div className="border-l border-slate-200 pl-6">
                <span className="text-[10px] text-industrial-600 uppercase font-bold block">Status</span>
                <span className={`font-mono text-lg font-bold ${stats.status === 'OPTIMAL' ? 'text-green-600' : stats.status === 'WARNING' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.status}
                </span>
            </div>
        </div>
      </header>

      {/* Main Content: 3-Column Industrial Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* Left: CNC Controller (HMI) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
                <h2 className="text-xs font-bold uppercase text-industrial-600">Machine Control Unit</h2>
             </div>
             <div className="flex-1">
                <CncController 
                    controllerState={controllerState} 
                    setControllerState={setControllerState} 
                    machineState={currentStat}
                />
             </div>
        </div>

        {/* Center: The Digital Twin (Physical Machine) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-industrial-accent rounded-full"></div>
                <h2 className="text-xs font-bold uppercase text-industrial-600">Digital Twin Visualization</h2>
             </div>
            <div className="flex-1">
                <DigitalTwinVisualizer 
                    displacement={currentStat.vibration} 
                    zPos={currentStat.zPos}
                    params={{...MACHINE_CONSTANTS, frequency: (controllerState.targetRpc * controllerState.spindleOverride)/60, force: MACHINE_CONSTANTS.baseForce * controllerState.feedOverride}} 
                    status={stats.status} 
                    cycleState={currentStat.cycleState}
                />
            </div>
            {/* AI Analyst fits below the machine visualization */}
            <div className="h-[250px]">
                <AiAnalyst stats={stats} params={{...MACHINE_CONSTANTS, frequency: (controllerState.targetRpc * controllerState.spindleOverride)/60, force: MACHINE_CONSTANTS.baseForce}} />
            </div>
        </div>

        {/* Right: IIoT Gateway (Sensors) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <h2 className="text-xs font-bold uppercase text-industrial-600">IIoT Sensor Gateway</h2>
             </div>
             <div className="flex-1">
                <IIoTGateway data={telemetry} />
             </div>
        </div>

      </main>

    </div>
  );
};

export default App;