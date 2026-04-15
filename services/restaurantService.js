import Order from '../models/Order.js';
import Staff from '../models/Staff.js';
import Inventory from '../models/Inventory.js';

/**
 * Collects and structures live data from all restaurant collections
 */
export const getRestaurantAnalytics = async () => {
  try {
    const [orders, staff, inventory] = await Promise.all([
      Order.find(),
      Staff.find(),
      Inventory.find()
    ]);

    // Calculate Delayed Orders (e.g., pending for more than 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const delayedOrders = orders.filter(o => 
      o.status === 'pending' && o.createdAt < fifteenMinsAgo
    );

    // Create Staff Summary
    const staffSummary = {
      total: staff.length,
      highWorkload: staff.filter(s => s.workload === 'high').length,
      roles: staff.reduce((acc, s) => {
        acc[s.role] = (acc[s.role] || 0) + 1;
        return acc;
      }, {})
    };

    // Create Inventory Status
    const inventoryStatus = inventory.map(item => ({
      item: item.item,
      status: item.quantity <= item.threshold ? 'low' : 'ok',
      quantity: item.quantity
    }));

    return {
      orders: orders.length,
      delayedOrders: delayedOrders.length,
      staffSummary,
      inventoryStatus
    };
  } catch (error) {
    console.error("Error collecting restaurant data:", error);
    throw new Error("Failed to aggregate restaurant data.");
  }
};
