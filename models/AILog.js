import mongoose from 'mongoose';

const aiLogSchema = new mongoose.Schema({
  inputData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  aiResponse: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const AILog = mongoose.model('AILog', aiLogSchema);
export default AILog;
