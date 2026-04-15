import express from 'express';
import { io } from '../server.js';

// Models
import Order from '../models/Order.js';
import Staff from '../models/Staff.js';
import Inventory from '../models/Inventory.js';
import Menu from '../models/Menu.js';
import AILog from '../models/AILog.js';

// Services
import { chatAnalytics, generateDecision, recommendForCustomer, generateKitchenPlan, generateLearningBrainInsight } from '../services/aiService.js';
import { runShiftCommander } from '../services/shiftCommander.js';
import { getRestaurantAnalytics } from '../services/restaurantService.js';

const router = express.Router();

const DEFAULT_ITEM_PRICE = 10;
const DEFAULT_MENU_ITEMS = [
  { name: 'Garlic Bread', category: 'starter', cookingTime: 8, price: 7, available: true, imageUrl: 'https://source.unsplash.com/featured/?garlic-bread' },
  { name: 'Tomato Soup', category: 'starter', cookingTime: 10, price: 6, available: true, imageUrl: 'https://source.unsplash.com/featured/?tomato-soup' },
  { name: 'Burger', category: 'main_course', cookingTime: 14, price: 12, available: true, imageUrl: 'https://source.unsplash.com/featured/?burger' },
  { name: 'Margherita Pizza', category: 'main_course', cookingTime: 18, price: 15, available: true, imageUrl: 'https://source.unsplash.com/featured/?margherita-pizza' },
  { name: 'Pasta Alfredo', category: 'main_course', cookingTime: 16, price: 14, available: true, imageUrl: 'https://source.unsplash.com/featured/?alfredo-pasta' },
  { name: 'Greek Salad', category: 'starter', cookingTime: 9, price: 10, available: true, imageUrl: 'https://source.unsplash.com/featured/?greek-salad' },
  { name: 'Chocolate Brownie', category: 'dessert', cookingTime: 6, price: 8, available: true, imageUrl: 'https://source.unsplash.com/featured/?chocolate-brownie' },
  { name: 'Ice Cream Sundae', category: 'dessert', cookingTime: 5, price: 7, available: true, imageUrl: 'https://source.unsplash.com/featured/?ice-cream-sundae' },
  { name: 'Cold Coffee', category: 'beverage', cookingTime: 4, price: 5, available: true, imageUrl: 'https://source.unsplash.com/featured/?cold-coffee' },
  { name: 'Fresh Lime Soda', category: 'beverage', cookingTime: 3, price: 4, available: true, imageUrl: 'https://source.unsplash.com/featured/?lime-soda' }
];

const calculateWorkload = (assignedOrders) => {
  if (assignedOrders >= 6) return 'high';
  if (assignedOrders >= 3) return 'medium';
  return 'low';
};

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const isValidPhone = (phone) => /^\d{10}$/.test(phone);

/**
 * Build a pricing summary for an array of item names.
 */
const buildOrderPricing = async (items) => {
  const menuItems = await Menu.find({ name: { $in: items } });
  const menuPriceMap = new Map(menuItems.map((item) => [item.name, item.price]));

  const billItems = items.map((itemName) => ({
    name: itemName,
    price: menuPriceMap.get(itemName) ?? DEFAULT_ITEM_PRICE
  }));

  const totalAmount = billItems.reduce((sum, item) => sum + item.price, 0);
  return { totalAmount, billItems };
};

const getLoyaltyStatus = async (phone) => {
  const normalizedPhone = normalizePhone(phone);
  if (!isValidPhone(normalizedPhone)) {
    return {
      paidOrdersSinceLastReward: 0,
      eligibleForFreeItem: false,
      ordersNeededForReward: 5
    };
  }

  const latestRewardOrder = await Order.findOne({
    'customer.phone': normalizedPhone,
    freeItemApplied: true
  }).sort({ createdAt: -1 });

  const query = { 'customer.phone': normalizedPhone, freeItemApplied: { $ne: true } };
  if (latestRewardOrder) {
    query.createdAt = { $gt: latestRewardOrder.createdAt };
  }

  const paidOrdersSinceLastReward = await Order.countDocuments(query);
  const eligibleForFreeItem = paidOrdersSinceLastReward >= 5;

  return {
    paidOrdersSinceLastReward,
    eligibleForFreeItem,
    ordersNeededForReward: eligibleForFreeItem ? 0 : 5 - paidOrdersSinceLastReward
  };
};

