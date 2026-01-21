import React from 'react';
import { CycleReport } from '../types';

interface Props {
  report: CycleReport;
  isOpen: boolean;
  onClose: () => void;
}

const OperationSummary: React.FC<Props> = ({ report, isOpen, onClose }) => {
  if (!isOpen) return null;

  const isPass = report.finalStatus === 'OPTIMAL';
  const isWarning = report.finalStatus === 'WARNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-fade-in border border-industrial-700">
        
        {/* Header with Color Coding */}
        <div className={`p-6 text-center border-b ${
            isPass ? 'bg-green-50 border-green-200' : isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
        }`}>
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                isPass ? 'bg-green-100 text-green-600' : isWarning ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
            }`}>
                {isPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                )}
            </div>
            <h2 className="text-2xl font-bold text-industrial-text">Operation {report.finalStatus}</h2>
            <p className="text-sm text-industrial-600 mt-1">Cycle Completed Successfully</p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-industrial-800 rounded border border-industrial-700">
                <p className="text-xs text-industrial-600 uppercase font-bold">Max Vibration</p>
                <p className={`text-xl font-mono font-bold ${report.maxVibration > 4.5 ? 'text-red-600' : 'text-industrial-text'}`}>
                    {(report.maxVibration).toFixed(3)} <span className="text-sm text-gray-500">mm/s</span>
                </p>
            </div>
            <div className="p-3 bg-industrial-800 rounded border border-industrial-700">
                <p className="text-xs text-industrial-600 uppercase font-bold">Peak Temp</p>
                <p className="text-xl font-mono font-bold text-industrial-text">
                    {report.maxTemp.toFixed(1)} <span className="text-sm text-gray-500">°C</span>
                </p>
            </div>
            <div className="p-3 bg-industrial-800 rounded border border-industrial-700">
                <p className="text-xs text-industrial-600 uppercase font-bold">Tool Wear</p>
                <p className="text-xl font-mono font-bold text-industrial-text">
                    +{(report.toolWearDelta * 100).toFixed(4)} <span className="text-sm text-gray-500">%</span>
                </p>
            </div>
            <div className="p-3 bg-industrial-800 rounded border border-industrial-700">
                <p className="text-xs text-industrial-600 uppercase font-bold">Avg Load</p>
                <p className="text-xl font-mono font-bold text-industrial-text">
                    {report.avgLoad.toFixed(1)} <span className="text-sm text-gray-500">%</span>
                </p>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-industrial-700 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-industrial-text text-white rounded font-bold hover:bg-slate-800 transition shadow-lg"
            >
                Dismiss
            </button>
        </div>

      </div>
    </div>
  );
};

export default OperationSummary;