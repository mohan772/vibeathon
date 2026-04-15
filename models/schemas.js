import mongoose from 'mongoose';

/**
 * Order Schema
 * Represents a customer order in the restaurant system
 */
const orderSchema = new mongoose.Schema(
  {
    items: {
      type: [
        {
          name: {
            type: String,
            required: true
          },
          quantity: {
            type: Number,
            required: true,
            min: 1
          },
          price: {
            type: Number,
            required: true,
            min: 0
          },
          specialRequests: {
            type: String,
            default: ''
          }
        }
      ],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'An order must have at least one item'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    tableNumber: {
      type: Number,
      min: 1
    },
    customerName: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    estimatedTime: {
      type: Number,
      description: 'Estimated preparation time in minutes'
    },
    actualTime: {
      type: Number,
      description: 'Actual time taken to complete order in minutes'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
orderSchema.index({ status: 1, priority: -1 });
orderSchema.index({ timestamp: -1 });

/**
 * Staff Schema
 * Represents restaurant staff members
 */
const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['chef', 'cook', 'waiter', 'manager', 'cashier', 'delivery'],
      required: true
    },
    email: {
      type: String,
      sparse: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      sparse: true
    },
    workload: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of current tasks/orders assigned'
    },
    maxWorkload: {
      type: Number,
      default: 10,
      description: 'Maximum tasks a staff member can handle'
    },
    availability: {
      type: String,
      enum: ['available', 'busy', 'break', 'off-duty', 'unavailable'],
      default: 'available'
    },
    shift: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: 'morning'
    },
    salary: {
      type: Number,
      min: 0
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    skills: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    performanceRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 3
    },
    ordersCompleted: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      description: 'Average time to complete order in minutes'
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
staffSchema.index({ role: 1, availability: 1 });
staffSchema.index({ isActive: 1 });

/**
 * Inventory Schema
 * Represents restaurant inventory/stock management
 */
const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['vegetable', 'meat', 'dairy', 'condiment', 'spice', 'beverage', 'other'],
      default: 'other'
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    unit: {
      type: String,
      enum: ['kg', 'liter', 'piece', 'dozen', 'gram', 'ml'],
      required: true
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
      description: 'Minimum quantity before reorder is needed'
    },
    reorderQuantity: {
      type: Number,
      min: 0,
      description: 'Quantity to order when stock falls below threshold'
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    supplier: {
      type: String,
      trim: true
    },
    expiryDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock', 'expired', 'damaged'],
      default: 'in-stock'
    },
    lastRestocked: {
      type: Date,
      default: Date.now
    },
    location: {
      type: String,
      description: 'Storage location in the kitchen'
    },
    isPerishable: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
inventorySchema.index({ status: 1 });
inventorySchema.index({ quantity: 1, threshold: 1 });
inventorySchema.index({ expiryDate: 1 });

// Pre-save middleware to update status based on quantity
inventorySchema.pre('save', function (next) {
  if (this.quantity === 0) {
    this.status = 'out-of-stock';
  } else if (this.quantity <= this.threshold) {
    this.status = 'low-stock';
  } else if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = 'expired';
  } else {
    this.status = 'in-stock';
  }
  next();
});

/**
 * AILog Schema
 * Logs all AI decisions and their inputs/outputs for tracking and analysis
 */
const aiLogSchema = new mongoose.Schema(
  {
    inputData: {
      orders: {
        type: Array,
        default: []
      },
      delayedOrders: {
        type: Array,
        default: []
      },
      staffAvailable: {
        type: Number,
        default: 0
      },
      overloadedStaff: {
        type: Array,
        default: []
      },
      inventoryIssues: {
        type: Array,
        default: []
      }
    },
    aiResponse: {
      immediateActions: {
        type: [String],
        default: []
      },
      problemFixes: {
        type: [String],
        default: []
      },
      prediction: {
        type: String,
        default: ''
      },
      businessInsights: {
        type: [String],
        default: []
      }
    },
    rawResponse: {
      type: String,
      description: 'Full raw response from AI model'
    },
    model: {
      type: String,
      default: 'gemini-pro'
    },
    executionTime: {
      type: Number,
      description: 'Time taken to generate decision in milliseconds'
    },
    success: {
      type: Boolean,
      default: true
    },
    error: {
      type: String,
      default: null
    },
    actionsTaken: {
      type: [
        {
          action: String,
          timestamp: {
            type: Date,
            default: Date.now
          },
          result: String
        }
      ],
      default: []
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: String,
      description: 'User who triggered the AI decision'
    },
    sessionId: {
      type: String,
      description: 'Session identifier for tracking related decisions'
    },
    impact: {
      type: String,
      enum: ['high', 'medium', 'low', 'neutral'],
      default: 'neutral',
      description: 'Business impact of the AI decision'
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
aiLogSchema.index({ timestamp: -1 });
aiLogSchema.index({ success: 1, timestamp: -1 });
aiLogSchema.index({ impact: 1 });
aiLogSchema.index({ sessionId: 1 });

// Create models
const Order = mongoose.model('Order', orderSchema);
const Staff = mongoose.model('Staff', staffSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const AILog = mongoose.model('AILog', aiLogSchema);

// Export schemas
export { orderSchema, staffSchema, inventorySchema, aiLogSchema };

// Export models
export { Order, Staff, Inventory, AILog };

export default {
  Order,
  Staff,
  Inventory,
  AILog
};
