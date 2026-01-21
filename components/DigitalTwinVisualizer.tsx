import React, { useRef, useEffect, useState } from 'react';
import { PhysicsParams } from '../types';

interface Props {
  displacement: number; // This is now the vibration displacement
  zPos: number;         // This is the macro Z-position (0 to 0.5m)
  params: PhysicsParams;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  cycleState: string;
}

const DigitalTwinVisualizer: React.FC<Props> = ({ displacement, zPos, params, status, cycleState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>(0);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        
        // --- 1. Clear & Setup ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.save(); // Start Transform Scope

        // --- 2. Camera Transform (Zoom) ---
        // Workpiece is at Y=400.
        if (isZoomed) {
            const targetX = centerX;
            const targetY = 400; // Focus on workpiece level
            const zoomFactor = 3.5;

            ctx.translate(width / 2, height / 2);
            ctx.scale(zoomFactor, zoomFactor);
            ctx.translate(-targetX, -targetY);
            
            // Zoomed Grid
            ctx.strokeStyle = 'rgba(2, 132, 199, 0.05)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = -500; x <= 1000; x += 10) { ctx.moveTo(x, -1000); ctx.lineTo(x, 1000); }
            for (let y = -500; y <= 1000; y += 10) { ctx.moveTo(-1000, y); ctx.lineTo(1000, y); }
            ctx.stroke();
        } else {
            // Standard Grid
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
            for (let y = 0; y <= height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
            ctx.stroke();
        }
        
        // --- 3. Helper Functions ---
        const drawMetallicRect = (x: number, y: number, w: number, h: number, vertical = true) => {
            const grad = vertical 
                ? ctx.createLinearGradient(x, y, x + w, y)
                : ctx.createLinearGradient(x, y, x, y + h);
            
            grad.addColorStop(0, '#475569');
            grad.addColorStop(0.2, '#94a3b8');
            grad.addColorStop(0.5, '#cbd5e1');
            grad.addColorStop(0.8, '#94a3b8');
            grad.addColorStop(1, '#475569');
            
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);
        };

        // --- 4. Machine Column (Fixed) ---
        const colW = 180;
        const colH = 480;
        const colX = centerX - colW/2;
        drawMetallicRect(colX, 20, colW, colH);
        
        // Linear Rails
        ctx.fillStyle = '#1e293b';
        const railsX = centerX - 70;
        const railsW = 140;
        ctx.fillRect(railsX, 40, railsW, 440);
        
        // Rails detail
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=40; i<480; i+=15) {
            ctx.moveTo(railsX, i);
            ctx.lineTo(railsX + railsW, i);
        }
        ctx.stroke();

        // --- 5. Spindle Head (Dynamic Z-Position) ---
        // Map zPos (0 to 0.5m) to Canvas Y pixels
        // 0m -> Top (Y=50), 0.5m -> Bottom (Y=350)
        // 1m = 600px roughly
        const pixelsPerMeter = 600;
        const baseY = 50;
        // Vibration (displacement) is in meters, scale it up for visibility (x2000)
        const vibrationOffset = displacement * 2000; 
        
        const headY = baseY + (zPos * pixelsPerMeter) + vibrationOffset;
        const headW = 160;
        const headH = 150;
        const headX = centerX - headW/2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(headX + 10, headY + 10, headW, headH);
        
        // Head Main Body
        drawMetallicRect(headX, headY, headW, headH);

        // Logo Panel
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(headX + 20, headY + 20, headW - 40, 40);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px JetBrains Mono';
        ctx.fillText("VIBRA-CNC", headX + 35, headY + 45);
        
        // Cycle State LED
        let ledColor = '#94a3b8'; // Grey
        if (cycleState === 'RAPID_DOWN' || cycleState === 'RETRACT') ledColor = '#3b82f6'; // Blue
        if (cycleState === 'CUTTING') ledColor = status === 'CRITICAL' ? '#ef4444' : '#22c55e'; // Green or Red

        ctx.shadowBlur = 10;
        ctx.shadowColor = ledColor;
        ctx.fillStyle = ledColor;
        ctx.beginPath();
        ctx.arc(headX + headW - 20, headY + 40, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // --- 6. Spindle Nose & Tool ---
        const spindleW = 70;
        const spindleH = 50;
        const spindleX = centerX - spindleW/2;
        const spindleY = headY + headH;
        drawMetallicRect(spindleX, spindleY, spindleW, spindleH, true);
        
        // Tool Holder
        const holderW = 44;
        const holderX = centerX - holderW/2;
        const holderY = spindleY + spindleH;
        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(holderX, holderY, holderW, 30); // Black oxide finish
        
        // --- THE TOOL (End Mill) ---
        rotationRef.current += params.frequency * 0.2; // Rotate
        
        const toolW = 14;
        const toolLen = 90;
        const toolX = centerX - toolW/2;
        const toolY = holderY + 30;

        ctx.save();
        ctx.beginPath();
        ctx.rect(toolX, toolY, toolW, toolLen);
        ctx.clip();

        // Tool Gradient
        const toolGrad = ctx.createLinearGradient(toolX, 0, toolX + toolW, 0);
        toolGrad.addColorStop(0, '#64748b');
        toolGrad.addColorStop(0.3, '#f8fafc');
        toolGrad.addColorStop(0.5, '#e2e8f0');
        toolGrad.addColorStop(0.8, '#94a3b8');
        toolGrad.addColorStop(1, '#475569');
        ctx.fillStyle = toolGrad;
        ctx.fillRect(toolX, toolY, toolW, toolLen);

        // Flutes
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.lineWidth = 1.5;
        const fluteSpacing = 20;
        const rpm = params.frequency * 60;
        if (rpm > 1000) ctx.globalAlpha = Math.max(0.2, 1 - (rpm / 5000));
        
        const offset = (rotationRef.current * 10) % fluteSpacing;
        ctx.beginPath();
        for(let i = -1; i < 6; i++) {
            const yStart = toolY + (i * fluteSpacing) + offset;
            ctx.moveTo(toolX, yStart);
            ctx.lineTo(toolX + toolW, yStart + 15);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // --- 7. Table & Workpiece ---
        // Fixed Table position in World Space
        const tableY = 400 + 40; // 400 is workpiece top, so table is lower
        
        // Workpiece Block
        // Assume workpiece surface is exactly at Y=400 initially?
        // Let's say table surface is at Y=440. Workpiece is 40mm tall.
        const workW = 120;
        const workH = 40;
        const workX = centerX - workW/2;
        const workY = 440 - workH; // 400
        
        drawMetallicRect(centerX - 140, 440, 280, 30, false); // Table
        
        // Draw Workpiece
        ctx.fillStyle = '#b45309'; // Copper/Orange
        ctx.fillRect(workX, workY, workW, workH);
        
        // Top surface highlight
        ctx.fillStyle = '#d97706';
        ctx.fillRect(workX, workY, workW, 5);

        // --- 8. Chips / Sparks (During Cut) ---
        const toolTipY = toolY + toolLen;
        const isCutting = toolTipY > workY && cycleState === 'CUTTING';
        
        if (isCutting) {
            ctx.fillStyle = '#facc15';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 10;
            const sparkCount = 10 + (params.force / 10);
            
            for(let i=0; i<sparkCount; i++) {
                const sx = toolX + toolW/2;
                const sy = toolTipY;
                
                // Fountain effect
                const angle = -Math.PI/2 + (Math.random() - 0.5) * 2;
                const dist = Math.random() * (isZoomed ? 40 : 20);
                
                const px = sx + Math.cos(angle) * dist;
                const py = sy + Math.sin(angle) * dist;
                
                const size = Math.random() * (isZoomed ? 2 : 3);
                ctx.fillRect(px, py, size, size);
            }
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [displacement, zPos, params, isZoomed, status, cycleState]);

  return (
    <div className="relative bg-white rounded-xl border border-industrial-700 overflow-hidden shadow-lg h-[500px] group">
      
      {/* Header Label */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-industrial-accent font-bold font-mono text-sm tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-industrial-accent animate-pulse"></span>
            CNC TWIN: {cycleState}
        </h3>
      </div>
      
      {/* Zoom Toggle */}
      <button 
        onClick={() => setIsZoomed(!isZoomed)}
        className="absolute top-4 right-4 z-20 bg-white hover:bg-slate-50 text-slate-700 p-2 rounded-lg border border-industrial-700 transition shadow-sm"
      >
        {isZoomed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10H7" /> 
            </svg>
        ) : (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6" />
            </svg>
        )}
      </button>

      <canvas 
        ref={canvasRef} 
        width={400} 
        height={500} 
        className="w-full h-full object-contain cursor-crosshair"
        onClick={() => setIsZoomed(!isZoomed)}
      />
      
      {/* Bottom Stats Overlay */}
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur border border-industrial-700 p-2 rounded shadow-sm">
            <p className="text-[10px] text-industrial-600 font-mono uppercase">Depth</p>
            <p className="text-xs font-bold text-industrial-text font-mono">{(zPos * 1000).toFixed(0)} mm</p>
        </div>
        <div className="bg-white/90 backdrop-blur border border-industrial-700 p-2 rounded shadow-sm">
            <p className="text-[10px] text-industrial-600 font-mono uppercase">Vib. Amp</p>
            <p className="text-xs font-bold text-industrial-text font-mono">{(displacement * 1000).toFixed(3)} mm</p>
        </div>
        <div className="bg-white/90 backdrop-blur border border-industrial-700 p-2 rounded shadow-sm">
             <p className="text-[10px] text-industrial-600 font-mono uppercase">RPM</p>
             <p className="text-xs font-bold text-industrial-accent font-mono">{(params.frequency * 60).toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinVisualizer;