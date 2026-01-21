// Physics Parameters for the Digital Twin (Mass-Spring-Damper system)
export interface PhysicsParams {
  mass: number;       // kg (Spindle Head)
  stiffness: number;  // N/m (k) - Axial stiffness of ball screw
  damping: number;    // Ns/m (c)
  baseForce: number;  // N (Base material resistance)
  noiseLevel: number; // Simulated sensor noise
  frequency: number;  // Hz
  force: number;      // N
}

// State from the CNC Controller
export interface ControllerState {
  isCycleActive: boolean;
  feedOverride: number;   // 0 to 1.5 (150%)
  spindleOverride: number;// 0 to 1.5 (150%)
  targetRpc: number;      // Base RPM setpoint
  activeGCodeLine: number;
  coolantActive: boolean; // NEW: M08/M09 status
}

// Data point for charts
export interface TelemetryPoint {
  timestamp: number;
  displacement: number; // Vibration displacement (micro-motion)
  velocity: number;     // Vibration velocity
  acceleration: number; // Vibration acceleration
  zPos: number;        // Macro position of axis (m)
  torque: number;      // Motor torque (Nm)
  rpm: number;         // Actual RPM
  motorLoad: number;   // % Load
  temperature: number; // Celsius
  viscosity: number;   // cSt (Centistokes) - Oil viscosity
}

// Historical Trend Data
export interface TrendRecord {
  time: number;
  rmsVelocity: number;
}

// Aggregated stats for AI analysis
export interface AssetHealthStats {
  rmsDisplacement: number;
  peakVelocity: number;
  rmsAcceleration: number;
  dominantFrequency: number;
  avgLoad: number;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
}

export interface SimulationState {
  isRunning: boolean;
  t: number;
  zPos: number; // Macro Position (0 = Top, 0.4 = Bottom/Workpiece)
  vibration: number; // Micro displacement
  cycleState: 'IDLE' | 'RAPID_DOWN' | 'CUTTING' | 'RETRACT';
  wear: number; // 0.0 to 1.0 representing tool/bearing degradation
  sensorHealth: number; // 0 to 100% (Accelerometer Health)
  sensorStatus: 'OK' | 'WARNING' | 'CRITICAL' | 'FAILED';
}

export interface MaintenanceInsight {
  diagnosis: string;
  severity: string;
  recommendation: string;
  confidence: number;
}

export interface CycleReport {
  timestamp: number;
  duration: number;
  maxTemp: number;
  maxVibration: number;
  avgLoad: number;
  toolWearDelta: number;
  finalStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
}