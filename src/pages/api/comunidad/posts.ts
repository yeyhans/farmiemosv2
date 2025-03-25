import type { APIRoute } from 'astro';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export const get: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const postId = url.searchParams.get('id');
    
    const { db } = await connectToDatabase();
    const collection = db.collection('posts');
    
    let query = {};
    
    // If a specific post ID is requested
    if (postId) {
      try {
        query = { _id: new ObjectId(postId) };
        const post = await collection.findOne(query);
        
        if (!post) {
          return new Response(
            JSON.stringify({ message: 'Post not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify(post),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ message: 'Invalid post ID' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If a category filter is applied
    if (category) {
      query = { category };
    }
    
    const posts = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    return new Response(
      JSON.stringify(posts),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    return new Response(
      JSON.stringify({ message: 'Failed to fetch posts' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const post: APIRoute = async ({ request }) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('posts');
    
    const data = await request.json();
    
    const { title, content, category, authorId, authorName } = data;
    
    if (!title || !content || !authorId) {
      return new Response(
        JSON.stringify({ message: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const newPost = {
      title,
      content,
      category: category || 'general',
      authorId,
      authorName,
      createdAt: new Date(),
      updatedAt: new Date(),
      votes: 0,
      comments: []
    };
    
    const result = await collection.insertOne(newPost);
    
    return new Response(
      JSON.stringify({ 
        message: 'Post created successfully', 
        postId: result.insertedId 
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return new Response(
      JSON.stringify({ message: 'Failed to create post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 