const formatOrderForCustomer = async (order) => {
  const { totalAmount, billItems } = await buildOrderPricing(order.items);
  return {
    orderId: order.orderId,
    customer: order.customer,
    status: order.status,
    createdAt: order.createdAt,
    items: billItems,
    totalAmount
  };
};

/**
 * Health Check & API Info
 */
router.get('/', (req, res) => {
  res.json({ message: 'Vibeathon Restaurant AI API v1.0.0 is operational.' });
});

// =========================================================================
// MENU MANAGEMENT
// =========================================================================

/**
 * Fetch the complete restaurant menu
 */
router.get('/menu', async (req, res) => {
  try {
    const menuItems = await Menu.find();
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve menu.', details: err.message });
  }
});

/**
 * Add a new item to the menu
 */
router.post('/menu', async (req, res) => {
  try {
    const newItem = new Menu(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create menu item.', details: err.message });
  }
});

/**
 * Update availability of a specific menu item.
 */
router.patch('/menu/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    if (typeof available !== 'boolean') {
      return res.status(400).json({ error: 'available must be a boolean value.' });
    }

    const updatedItem = await Menu.findByIdAndUpdate(
      req.params.id,
      { available },
      { new: true }
    );
    if (!updatedItem) return res.status(404).json({ error: 'Menu item not found.' });

    io.emit('menu-update', updatedItem);
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update menu availability.', details: err.message });
  }
});

/**
 * Seed default menu items with categories.
 */
router.post('/menu/seed-defaults', async (req, res) => {
  try {
    let inserted = 0;
    let updated = 0;

    for (const item of DEFAULT_MENU_ITEMS) {
      const existing = await Menu.findOne({ name: item.name });
      if (!existing) {
        await Menu.create(item);
        inserted += 1;
        continue;
      }

      const needsCategory = !existing.category;
      const needsImage = !existing.imageUrl;
      if (needsCategory || needsImage) {
        existing.category = item.category;
        if (needsImage) existing.imageUrl = item.imageUrl;
        await existing.save();
        updated += 1;
      }
    }

    res.json({
      message: 'Default menu seed completed.',
      inserted,
      updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed default menu.', details: err.message });
  }
});

// =========================================================================
// ORDER OPERATIONS
// =========================================================================

/**
 * Get all orders, sorted by newest first
 */
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve orders.', details: err.message });
  }
});

/**
 * Place a new customer order
 * Calculates total amount based on the current menu prices.
 */
router.post('/orders', async (req, res) => {
  try {
    const { customer, items, redeemFreeItem, freeItemName } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain an array of items.' });
    }
    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({
        error: 'Customer details are required. Please provide customer.name and customer.phone.'
      });
    }
    const normalizedPhone = normalizePhone(customer.phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number.' });
    }

    const { totalAmount, billItems } = await buildOrderPricing(items);
    const loyalty = await getLoyaltyStatus(normalizedPhone);

    let finalAmount = totalAmount;
    let discountAmount = 0;
    let freeItemApplied = false;
    let appliedFreeItemName = null;

    if (redeemFreeItem) {
      if (!loyalty.eligibleForFreeItem) {
        return res.status(400).json({
          error: `Not eligible for a free item yet. Complete ${loyalty.ordersNeededForReward} more paid order(s).`
        });
      }
      if (!freeItemName || !items.includes(freeItemName)) {
        return res.status(400).json({
          error: 'freeItemName is required and must exist in the current order items.'
        });
      }

      const freeItem = billItems.find((item) => item.name === freeItemName);
      discountAmount = freeItem ? freeItem.price : 0;
      finalAmount = Math.max(0, totalAmount - discountAmount);
      freeItemApplied = true;
      appliedFreeItemName = freeItemName;
    }

    const newOrder = new Order({
      orderId: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      customer: { ...customer, phone: normalizedPhone },
      items,
      totalAmount: finalAmount,
      status: 'pending',
      freeItemApplied,
      freeItemName: appliedFreeItemName,
      discountAmount
    });

    const savedOrder = await newOrder.save();
    
    // Broadcast the new order to the kitchen and admin displays via Socket.io
    io.emit('order-update', { type: 'new', order: savedOrder });

    const updatedLoyalty = await getLoyaltyStatus(normalizedPhone);

    res.status(201).json({
      message: freeItemApplied
        ? `Order created successfully. Free item applied: ${appliedFreeItemName}.`
        : 'Order created successfully.',
      order: savedOrder,
      loyalty: updatedLoyalty
    });
  } catch (err) {
    res.status(400).json({ error: 'Order placement failed.', details: err.message });
  }
});

