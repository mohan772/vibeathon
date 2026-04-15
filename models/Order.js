import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  items: {
    type: [String],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  freeItemApplied: {
    type: Boolean,
    default: false
  },
  freeItemName: {
    type: String
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'done'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
