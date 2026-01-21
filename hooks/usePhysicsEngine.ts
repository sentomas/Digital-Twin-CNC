import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsParams, TelemetryPoint, SimulationState, ControllerState } from '../types';

const DT = 0.005; // Time step (s) -> 200Hz Sample Rate (Nyquist = 100Hz)
const MAX_HISTORY = 200; // 1 second buffer
const SCREW_PITCH = 0.01; // 10mm pitch

export const usePhysicsEngine = (
    params: PhysicsParams, 
    controller: ControllerState
) => {
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: true,
    t: 0,
    zPos: 0,
    vibration: 0,
    cycleState: 'IDLE',
    wear: 0
  });

  const stateRef = useRef({
    t: 0,
    zPos: 0,   
    zVel: 0,   
    cycleState: 'IDLE' as 'IDLE' | 'RAPID_DOWN' | 'CUTTING' | 'RETRACT',
    temperature: 45.0,
    wearFactor: 0.0 // 0 to 1, increases over time during cuts
  });
  
  const paramsRef = useRef(params);
  const controllerRef = useRef(controller);
  
  useEffect(() => {
    paramsRef.current = params;
    controllerRef.current = controller;
  }, [params, controller]);

  const stepPhysics = useCallback(() => {
    const { mass, stiffness, damping, baseForce, noiseLevel } = paramsRef.current;
    const { isCycleActive, feedOverride, spindleOverride, targetRpc, coolantActive } = controllerRef.current;
    let { t, zPos, zVel, cycleState, temperature, wearFactor } = stateRef.current;

    // --- 1. Controller Logic (Cycle State) ---
    const WORKPIECE_Z = 0.35;
    const RETRACT_Z = 0.05;
    const BOTTOM_Z = 0.45;

    let targetVel = 0;
    let actualCuttingForce = 0;
    const currentRpm = targetRpc * spindleOverride;

    if (isCycleActive) {
        switch (cycleState) {
            case 'IDLE':
                cycleState = 'RAPID_DOWN';
                break;
            case 'RAPID_DOWN':
                targetVel = 0.2 * feedOverride; 
                if (zPos >= WORKPIECE_Z) cycleState = 'CUTTING';
                break;
            case 'CUTTING':
                targetVel = 0.02 * feedOverride;
                // Force increases with Feed Rate
                actualCuttingForce = baseForce * feedOverride * (1 + (Math.random()*0.1)); 
                // Simulate wear accumulation during heavy cuts
                if (actualCuttingForce > 150) {
                    wearFactor += 0.0001; 
                }
                if (zPos >= BOTTOM_Z) cycleState = 'RETRACT';
                break;
            case 'RETRACT':
                targetVel = -0.3; 
                if (zPos <= RETRACT_Z) cycleState = 'RAPID_DOWN';
                break;
        }
    } else {
        targetVel = 0;
        if (cycleState === 'CUTTING') actualCuttingForce = 0;
    }

    // Clamp wear
    if (wearFactor > 1.0) wearFactor = 1.0;

    // --- 2. Kinematics ---
    const Kp = 50.0; 
    const error = targetVel - zVel;
    const motorForce = error * Kp * mass; 

    // --- 3. Vibration & Sensor Model ---
    // Effective stiffness degrades with wear
    const wearStiffnessMult = Math.max(0.5, 1.0 - (wearFactor * 0.5));
    const extension = Math.max(0.1, zPos); 
    
    // Coolant Effect on Stiffness/Damping
    // Coolant film adds slight damping
    const effectiveDamping = damping * (coolantActive ? 1.2 : 1.0);
    const effectiveStiffness = (stiffness * wearStiffnessMult) / extension; 
    
    const naturalFreq = (1 / (2 * Math.PI)) * Math.sqrt(effectiveStiffness / mass);
    const omega = 2 * Math.PI * (currentRpm / 60); // Hz
    
    // Unbalance (1x RPM) - Increases with wear
    const unbalanceAmp = (currentRpm / 3000) * 10 * 0.000005 * (1 + wearFactor * 5); 
    const F_unbalance = unbalanceAmp * Math.sin(omega * t);

    // Cutting Vibration
    let F_cutting_vib = 0;
    if (cycleState === 'CUTTING' && isCycleActive) {
        F_cutting_vib = actualCuttingForce * 0.2 * Math.sin(4 * omega * t);
        // Chatter check
        if (actualCuttingForce > 300 && effectiveStiffness < 12000) {
            F_cutting_vib += actualCuttingForce * 0.8 * Math.sin(2 * Math.PI * naturalFreq * t);
        }
    }

    let totalVibForce = F_unbalance + F_cutting_vib;
    // Add randomness based on noise level
    let noise = (Math.random() - 0.5) * noiseLevel;

    // REQUEST: Stop vibration simulation when retracting
    if (cycleState === 'RETRACT') {
        totalVibForce = 0;
        noise = noise * 0.1; // Minimal noise floor
    }

    // Damping term is simplified here as steady state amplitude approximation + noise
    const dampingReduction = 1 / (1 + (effectiveDamping * 0.001)); 
    const vibDisplacement = ((totalVibForce / effectiveStiffness) * dampingReduction) + noise;
    
    const vibVelocity = vibDisplacement * omega; // Approximation for visualization
    const vibAccel = vibVelocity * omega;

    // --- 4. Motor & Temp & Viscosity ---
    const baseLoad = (currentRpm / 3000) * 20; 
    const cuttingLoad = (actualCuttingForce / 500) * 60; 
    const motorLoad = Math.min(100, Math.max(0, baseLoad + cuttingLoad + (Math.random()*2)));

    // Thermodynamics with Coolant
    // Coolant on: Target temp ~28C. Coolant off: Target temp ~60C+ depending on load.
    // Cooling rate is faster if coolant is on.
    const ambientTemp = 22;
    const heatGen = motorLoad * 0.8;
    const coolingTarget = coolantActive ? (ambientTemp + 5) : (ambientTemp + heatGen);
    const thermalInertia = coolantActive ? 0.05 : 0.002; // Coolant cools fast

    temperature += (coolingTarget - temperature) * thermalInertia;

    // Viscosity Calculation (Arrhenius-like approx for ISO VG 68 oil)
    // Viscosity drops as temp rises. 
    // Approx: 68 cSt at 40C. 
    const viscosity = 150 * Math.exp(-0.035 * (temperature - 25));

    // --- 5. Integrate Motion ---
    zVel += (targetVel - zVel) * 0.05; 
    zPos += zVel * DT;

    t += DT;
    stateRef.current = { t, zPos, zVel, cycleState, temperature, wearFactor };

    return {
      timestamp: t,
      displacement: vibDisplacement,
      velocity: vibVelocity,
      acceleration: vibAccel,
      zPos: zPos,
      torque: (motorForce * SCREW_PITCH) / (2 * Math.PI),
      rpm: currentRpm + (Math.random() * 5),
      motorLoad: motorLoad,
      temperature: temperature,
      viscosity: viscosity
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastChartUpdate = 0;

    const loop = (timestamp: number) => {
      // Run multiple physics steps per frame to keep up with real-time if needed
      // For now, we run 1 step per frame but the DT is small, so time moves slower than real-time
      // which is fine for detailed visualization.
      const dataPoint = stepPhysics();

      // Update React state at ~20Hz to avoid rendering bottlenecks
      if (timestamp - lastChartUpdate > 50) { 
        setSimulationState({
             isRunning: true,
             t: stateRef.current.t,
             zPos: stateRef.current.zPos,
             vibration: dataPoint.displacement,
             cycleState: stateRef.current.cycleState,
             wear: stateRef.current.wearFactor
        });
        setTelemetry(prev => {
          const newData = [...prev, dataPoint];
          if (newData.length > MAX_HISTORY) return newData.slice(newData.length - MAX_HISTORY);
          return newData;
        });
        lastChartUpdate = timestamp;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [stepPhysics]);

  return {
    telemetry,
    currentStat: simulationState,
  };
};