/**
 * Check customer loyalty progress by phone.
 */
router.get('/loyalty/:phone', async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number.' });
    }
    const status = await getLoyaltyStatus(phone);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load loyalty status.', details: err.message });
  }
});

/**
 * Track order details by customer order id and phone number.
 */
router.get('/orders/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'phone query parameter is required.' });
    }

    const order = await Order.findOne({
      orderId,
      'customer.phone': phone
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found for provided details.' });
    }

    const customerOrder = await formatOrderForCustomer(order);
    res.json(customerOrder);
  } catch (err) {
    res.status(400).json({ error: 'Failed to track order.', details: err.message });
  }
});

/**
 * Get customer-friendly order details with bill breakdown.
 */
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const customerOrder = await formatOrderForCustomer(order);
    res.json(customerOrder);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch order.', details: err.message });
  }
});

/**
 * Customize an order by adding/removing items and recalculate bill.
 */
router.patch('/orders/:id/items', async (req, res) => {
  try {
    const { action, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array.' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: "action must be either 'add' or 'remove'." });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (action === 'add') {
      order.items.push(...items);
    } else {
      const itemsToRemove = [...items];
      order.items = order.items.filter((itemName) => {
        const index = itemsToRemove.indexOf(itemName);
        if (index === -1) return true;
        itemsToRemove.splice(index, 1);
        return false;
      });
    }

    const { totalAmount } = await buildOrderPricing(order.items);
    order.totalAmount = totalAmount;
    await order.save();

    io.emit('order-update', { type: 'update', order });

    const customerOrder = await formatOrderForCustomer(order);
    res.json({
      message: `Order items ${action === 'add' ? 'added' : 'removed'} successfully.`,
      order: customerOrder
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to customize order.', details: err.message });
  }
});

/**
 * Update order status or details
 */
router.patch('/orders/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found.' });

    io.emit('order-update', { type: 'update', order: updatedOrder });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: 'Update failed.', details: err.message });
  }
});

// =========================================================================
// STAFF & INVENTORY (DASHBOARD UPDATES)
// =========================================================================

/**
 * Get staff status
 */
router.get('/staff', async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Staff lookup failed.' });
  }
});

/**
 * Create a staff member for resource planning.
 */
router.post('/staff', async (req, res) => {
  try {
    const { name, role, shiftStatus, skills } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required.' });
    }

    const staffMember = await Staff.create({
      name,
      role,
      shiftStatus: shiftStatus || 'active',
      skills: Array.isArray(skills) ? skills : []
    });

    io.emit('staff-update', { type: 'create', staff: staffMember });
    res.status(201).json(staffMember);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create staff member.', details: err.message });
  }
});

/**
 * Update shift status and skills for staff resources.
 */
router.patch('/staff/:id', async (req, res) => {
  try {
    const { shiftStatus, skills, role } = req.body;
    const updateDoc = {};

    if (shiftStatus) updateDoc.shiftStatus = shiftStatus;
    if (role) updateDoc.role = role;
    if (Array.isArray(skills)) updateDoc.skills = skills;

    const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, updateDoc, { new: true });
    if (!updatedStaff) return res.status(404).json({ error: 'Staff member not found.' });

    io.emit('staff-update', { type: 'update', staff: updatedStaff });
    res.json(updatedStaff);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update staff member.', details: err.message });
  }
});

/**
 * Auto-assign pending and preparing orders across active staff.
 */
