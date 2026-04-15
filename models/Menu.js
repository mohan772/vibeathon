import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['starter', 'main_course', 'dessert', 'beverage'],
    default: 'main_course'
  },
  cookingTime: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  available: {
    type: Boolean,
    default: true
  }
});

const Menu = mongoose.model('Menu', menuSchema);
export default Menu;
