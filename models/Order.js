import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  items: {
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'completed', 'delivered'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
