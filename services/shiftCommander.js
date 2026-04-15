import AILog from '../models/AILog.js';
import { generateDecision } from './aiService.js';
import { getRestaurantAnalytics } from './restaurantService.js';

/**
 * Shift Commander Service
 * 
 * This service acts as the 'brain' of the restaurant operations.
 * It periodically:
 * 1. Gathers real-time analytics from across the system (Orders, Staff, Inventory).
 * 2. Processes this data to provide a snapshot of the current state.
 * 3. Consults the AI (Gemini) to generate high-level operational decisions.
 * 4. Logs the AI's response for historical tracking and auditing.
 * 
 * @returns {Object} The complete result of the shift analysis, including the AI's decision.
 */
export const runShiftCommander = async () => {
  try {
    console.log('--- [Shift Commander] Starting Analysis ---');

    // 1. Gather all operational metrics using the restaurant analytics service
    const currentState = await getRestaurantAnalytics();

    // 2. Request an operational decision from the AI
    // The AI prompt is structured to detect surges, suggest reallocations, and predict impact.
    const aiDecision = await generateDecision(currentState);

    // 3. Persist the analysis for future review
    // We store both the input snapshot and the output decision.
    await AILog.create({
      input: currentState,
      output: aiDecision,
      timestamp: new Date()
    });

    // 4. Detailed console logging for visibility in the terminal
    console.log('--- [Shift Commander] AI Operational Guidance ---');
    console.log(aiDecision);
    console.log('------------------------------------------------');

    return {
      success: true,
      timestamp: new Date(),
      data: currentState,
      aiDecision
    };

  } catch (error) {
    // Robust error handling: capture the failure and ensure the system doesn't crash.
    console.error('[Shift Commander ERROR]:', error.message);
    
    // We return a structured error response that can be handled by the UI or calling function.
    return {
      success: false,
      error: 'Shift Commander failed to complete analysis.',
      details: error.message
    };
  }
};
