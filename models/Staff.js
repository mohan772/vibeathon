import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  workload: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  shiftStatus: {
    type: String,
    enum: ['off', 'on_break', 'active'],
    default: 'active'
  },
  assignedOrders: {
    type: Number,
    default: 0
  },
  skills: {
    type: [String],
    default: []
  }
});

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
