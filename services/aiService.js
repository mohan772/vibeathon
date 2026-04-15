import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AI Service for Restaurant Decision System with Self-Healing Logic
 */
export const analyzeRestaurantState = async (data) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze the following restaurant state and provide self-healing actions.
    
    Data:
    - Orders: ${JSON.stringify(data.orders)}
    - Staff: ${JSON.stringify(data.staff)}
    - Inventory: ${JSON.stringify(data.inventory)}

    Identify issues such as:
    1. Delays (orders pending for too long)
    2. Staff overload (high workload per staff member)
    3. Inventory shortage (quantity below threshold)

    For each detected problem, generate:
    - AI Fix (reassign staff, redirect orders, or suggest substitutions)
    - Expected Outcome

    Output format for each issue:
    Problem detected: [Description]
    AI Fix: [Specific Action]
    Expected outcome: [Result of action]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Error generating AI decision.";
  }
};

/**
 * Conversational AI for Restaurant Analytics
 */
export const chatAnalytics = async (question, data) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    You are an expert Restaurant Business Consultant. 
    Analyze the provided restaurant data and answer the user's question with actionable insights.

    User Question: "${question}"
    
    Restaurant Data:
    - Orders: ${JSON.stringify(data.orders)}
    - Staff: ${JSON.stringify(data.staff)}
    - Inventory: ${JSON.stringify(data.inventory)}

    Response Requirements:
    - Answer like a professional business consultant.
    - Explain the "why" behind your observations.
    - Provide 2-3 specific, actionable suggestions.
    - Be concise but thorough.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm sorry, I encountered an error while analyzing your request.";
  }
};
