import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsParams, TelemetryPoint, SimulationState, ControllerState } from '../types';

const DT = 0.01; // Time step (s)
const MAX_HISTORY = 100;
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
    cycleState: 'IDLE'
  });

  const stateRef = useRef({
    t: 0,
    zPos: 0,   
    zVel: 0,   
    cycleState: 'IDLE' as 'IDLE' | 'RAPID_DOWN' | 'CUTTING' | 'RETRACT',
    temperature: 45.0 // Initial bearing temp
  });
  
  const paramsRef = useRef(params);
  const controllerRef = useRef(controller);
  
  useEffect(() => {
    paramsRef.current = params;
    controllerRef.current = controller;
  }, [params, controller]);

  const stepPhysics = useCallback(() => {
    const { mass, stiffness, damping, baseForce, noiseLevel } = paramsRef.current;
    const { isCycleActive, feedOverride, spindleOverride, targetRpc } = controllerRef.current;
    let { t, zPos, zVel, cycleState, temperature } = stateRef.current;

    // --- 1. Controller Logic (Cycle State) ---
    const WORKPIECE_Z = 0.35;
    const RETRACT_Z = 0.05;
    const BOTTOM_Z = 0.45;

    let targetVel = 0;
    let actualCuttingForce = 0;
    const currentRpm = targetRpc * spindleOverride;

    // Cycle transitions only occur if Controller is Active
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
                if (zPos >= BOTTOM_Z) cycleState = 'RETRACT';
                break;
            case 'RETRACT':
                targetVel = -0.3; // Rapid retract (fixed speed usually)
                if (zPos <= RETRACT_Z) cycleState = 'RAPID_DOWN';
                break;
        }
    } else {
        // Feed Hold logic: Stop motion, maintain position
        targetVel = 0;
        if (cycleState === 'CUTTING') actualCuttingForce = 0; // Spindle still spinning but no feed
    }

    // --- 2. Kinematics (PI Controller for Motor) ---
    const Kp = 50.0; 
    const error = targetVel - zVel;
    const motorForce = error * Kp * mass; 

    // --- 3. Vibration & Sensor Model ---
    const extension = Math.max(0.1, zPos); 
    const effectiveStiffness = stiffness / extension; 
    const naturalFreq = (1 / (2 * Math.PI)) * Math.sqrt(effectiveStiffness / mass);
    const omega = 2 * Math.PI * (currentRpm / 60); // Hz
    
    // Unbalance (1x RPM)
    const unbalanceAmp = (currentRpm / 3000) * 10 * 0.000005; // Scaling factor
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

    const totalVibForce = F_unbalance + F_cutting_vib;
    const vibDisplacement = (totalVibForce / effectiveStiffness) + ((Math.random() - 0.5) * noiseLevel);
    
    const vibVelocity = vibDisplacement * omega;
    const vibAccel = vibVelocity * omega;

    // --- 4. Electrical Motor Load Simulation ---
    // Base load for spinning + Load from Cutting Force
    const baseLoad = (currentRpm / 3000) * 20; // 20% load just to spin
    const cuttingLoad = (actualCuttingForce / 500) * 60; // Up to 60% load from cutting
    const motorLoad = Math.min(100, Math.max(0, baseLoad + cuttingLoad + (Math.random()*2)));

    // --- 5. Temperature Simulation ---
    // Temp rises with Load, cools towards ambient (25C)
    const targetTemp = 25 + (motorLoad * 0.8);
    temperature += (targetTemp - temperature) * 0.001; // Slow thermal mass

    // --- 6. Integrate Macro Motion ---
    const netMacroForce = motorForce + (mass * 9.81) - (cycleState === 'CUTTING' ? actualCuttingForce : 0);
    zVel += (targetVel - zVel) * 0.1; 
    zPos += zVel * DT;

    t += DT;
    stateRef.current = { t, zPos, zVel, cycleState, temperature };

    return {
      timestamp: t,
      displacement: vibDisplacement,
      velocity: vibVelocity,
      acceleration: vibAccel,
      zPos: zPos,
      torque: (motorForce * SCREW_PITCH) / (2 * Math.PI),
      rpm: currentRpm + (Math.random() * 5), // Slight jitter in sensor reading
      motorLoad: motorLoad,
      temperature: temperature
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastChartUpdate = 0;

    const loop = (timestamp: number) => {
      // Always run physics loop to simulate idle vibrations
      const dataPoint = stepPhysics();

      if (timestamp - lastChartUpdate > 50) { // Update charts at 20Hz
        setSimulationState({
             isRunning: true,
             t: stateRef.current.t,
             zPos: stateRef.current.zPos,
             vibration: dataPoint.displacement,
             cycleState: stateRef.current.cycleState
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