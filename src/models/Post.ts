import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['consultas', 'seguimientos', 'noticias', 'general']
  },
  author: {
    type: String,
    required: true
  },
  votes: {
    type: Number,
    default: 0
  },
  comments: [{
    author: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Post || mongoose.model('Post', postSchema); 