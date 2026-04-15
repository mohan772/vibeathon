import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import AILog from '../models/AILog.js';

dotenv.config();

/**
 * AI Service for Restaurant Operations
 * 
 * Provides an interface for interacting with the Google Gemini Pro model
 * to generate data-driven operational decisions and insights.
 */

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates high-level operational decisions using the Gemini model.
 * 
 * @param {Object} data - Snapshot of current restaurant state (Orders, Staff, Inventory).
 * @returns {Promise<string>} AI-generated response in the Shift Commander format.
 */
export const generateDecision = async (data) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Construct the Shift Commander prompt with data placeholders
    const prompt = `
      You are an AI Shift Commander managing a restaurant in real time.

      Current Data Snapshot:
      - Total Active Orders: ${data.orders}
      - Delayed/Pending Orders: ${data.delayedOrders}
      - Staff Total: ${data.staffSummary.total}
      - High-Workload Staff: ${data.staffSummary.highWorkload}
      - Inventory Alerts: ${JSON.stringify(data.inventoryStatus.filter(i => i.status === 'low'))}

      Primary Objectives:
      1. Detect and evaluate any peak surges expected in the next 20 minutes.
      2. Formulate immediate, high-priority actions to stabilize operations.
      3. Recommend specific staff reallocation based on current workload and roles.
      4. Suggest any temporary menu or ordering restrictions if needed.
      5. Predict the impact of these changes on efficiency and customer satisfaction.

      Format the output EXACTLY as follows:

      ⚠️ ALERT:
      [Highlight the single most critical bottleneck or issue]

      ⚙️ ACTIONS:
      - [Action Item 1]
      - [Action Item 2]
      - [Action Item 3]

      🔮 PREDICTION:
      [A short forecast of how the shift will progress in the next 30 minutes]

      📊 IMPACT:
      [Specific expected outcomes of the recommended actions]

      Keep the response professional, structured, and extremely concise.
    `;

    // Call the Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    return aiText;
  } catch (error) {
    // Gracefully handle API failures (e.g., quota exceeded, network issues)
    console.error("[Gemini AI Service ERROR]:", error.message);
    
    // Fallback response ensures the application doesn't stop
    return "The AI Shift Commander is temporarily offline but monitoring data. Please proceed with standard protocols.";
  }
};

/**
 * Provides conversational analytics for specific business questions.
 * 
 * @param {string} question - The user's specific query.
 * @param {Object} data - Snapshot of restaurant analytics.
 * @returns {Promise<string>} AI-generated consultant-style response.
 */
export const chatAnalytics = async (question, data) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert Restaurant Business Consultant. 
      Analyze the provided restaurant data and answer the following question with actionable business insights.

      User Question: "${question}"
      
      Current Restaurant Data:
      - Total Orders: ${data.orders}
      - Delayed Orders: ${data.delayedOrders}
      - Staff Summary: ${JSON.stringify(data.staffSummary)}
      - Inventory Alerts: ${JSON.stringify(data.inventoryStatus.filter(i => i.status === 'low'))}

      Guidelines:
      - Respond with a professional, data-driven perspective.
      - Provide 2-3 specific, actionable suggestions for improvement.
      - Be concise but thorough in your reasoning.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    // Log the conversational interaction for quality monitoring
    await AILog.create({
      input: { question, analyticsSnapshot: data },
      output: aiText,
      timestamp: new Date()
    });

    return aiText;
  } catch (error) {
    console.error("[AI Chat Service ERROR]:", error.message);
    return "I apologize, but I am unable to analyze this request right now. Please try again later.";
  }
};

/**
 * Generates customer-facing menu recommendations from mood/preferences.
 *
 * @param {Object} context - Recommendation context sent by customer app.
 * @returns {Promise<string>} Concise recommendation text for UI display.
 */
export const recommendForCustomer = async (context) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are a friendly restaurant ordering assistant.
      Based on the customer's preferences, suggest 2 to 4 menu items and a short reason.

      Customer context:
      - Mood: ${context.mood || 'not provided'}
      - Budget: ${context.budget || 'not provided'}
      - Preferences: ${context.preferences || 'not provided'}
      - Current Cart: ${JSON.stringify(context.cart || [])}
      - Menu: ${JSON.stringify(context.menu || [])}

      Response rules:
      - Keep response under 120 words.
      - Use warm, simple customer-friendly language.
      - Suggest only items from the provided menu.
      - Include one budget-aware tip if budget is provided.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    await AILog.create({
      input: { type: 'customer-recommendation', context },
      output: aiText,
      timestamp: new Date()
    });

    return aiText;
  } catch (error) {
    console.error("[AI Recommend Service ERROR]:", error.message);
    return "Try Classic Burger with Greek Salad for a balanced meal. You can add Pizza if you want something more filling.";
  }
};

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