router.post('/staff/assign-orders', async (req, res) => {
  try {
    const activeStaff = await Staff.find({ shiftStatus: 'active' }).sort({ assignedOrders: 1 });
    if (activeStaff.length === 0) {
      return res.status(400).json({ error: 'No active staff available for assignment.' });
    }

    const activeOrders = await Order.find({ status: { $in: ['pending', 'preparing'] } });
    const assignments = [];

    // Reset counters before re-allocation
    for (const member of activeStaff) {
      member.assignedOrders = 0;
    }

    activeOrders.forEach((order, index) => {
      const staffIndex = index % activeStaff.length;
      activeStaff[staffIndex].assignedOrders += 1;
      assignments.push({
        orderId: order.orderId,
        staffName: activeStaff[staffIndex].name
      });
    });

    for (const member of activeStaff) {
      member.workload = calculateWorkload(member.assignedOrders);
      await member.save();
    }

    io.emit('staff-update', { type: 'assignment', assignments });
    res.json({
      message: 'Orders assigned to active staff successfully.',
      assignments,
      staff: activeStaff
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign orders.', details: err.message });
  }
});

/**
 * Update inventory levels
 */
router.post('/inventory', async (req, res) => {
  const { item, quantity, threshold } = req.body;
  try {
    const updatedItem = await Inventory.findOneAndUpdate(
      { item }, 
      { item, quantity, threshold }, 
      { new: true, upsert: true }
    );
    io.emit('inventory-update', updatedItem);
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ error: 'Inventory update failed.' });
  }
});

/**
 * Resource management overview (orders, inventory, staff utilization).
 */
router.get('/resources/overview', async (req, res) => {
  try {
    const [orders, staff, inventory] = await Promise.all([
      Order.find(),
      Staff.find(),
      Inventory.find()
    ]);

    const orderStats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      done: orders.filter((o) => o.status === 'done').length
    };

    const staffStats = {
      total: staff.length,
      active: staff.filter((s) => s.shiftStatus === 'active').length,
      onBreak: staff.filter((s) => s.shiftStatus === 'on_break').length,
      off: staff.filter((s) => s.shiftStatus === 'off').length,
      highWorkload: staff.filter((s) => s.workload === 'high').length
    };

    const lowStockItems = inventory.filter((item) => item.quantity <= item.threshold);

    res.json({
      orderStats,
      staffStats,
      lowStockCount: lowStockItems.length,
      lowStockItems
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build resource overview.', details: err.message });
  }
});

// =========================================================================
// AI & ANALYTICS (SHIFT COMMANDER)
// =========================================================================

/**
 * Trigger a manual Shift Commander analysis
 */
router.get('/shift/analysis', async (req, res) => {
  try {
    const result = await runShiftCommander();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Shift Commander analysis failed.' });
  }
});

/**
 * High-level AI decision generation for specialized triggers
 */
router.post('/ai/decision', async (req, res) => {
  try {
    const data = await getRestaurantAnalytics();
    const response = await generateDecision(data);

    // Persist manually triggered AI decisions
    await AILog.create({
      input: data,
      output: response,
      timestamp: new Date()
    });
    
    io.emit('ai-alert', { 
        message: 'Manual AI Analysis Generated', 
        details: response,
        timestamp: new Date()
    });

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Decision generation failed.' });
  }
});

/**
 * Conversational analytics for manager queries
 */
router.post('/ai/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  try {
    const data = await getRestaurantAnalytics();
    const response = await chatAnalytics(question, data);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Consultant service is unavailable.' });
  }
});

/**
 * Customer-facing menu recommendations by mood/preferences.
 */
router.post('/ai/recommend', async (req, res) => {
  try {
    const { mood, budget, preferences, cart } = req.body;
    const menuItems = await Menu.find({ available: true }).select('name price');

    const recommendation = await recommendForCustomer({
      mood,
      budget,
      preferences,
      cart: Array.isArray(cart) ? cart : [],
      menu: menuItems
    });

    res.json({ recommendation });
  } catch (error) {
    res.status(500).json({ error: 'Recommendation service is unavailable.' });
  }
});

