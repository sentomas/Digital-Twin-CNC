import React from 'react';
import { PhysicsParams } from '../types';

interface Props {
  params: PhysicsParams;
  setParams: React.Dispatch<React.SetStateAction<PhysicsParams>>;
}

const ControlPanel: React.FC<Props> = ({ params, setParams }) => {

  const handleChange = (key: keyof PhysicsParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const loadPreset = (type: 'NORMAL' | 'LOOSE' | 'IMBALANCE' | 'CHATTER') => {
    switch (type) {
      case 'NORMAL':
        setParams(prev => ({ ...prev, stiffness: 3000, damping: 60, mass: 20, force: 10, frequency: 10, noiseLevel: 0.001 }));
        break;
      case 'LOOSE':
        // Gibs loose, low stiffness. Force tuned to land in WARNING zone (approx 15mm)
        setParams(prev => ({ ...prev, stiffness: 800, damping: 40, mass: 20, force: 12, frequency: 10, noiseLevel: 0.005 }));
        break;
      case 'IMBALANCE':
        // High centrifugal force, should hit CRITICAL (approx 80mm)
        setParams(prev => ({ ...prev, stiffness: 3000, damping: 60, mass: 20, force: 250, frequency: 25, noiseLevel: 0.002 }));
        break;
      case 'CHATTER':
        const k = 3000;
        const m = 20;
        const fn = Math.sqrt(k/m) / (2*Math.PI);
        setParams(prev => ({ ...prev, stiffness: k, damping: 5, mass: m, force: 50, frequency: fn, noiseLevel: 0.001 }));
        break;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-industrial-700 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-industrial-text flex items-center gap-2">
          <span className="w-2 h-6 bg-industrial-accent rounded-sm"></span>
          Machine Parameters
        </h2>
        <div className="grid grid-cols-2 lg:flex gap-2">
          <button onClick={() => loadPreset('NORMAL')} className="px-3 py-1 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition">Optimal</button>
          <button onClick={() => loadPreset('IMBALANCE')} className="px-3 py-1 text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100 transition">Unbalance</button>
          <button onClick={() => loadPreset('LOOSE')} className="px-3 py-1 text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 transition">Loose Gibs</button>
          <button onClick={() => loadPreset('CHATTER')} className="px-3 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition">Chatter</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* RPM Control */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-industrial-600 font-mono font-medium">
            <span>Spindle Speed</span>
            <span className="text-industrial-accent">{(params.frequency * 60).toFixed(0)} RPM</span>
          </label>
          <input 
            type="range" min="60" max="3000" step="60"
            value={params.frequency * 60}
            onChange={(e) => handleChange('frequency', parseFloat(e.target.value) / 60)}
            className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-industrial-accent"
          />
        </div>

        {/* Mass Control */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-industrial-600 font-mono font-medium">
            <span>Head Mass</span>
            <span className="text-industrial-accent">{params.mass} kg</span>
          </label>
          <input 
            type="range" min="5" max="100" step="1"
            value={params.mass}
            onChange={(e) => handleChange('mass', parseFloat(e.target.value))}
            className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-industrial-accent"
          />
        </div>

        {/* Force Control */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-industrial-600 font-mono font-medium">
            <span>Cutting Load</span>
            <span className="text-industrial-accent">{params.force} N</span>
          </label>
          <input 
            type="range" min="0" max="500" step="5"
            value={params.force}
            onChange={(e) => handleChange('force', parseFloat(e.target.value))}
            className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-industrial-accent"
          />
        </div>

        {/* Stiffness Control */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-industrial-600 font-mono font-medium">
            <span>Rigidity (k)</span>
            <span className="text-industrial-accent">{params.stiffness} N/m</span>
          </label>
          <input 
            type="range" min="500" max="10000" step="100"
            value={params.stiffness}
            onChange={(e) => handleChange('stiffness', parseFloat(e.target.value))}
            className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-industrial-accent"
          />
        </div>

        {/* Damping Control */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-industrial-600 font-mono font-medium">
            <span>Damping (c)</span>
            <span className="text-industrial-accent">{params.damping} Ns/m</span>
          </label>
          <input 
            type="range" min="0" max="200" step="1"
            value={params.damping}
            onChange={(e) => handleChange('damping', parseFloat(e.target.value))}
            className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-industrial-accent"
          />
        </div>

        {/* Noise Control */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm text-industrial-600 font-mono font-medium">
            <span>Sensor Noise</span>
            <span className="text-industrial-accent">{(params.noiseLevel * 1000).toFixed(1)} mV</span>
          </label>
          <input 
            type="range" min="0" max="0.05" step="0.001"
            value={params.noiseLevel}
            onChange={(e) => handleChange('noiseLevel', parseFloat(e.target.value))}
            className="w-full h-2 bg-industrial-800 rounded-lg appearance-none cursor-pointer accent-industrial-600"
          />
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;