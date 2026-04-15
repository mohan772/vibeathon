import express from 'express';
import { generateDecision } from '../services/aiService.js';

const router = express.Router();

/**
 * POST /ai/decision
 * 
 * Generate autonomous restaurant operations decision using AI
 * 
 * Request body:
 * {
 *   "orders": [...],
 *   "delayed": [...],
 *   "staff": number,
 *   "overloaded": [...],
 *   "inventory": [...]
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "decision": {...},
 *   "generatedAt": string,
 *   "dataSnapshot": {...}
 * }
 */
router.post('/decision', async (req, res) => {
  try {
    // Extract input data from request body
    const { orders, delayed, staff, overloaded, inventory } = req.body;
    
    // Validate required fields
    const validation = validateDecisionInput({
      orders,
      delayed,
      staff,
      overloaded,
      inventory
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        receivedFields: {
          orders: Array.isArray(orders),
          delayed: Array.isArray(delayed),
          staff: typeof staff === 'number',
          overloaded: Array.isArray(overloaded),
          inventory: Array.isArray(inventory)
        }
      });
    }
    
    // Map request body to aiService data format
    const aiData = {
      orders: orders || [],
      delayedOrders: delayed || [],
      staffAvailable: staff || 0,
      overloadedStaff: overloaded || [],
      inventoryIssues: inventory || []
    };
    
    // Call AI service
    const decision = await generateDecision(aiData);
    
    // Check for AI service errors
    if (!decision.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate AI decision',
        details: decision.error
      });
    }
    
    // Return successful response
    res.status(200).json({
      success: true,
      data: decision.decision,
      metadata: {
        generatedAt: decision.generatedAt,
        dataSnapshot: decision.dataSnapshot,
        model: 'gemini-pro'
      }
    });
    
  } catch (error) {
    console.error('Error in /ai/decision route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /ai/status
 * 
 * Check AI service status and availability
 */
router.get('/status', (req, res) => {
  try {
    // Verify API key is configured
    const apiKeyConfigured = !!process.env.GOOGLE_GEMINI_API_KEY;
    
    res.status(200).json({
      success: true,
      status: 'operational',
      aiService: {
        model: 'gemini-pro',
        provider: 'Google Generative AI',
        apiKeyConfigured: apiKeyConfigured,
        ready: apiKeyConfigured
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check AI service status'
    });
  }
});

/**
 * POST /ai/test
 * 
 * Test endpoint with sample data
 */
router.post('/test', async (req, res) => {
  try {
    // Sample test data
    const testData = {
      orders: [
        { id: 1, items: ['burger', 'fries'], time: '5 min' },
        { id: 2, items: ['pizza'], time: '10 min' },
        { id: 3, items: ['pasta', 'salad'], time: '8 min' }
      ],
      delayedOrders: [
        { id: 4, items: ['steak'], delay: '15 min' }
      ],
      staffAvailable: 3,
      overloadedStaff: [
        { name: 'John', orders: 8 },
        { name: 'Sarah', orders: 7 }
      ],
      inventoryIssues: [
        { item: 'ribeye steak', status: 'low' },
        { item: 'fresh basil', status: 'out of stock' }
      ]
    };
    
    const decision = await generateDecision(testData);
    
    res.status(200).json({
      success: true,
      message: 'Test decision generated successfully',
      data: decision.decision,
      testDataUsed: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /ai/test route:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message
    });
  }
});

/**
 * Validate AI decision request input
 * 
 * @param {Object} input - Input data to validate
 * @returns {Object} Validation result
 */
const validateDecisionInput = (input) => {
  // Check for required fields (all are required)
  if (input.orders === undefined) {
    return { valid: false, error: 'Missing required field: orders (array)' };
  }
  if (input.delayed === undefined) {
    return { valid: false, error: 'Missing required field: delayed (array)' };
  }
  if (input.staff === undefined) {
    return { valid: false, error: 'Missing required field: staff (number)' };
  }
  if (input.overloaded === undefined) {
    return { valid: false, error: 'Missing required field: overloaded (array)' };
  }
  if (input.inventory === undefined) {
    return { valid: false, error: 'Missing required field: inventory (array)' };
  }
  
  // Validate field types
  if (!Array.isArray(input.orders)) {
    return { valid: false, error: 'Field "orders" must be an array' };
  }
  if (!Array.isArray(input.delayed)) {
    return { valid: false, error: 'Field "delayed" must be an array' };
  }
  if (typeof input.staff !== 'number') {
    return { valid: false, error: 'Field "staff" must be a number' };
  }
  if (!Array.isArray(input.overloaded)) {
    return { valid: false, error: 'Field "overloaded" must be an array' };
  }
  if (!Array.isArray(input.inventory)) {
    return { valid: false, error: 'Field "inventory" must be an array' };
  }
  
  // Validate staff number range
  if (input.staff < 0) {
    return { valid: false, error: 'Field "staff" must be a non-negative number' };
  }
  
  return { valid: true };
};

export default router;
