import { useState, useEffect } from 'react';

function PostList({ category = '' }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = category 
        ? `/api/comunidad/posts?category=${category}`
        : '/api/comunidad/posts';
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    
    // Listen for new posts created
    const handlePostCreated = () => fetchPosts();
    window.addEventListener('post-created', handlePostCreated);
    
    return () => {
      window.removeEventListener('post-created', handlePostCreated);
    };
  }, [category]);

  if (loading) {
    return <div className="text-center py-8">Cargando publicaciones...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        No hay publicaciones disponibles. ¡Sé el primero en publicar!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <a href={`/comunidad/post/${post._id}`} className="block">
            <h3 className="text-lg font-semibold mb-2 hover:text-blue-600">{post.title}</h3>
          </a>
          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{post.content}</p>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center">
              <a href={`/comunidad/farmers/${post.authorId}`} className="text-blue-600 hover:underline">
                {post.authorName}
              </a>
              <span className="mx-2">·</span>
            </div>
            <span className="text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PostList;