/**
 * Dynamic customer recommendation from live kitchen load.
 */
router.get('/ai/dynamic-recommendations', async (req, res) => {
  try {
    const [menuItems, activeOrders] = await Promise.all([
      Menu.find({ available: true }).select('name cookingTime category'),
      Order.find({ status: { $in: ['pending', 'preparing'] } }).select('items status')
    ]);

    if (menuItems.length === 0) {
      return res.json({
        recommendedNow: null,
        avoidNow: null,
        reason: 'No available menu items found.',
        kitchenLoadSummary: { activeOrders: activeOrders.length, overloadedItemCount: 0 }
      });
    }

    const itemLoadMap = new Map(menuItems.map((item) => [item.name, 0]));
    activeOrders.forEach((order) => {
      (order.items || []).forEach((itemName) => {
        if (itemLoadMap.has(itemName)) {
          itemLoadMap.set(itemName, itemLoadMap.get(itemName) + 1);
        }
      });
    });

    const scored = menuItems.map((item) => {
      const load = itemLoadMap.get(item.name) || 0;
      const cookingTime = Number(item.cookingTime || 10);
      const score = cookingTime + (load * 6);
      return { name: item.name, cookingTime, load, score };
    });

    scored.sort((a, b) => a.score - b.score);
    const recommendedNow = scored[0];
    const avoidNow = [...scored].sort((a, b) => b.score - a.score)[0];

    const reason = avoidNow.load > 0
      ? `Kitchen load is high for ${avoidNow.name}. ${recommendedNow.name} is faster with lower current station pressure.`
      : `${recommendedNow.name} currently has the lowest prep-time risk.`;

    res.json({
      recommendedNow: {
        name: recommendedNow.name,
        reason: `Estimated prep ${recommendedNow.cookingTime} mins, load factor ${recommendedNow.load}`
      },
      avoidNow: {
        name: avoidNow.name,
        reason: `Estimated prep ${avoidNow.cookingTime} mins, load factor ${avoidNow.load}`
      },
      reason,
      kitchenLoadSummary: {
        activeOrders: activeOrders.length,
        overloadedItemCount: scored.filter((item) => item.load >= 3).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate dynamic recommendations.', details: error.message });
  }
});

/**
 * AI Kitchen Manager: generate cooking sequence and assignment plan.
 */
router.post('/ai/kitchen-plan', async (req, res) => {
  try {
    const [activeOrders, activeStaff, menu] = await Promise.all([
      Order.find({ status: { $in: ['pending', 'preparing'] } }),
      Staff.find({ shiftStatus: 'active' }),
      Menu.find().select('name cookingTime')
    ]);

    const prepMap = new Map(menu.map((item) => [item.name, Number(item.cookingTime || 10)]));
    const ordersContext = activeOrders.map((order) => {
      const estimatedPrepMins = (order.items || []).reduce(
        (sum, itemName) => sum + (prepMap.get(itemName) || 10),
        0
      );
      return {
        orderId: order.orderId,
        status: order.status,
        itemCount: (order.items || []).length,
        items: order.items || [],
        estimatedPrepMins,
        createdAt: order.createdAt
      };
    });

    const staffContext = activeStaff.map((member) => ({
      name: member.name,
      role: member.role,
      workload: member.workload,
      assignedOrders: member.assignedOrders || 0,
      skills: member.skills || []
    }));

    const plan = await generateKitchenPlan({
      generatedAt: new Date().toISOString(),
      orders: ordersContext,
      staff: staffContext
    });

    io.emit('kitchen-plan', plan);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate kitchen plan.', details: error.message });
  }
});

/**
 * Learning Restaurant Brain: adaptive recommendation from history.
 */
router.get('/ai/learning-brain', async (req, res) => {
  try {
    const [currentState, recentLogs] = await Promise.all([
      getRestaurantAnalytics(),
      AILog.find().sort({ timestamp: -1 }).limit(20).select('input output timestamp')
    ]);

    const insight = await generateLearningBrainInsight({
      currentState,
      recentLogs
    });

    io.emit('learning-brain', insight);
    res.json(insight);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate learning brain insight.', details: error.message });
  }
});

export default router;
