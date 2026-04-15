import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  }
});

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
