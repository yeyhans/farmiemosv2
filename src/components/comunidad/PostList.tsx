import React, { useState } from 'react';

interface Post {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  type: 'texto' | 'multimedia' | 'enlace' | 'encuesta';
  media_url: string;
  link_url: string | null;
  poll_question: string | null;
  poll_options: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface PostListProps {
  posts: Post[] | null;
}

function PostList({ posts = [] }: PostListProps) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postsData, setPostsData] = useState(posts);

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch('/api/comunidad/like-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLikedPosts(prev => 
          data.liked ? new Set([...prev, postId]) : 
          new Set([...prev].filter(id => id !== postId))
        );
        
        setPostsData(prev => 
          prev.map(post => 
            post.id === postId 
              ? { ...post, likes_count: data.likes_count }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error al dar like:', error);
    }
  };

  const renderPostContent = (post: Post) => {
    switch (post.type) {
      case 'texto':
        return (
          <div className="prose max-w-none">
            <p>{post.content}</p>
          </div>
        );

      case 'multimedia':
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={post.media_url}
              alt={post.title || 'Imagen'}
              className="w-full h-full object-cover"
            />
          </div>
        );

      case 'enlace':
        return (
          <div className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center text-blue-600">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {post.link_url}
            </div>
          </div>
        );

      case 'encuesta':
        return (
          <div className="space-y-3">
            <h3 className="font-medium">{post.poll_question}</h3>
            <div className="space-y-2">
              {post.poll_options?.split(',').map((option, index) => (
                <button
                  key={index}
                  className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {option.trim()}
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  if (!postsData || postsData.length === 0) {
    return <div className="text-center py-8">No hay publicaciones disponibles</div>;
  }

  return (
    <div className="space-y-6">
      {postsData.map((post) => (
        <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          {post.type === 'enlace' ? (
            <>
              {/* Encabezado del post */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {post.title || 'Sin título'}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Contenido del post - Para enlaces */}
              <div className="p-4">
                <a
                  href={post.link_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {renderPostContent(post)}
                </a>
              </div>
            </>
          ) : (
            <a href={`/comunidad/post/${post.id}`} className="block">
              {/* Encabezado del post */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold hover:text-green-600 transition-colors">
                    {post.title || 'Sin título'}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Contenido del post */}
              <div className="p-4">
                {renderPostContent(post)}
              </div>
            </a>
          )}

          {/* Footer del post */}
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleLike(post.id)}
                className={`flex items-center ${
                  likedPosts.has(post.id) ? 'text-green-600' : 'text-gray-600 hover:text-green-600'
                }`}
              >
                <svg className="w-5 h-5 mr-1" fill={likedPosts.has(post.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {post.likes_count}
              </button>
              <button className="flex items-center text-gray-600 hover:text-green-600">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.comments_count}
              </button>
            </div>
            <button className="text-gray-600 hover:text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default PostList;