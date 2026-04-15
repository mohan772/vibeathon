import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  workload: {
    type: Number,
    default: 0
  },
  availability: {
    type: Boolean,
    default: true
  }
});

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
