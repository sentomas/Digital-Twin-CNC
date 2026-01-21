import React, { useState } from 'react';
import { AssetHealthStats, MaintenanceInsight, PhysicsParams } from '../types';
import { analyzeVibrationData } from '../services/geminiService';

interface Props {
  stats: AssetHealthStats;
  params: PhysicsParams;
}

const AiAnalyst: React.FC<Props> = ({ stats, params }) => {
  const [insight, setInsight] = useState<MaintenanceInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalysis = async () => {
    setLoading(true);
    const result = await analyzeVibrationData(stats, params);
    setInsight(result);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-industrial-700 shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-industrial-800 border-b border-industrial-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-industrial-text flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            Edge AI Diagnostics
        </h2>
        <button 
            onClick={handleAnalysis}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2
                ${loading 
                    ? 'bg-industrial-800 text-industrial-600 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20'
                }`}
        >
            {loading ? (
                <>
                   <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running Inference...
                </>
            ) : 'Run Analysis'}
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto bg-white">
        {!insight ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-mono">No analysis generated yet.</p>
            </div>
        ) : (
            <div className="space-y-6 animate-fade-in">
                
                {/* Severity Badge */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-industrial-600 uppercase tracking-widest">Diagnosis Result</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        insight.severity === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                        insight.severity === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        insight.severity === 'Medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        'bg-green-50 text-green-600 border-green-200'
                    }`}>
                        SEVERITY: {insight.severity.toUpperCase()}
                    </span>
                </div>

                {/* Main Diagnosis */}
                <div>
                    <h3 className="text-2xl font-bold text-industrial-text mb-2">{insight.diagnosis}</h3>
                    <div className="w-full bg-industrial-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-industrial-accent to-purple-600" 
                            style={{ width: `${insight.confidence}%` }}
                        />
                    </div>
                    <p className="text-right text-xs text-purple-600 mt-1 font-mono">Confidence: {insight.confidence}%</p>
                </div>

                {/* Recommendation */}
                <div className="bg-industrial-800 p-4 rounded-lg border border-industrial-700">
                    <h4 className="text-sm font-bold text-industrial-text mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-industrial-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Action Plan
                    </h4>
                    <p className="text-sm text-industrial-600 leading-relaxed">{insight.recommendation}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalyst;