import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePhysicsEngine } from './hooks/usePhysicsEngine';
import { PhysicsParams, AssetHealthStats, ControllerState, TrendRecord, CycleReport } from './types';
import DigitalTwinVisualizer from './components/DigitalTwinVisualizer';
import CncController from './components/CncController';
import IIoTGateway from './components/IIoTGateway';
import TelemetryCharts from './components/TelemetryCharts';
import AiAnalyst from './components/AiAnalyst';
import MachineMetrics from './components/MachineMetrics';
import OperationSummary from './components/OperationSummary';

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
    activeGCodeLine: 0,
    coolantActive: false
  });

  // 2. Physics Engine (Simulates Machine + Sensors based on Controller)
  const { telemetry, currentStat } = usePhysicsEngine(MACHINE_CONSTANTS, controllerState);

  // 3. Historical Data for Trends
  const [trendHistory, setTrendHistory] = useState<TrendRecord[]>([]);

  // 4. Cloud Analytics (Computes aggregates from Telemetry)
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

  // Update Trend History (approx every 0.5s of simulation time)
  useEffect(() => {
    const timeFloored = Math.floor(currentStat.t * 2) / 2;
    setTrendHistory(prev => {
        const last = prev[prev.length - 1];
        if (!last || timeFloored > last.time) {
            const newRecord = {
                time: timeFloored,
                rmsVelocity: stats.peakVelocity * 1000 * 0.707 // Convert to RMS mm/s
            };
            // Keep last 60 points
            const newHistory = [...prev, newRecord];
            if (newHistory.length > 60) return newHistory.slice(newHistory.length - 60);
            return newHistory;
        }
        return prev;
    });
  }, [currentStat.t, stats.peakVelocity]);

  // 5. Calculate Scalar RUL for Widget
  const rulPrediction = useMemo(() => {
    if (trendHistory.length < 5) return -1;
    
    const criticalLimit = 11.2;
    const startVal = stats.peakVelocity * 1000 * 0.707;
    
    // Degradation factor
    let stressFactor = 0.05; 
    if (stats.status === 'WARNING') stressFactor = 0.15;
    if (stats.status === 'CRITICAL') stressFactor = 0.35;
    const lambda = stressFactor * (1 + (stats.rmsAcceleration / 10));

    // Simple solve: limit = start * e^(lambda * t) => t = ln(limit/start) / lambda
    if (startVal >= criticalLimit) return 0;
    if (lambda <= 0) return -1;

    // Time remaining from NOW
    const tRemaining = Math.log(criticalLimit / Math.max(0.1, startVal)) / (lambda * 0.1); // Scaled by sim time factor
    
    // Cap at reasonable max for UI (e.g. 1 hour simulated)
    return tRemaining > 3600 ? -1 : tRemaining * 20; // Scale to real seconds roughly
  }, [stats, trendHistory]);

  // --- SUMMARY LOGIC ---
  const [report, setReport] = useState<CycleReport | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  
  // Refs to track data during a cycle
  const cycleDataRef = useRef({
    maxVib: 0,
    maxTemp: 0,
    loadSum: 0,
    count: 0,
    startWear: 0
  });
  const wasCycleActiveRef = useRef(false);

  useEffect(() => {
    // 1. Cycle Just Started
    if (controllerState.isCycleActive && !wasCycleActiveRef.current) {
        cycleDataRef.current = {
            maxVib: 0,
            maxTemp: 0,
            loadSum: 0,
            count: 0,
            startWear: currentStat.wear
        };
    }

    // 2. Cycle Active: Accumulate Data
    if (controllerState.isCycleActive) {
        const velMM = stats.peakVelocity * 1000;
        const temp = telemetry[telemetry.length-1]?.temperature || 0;
        
        cycleDataRef.current.maxVib = Math.max(cycleDataRef.current.maxVib, velMM);
        cycleDataRef.current.maxTemp = Math.max(cycleDataRef.current.maxTemp, temp);
        cycleDataRef.current.loadSum += stats.avgLoad;
        cycleDataRef.current.count++;
    }

    // 3. Cycle Just Ended: Generate Report
    if (!controllerState.isCycleActive && wasCycleActiveRef.current) {
        // Calculate report
        const data = cycleDataRef.current;
        const avgLoad = data.count > 0 ? data.loadSum / data.count : 0;
        
        let finalStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
        if (data.maxVib > 11.2 || avgLoad > 95) finalStatus = 'CRITICAL';
        else if (data.maxVib > 4.5 || avgLoad > 80) finalStatus = 'WARNING';

        setReport({
            timestamp: Date.now(),
            duration: data.count * 0.05, // Rough est
            maxVibration: data.maxVib,
            maxTemp: data.maxTemp,
            avgLoad: avgLoad,
            toolWearDelta: currentStat.wear - data.startWear,
            finalStatus: finalStatus
        });
        setShowSummary(true);
    }

    wasCycleActiveRef.current = controllerState.isCycleActive;
  }, [controllerState.isCycleActive, stats, telemetry, currentStat.wear]);


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
                <p className="text-xs text-industrial-600 uppercase tracking-widest">Blending Digital Twin & IIoT with Physics</p>
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
                    wear={currentStat.wear}
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
             <div className="flex-1 flex flex-col">
                <MachineMetrics 
                  rpm={stats.dominantFrequency * 60} 
                  wear={currentStat.wear} 
                  rul={rulPrediction}
                  status={stats.status}
                  sensorHealth={currentStat.sensorHealth}
                  sensorStatus={currentStat.sensorStatus}
                />
                <div className="flex-1 min-h-[400px]">
                  <TelemetryCharts 
                    data={telemetry} 
                    stats={stats} 
                    trendHistory={trendHistory}
                  />
                </div>
             </div>
        </div>

      </main>

      {/* Report Modal */}
      {report && (
          <OperationSummary 
            report={report} 
            isOpen={showSummary} 
            onClose={() => setShowSummary(false)} 
          />
      )}

    </div>
  );
};

export default App;