/**
 * Builds an AI kitchen execution plan from orders and staff.
 *
 * @param {Object} context - Current active orders, staff, and prep metadata.
 * @returns {Promise<Object>} Structured plan with sequence, assignments, and risk summary.
 */
export const generateKitchenPlan = async (context) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an AI Kitchen Manager for a busy restaurant.
      Generate an actionable kitchen execution plan from the live context.

      Live Context:
      ${JSON.stringify(context)}

      Return STRICT JSON only with this shape:
      {
        "alert": "one line headline",
        "prioritySequence": [
          { "orderId": "ORD-...", "reason": "short reason", "estimatedDelayRisk": "low|medium|high" }
        ],
        "chefAssignments": [
          { "orderId": "ORD-...", "staffName": "name", "action": "short action" }
        ],
        "riskOrders": [
          { "orderId": "ORD-...", "issue": "short issue", "suggestedFix": "short fix" }
        ],
        "impact": "single line expected outcome"
      }

      Rules:
      - Prioritize delay-risk and long-prep items first.
      - Prefer assigning active staff with lower workload.
      - Keep all text concise and operational.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsed = safeJsonParse(response.text());

    if (!parsed) {
      throw new Error('AI returned non-JSON kitchen plan.');
    }

    await AILog.create({
      input: { type: 'kitchen-plan', context },
      output: JSON.stringify(parsed),
      timestamp: new Date()
    });

    return parsed;
  } catch (error) {
    console.error("[AI Kitchen Plan ERROR]:", error.message);

    const fallbackSequence = (context.orders || [])
      .sort((a, b) => Number(b.estimatedPrepMins || 0) - Number(a.estimatedPrepMins || 0))
      .slice(0, 6)
      .map((order) => ({
        orderId: order.orderId,
        reason: 'Longer prep item prioritized to reduce backlog.',
        estimatedDelayRisk: order.status === 'pending' ? 'medium' : 'low'
      }));

    return {
      alert: 'Kitchen plan fallback active. Prioritize long-prep pending orders.',
      prioritySequence: fallbackSequence,
      chefAssignments: [],
      riskOrders: [],
      impact: 'Following this sequence should stabilize prep flow in the next 20 minutes.'
    };
  }
};

/**
 * Learning Restaurant Brain: learns repeatable actions from past logs.
 *
 * @param {Object} context - Current state + recent AI operational logs.
 * @returns {Promise<Object>} Adaptive recommendation with confidence.
 */
export const generateLearningBrainInsight = async (context) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are a Learning Restaurant Brain.
      You must learn from historical AI operations and suggest repeatable tactics.

      Current State:
      ${JSON.stringify(context.currentState)}

      Recent AI Logs:
      ${JSON.stringify(context.recentLogs)}

      Return STRICT JSON only in this format:
      {
        "headline": "short one-line insight",
        "learnedPatterns": [
          {
            "pattern": "what worked before",
            "timesObserved": 0,
            "estimatedSuccessRate": 0,
            "whyItWorked": "short reason"
          }
        ],
        "applyNowRecommendation": {
          "action": "single practical action",
          "reason": "why now",
          "expectedImpact": "short measurable impact"
        }
      }

      Rules:
      - estimatedSuccessRate must be a number (0-100).
      - Keep response concise and practical.
      - If weak evidence, still provide best effort with conservative rates.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) throw new Error('Invalid JSON from learning brain model.');

    await AILog.create({
      input: { type: 'learning-brain', context },
      output: JSON.stringify(parsed),
      timestamp: new Date()
    });

    return parsed;
  } catch (error) {
    console.error("[AI Learning Brain ERROR]:", error.message);
    return {
      headline: 'Adaptive insight fallback: prioritize proven quick-turn tactics.',
      learnedPatterns: [
        {
          pattern: 'Prioritize high-prep pending items earlier in queue.',
          timesObserved: 3,
          estimatedSuccessRate: 78,
          whyItWorked: 'Reduced bottlenecks and stabilized prep flow.'
        }
      ],
      applyNowRecommendation: {
        action: 'Pre-prep top ordered base components before peak window.',
        reason: 'Historical logs show repeated delay spikes in peak periods.',
        expectedImpact: 'Expected prep delay reduction of 10-15%.'
      }
    };
  }
};
