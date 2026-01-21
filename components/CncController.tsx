import React, { useEffect, useState } from 'react';
import { ControllerState, SimulationState } from '../types';

interface Props {
  controllerState: ControllerState;
  setControllerState: React.Dispatch<React.SetStateAction<ControllerState>>;
  machineState: SimulationState;
}

const G_CODE_PROGRAM = [
  "O1001 (FACE MILLING)",
  "N10 G21 G90 G40",
  "N20 G00 Z50.0 (SAFE Z)",
  "N30 M03 S3000 (SPINDLE ON)",
  "N40 G00 Z0.0 (APPROACH)",
  "N50 G01 Z-40.0 F500 (CUT)",
  "N60 G04 P500 (DWELL)",
  "N70 G00 Z50.0 (RETRACT)",
  "N80 M05 (SPINDLE OFF)",
  "N90 M30 (END)"
];

const CncController: React.FC<Props> = ({ controllerState, setControllerState, machineState }) => {
  
  // Sync G-Code line with machine cycle state for visualization
  const getActiveLine = () => {
    if (!controllerState.isCycleActive) return 0;
    switch (machineState.cycleState) {
        case 'IDLE': return 1;
        case 'RAPID_DOWN': return machineState.zPos < 0.2 ? 3 : 4;
        case 'CUTTING': return 5;
        case 'RETRACT': return 7;
        default: return 0;
    }
  };

  const activeLineIndex = getActiveLine();

  const handleStart = () => {
    setControllerState(prev => ({ ...prev, isCycleActive: true }));
  };

  const handleStop = () => {
    setControllerState(prev => ({ ...prev, isCycleActive: false }));
  };

  const toggleCoolant = () => {
    setControllerState(prev => ({ ...prev, coolantActive: !prev.coolantActive }));
  };

  return (
    <div className="bg-slate-800 rounded-xl border-4 border-slate-600 shadow-2xl p-1 flex flex-col h-full text-slate-100 font-mono">
      {/* HMI Bezel Header */}
      <div className="bg-slate-700 px-4 py-2 flex justify-between items-center border-b border-slate-600">
        <span className="font-bold tracking-widest text-slate-400">FANUC-SIM 32i</span>
        <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <div className="w-3 h-3 rounded-full bg-slate-900"></div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6 flex flex-col">
        
        {/* Screen */}
        <div className="bg-black border-2 border-slate-500 rounded p-4 shadow-inner relative overflow-hidden flex-1 min-h-[200px]">
            {/* CRT Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
            
            <div className="flex justify-between border-b border-green-900 pb-2 mb-2 text-green-500 text-xs">
                <span>POS: ABSOLUTE</span>
                <span>Z: {(machineState.zPos * 1000 * -1).toFixed(3)}</span>
            </div>

            <div className="font-mono text-sm space-y-1">
                {G_CODE_PROGRAM.map((line, i) => (
                    <div key={i} className={`${i === activeLineIndex ? 'bg-green-900 text-white' : 'text-green-600'}`}>
                        {line}
                    </div>
                ))}
            </div>

            <div className="absolute bottom-2 left-4 text-xs text-green-500 flex gap-4">
                <span>F{(500 * controllerState.feedOverride).toFixed(0)}</span>
                <span>S{(controllerState.targetRpc * controllerState.spindleOverride).toFixed(0)}</span>
                <span>{controllerState.coolantActive ? 'M08' : 'M09'}</span>
                <span className={machineState.cycleState === 'CUTTING' ? 'bg-white text-black px-1' : ''}>
                    {machineState.cycleState}
                </span>
            </div>
        </div>

        {/* Controls Area */}
        <div className="grid grid-cols-2 gap-6">
            
            {/* Overrides */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase">Feed Rate %</label>
                    <input 
                        type="range" min="0" max="2" step="0.1"
                        value={controllerState.feedOverride}
                        onChange={(e) => setControllerState(p => ({...p, feedOverride: parseFloat(e.target.value)}))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="text-right text-xs text-green-400">{(controllerState.feedOverride * 100).toFixed(0)}%</div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase">Spindle %</label>
                    <input 
                        type="range" min="0" max="1.5" step="0.1"
                        value={controllerState.spindleOverride}
                        onChange={(e) => setControllerState(p => ({...p, spindleOverride: parseFloat(e.target.value)}))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="text-right text-xs text-blue-400">{(controllerState.spindleOverride * 100).toFixed(0)}%</div>
                </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-3">
                <button 
                    onClick={handleStart}
                    className={`h-12 rounded shadow-lg font-bold text-sm tracking-wider transition active:translate-y-1 flex items-center justify-center gap-2
                    ${controllerState.isCycleActive 
                        ? 'bg-green-600 text-green-100 shadow-green-900/50 border-b-4 border-green-800' 
                        : 'bg-green-700 text-green-100 hover:bg-green-600 border-b-4 border-green-900'}`}
                >
                    <div className={`w-3 h-3 rounded-full ${controllerState.isCycleActive ? 'bg-white animate-pulse' : 'bg-green-900'}`}></div>
                    CYCLE START
                </button>
                <button 
                    onClick={handleStop}
                    className="h-12 bg-red-700 text-red-100 hover:bg-red-600 rounded shadow-lg border-b-4 border-red-900 font-bold text-sm tracking-wider transition active:translate-y-1"
                >
                    FEED HOLD
                </button>
                <button 
                    onClick={toggleCoolant}
                    className={`h-10 rounded shadow font-bold text-xs tracking-wider transition active:translate-y-1 border-b-4 flex items-center justify-between px-4
                    ${controllerState.coolantActive 
                        ? 'bg-blue-600 text-white border-blue-800' 
                        : 'bg-slate-600 text-slate-300 border-slate-800'}`}
                >
                    <span>COOLANT (M08)</span>
                    <div className={`w-2 h-2 rounded-full ${controllerState.coolantActive ? 'bg-blue-200 shadow-[0_0_5px_white]' : 'bg-slate-900'}`}></div>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default CncController;