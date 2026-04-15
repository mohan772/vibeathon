import mongoose from 'mongoose';

const aiLogSchema = new mongoose.Schema({
  input: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  output: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const AILog = mongoose.model('AILog', aiLogSchema);
export default AILog;
