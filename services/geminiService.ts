import { GoogleGenAI, Type } from "@google/genai";
import { PhysicsParams, AssetHealthStats, MaintenanceInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeVibrationData = async (
  stats: AssetHealthStats,
  params: PhysicsParams
): Promise<MaintenanceInsight> => {
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    You are an expert CNC Machinery Diagnostics Engineer.
    Analyze the following vibration telemetry from a Vertical Machining Center (VMC) spindle unit.
    The Digital Twin simulates a 1-DOF model of the spindle head assembly relative to the machine frame.
    
    Machine Parameters:
    - Spindle Assembly Mass: ${params.mass} kg
    - Structural Rigidity (Stiffness): ${params.stiffness} N/m
    - Damping Coefficient: ${params.damping} Ns/m
    - Spindle Speed: ${(params.frequency * 60).toFixed(0)} RPM (${params.frequency} Hz)
    
    Telemetry (Vibration Analysis):
    - RMS Displacement: ${(stats.rmsDisplacement * 1000).toFixed(3)} mm
    - Peak Velocity: ${(stats.peakVelocity * 1000).toFixed(2)} mm/s
    - RMS Acceleration: ${stats.rmsAcceleration.toFixed(2)} m/s²
    - Calculated Status: ${stats.status}

    Task:
    1. Diagnose the specific CNC fault. Consider:
       - Unbalance (1x RPM dominance, high displacement).
       - Looseness (Harmonics, low stiffness behavior).
       - Regenerative Chatter (Self-excited vibration, near natural frequency).
       - Bearing Wear (High frequency noise/acceleration).
       - Resonance (Operating speed near natural frequency).
    2. Assess severity (Low/Medium/High/Critical).
    3. Recommend maintenance actions (e.g., "Balance spindle", "Check drawbar tension", "Adjust gibs", "Reduce depth of cut").
    4. Provide confidence score (0-100).
    
    Context:
    - Natural Frequency is approx: ${(1 / (2 * Math.PI) * Math.sqrt(params.stiffness / params.mass)).toFixed(1)} Hz.
    - If Spindle Speed is close to Natural Frequency, it is Resonance.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
            recommendation: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["diagnosis", "severity", "recommendation", "confidence"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as MaintenanceInsight;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      diagnosis: "Diagnostics Unavailable",
      severity: "Unknown",
      recommendation: "Check sensor connectivity and API keys.",
      confidence: 0
    };
  }
};
