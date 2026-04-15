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
