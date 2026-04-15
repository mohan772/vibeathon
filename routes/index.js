import express from 'express';
import { chatAnalytics, analyzeRestaurantState } from '../services/aiService.js';
import { io } from '../server.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Restaurant API is running.' });
});

/**
 * AI Decision & Self-Healing Endpoint
 */
router.post('/ai/decision', async (req, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Data is required.' });
  }

  try {
    const response = await analyzeRestaurantState(data);
    
    // Broadcast the decision to all connected clients
    io.emit('ai-alert', { 
        message: 'New AI Decision Generated', 
        details: response,
        timestamp: new Date()
    });

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate AI decision.' });
  }
});

/**
 * Conversational AI Analytics Endpoint
 */
router.post('/ai/chat', async (req, res) => {
  const { question, data } = req.body;

  if (!question || !data) {
    return res.status(400).json({ error: 'Question and data are required.' });
  }

  try {
    const response = await chatAnalytics(question, data);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
});

export default router;
