import React, { useState } from 'react';

interface PostFooterProps {
  postId: string;
  initialLikesCount: number;
  commentsCount: number;
  initialIsLiked?: boolean;
}

function PostFooter({ postId, initialLikesCount, commentsCount, initialIsLiked = false }: PostFooterProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);

  const handleLike = async () => {
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
        setIsLiked(data.liked);
        setLikesCount(data.likes_count);
      }
    } catch (error) {
      console.error('Error al dar like:', error);
    }
  };

  return (
    <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button 
          onClick={handleLike}
          className={`flex items-center ${
            isLiked ? 'text-green-600' : 'text-gray-600 hover:text-green-600'
          }`}
        >
          <svg className="w-5 h-5 mr-1" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {likesCount}
        </button>
        <button className="flex items-center text-gray-600 hover:text-green-600">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {commentsCount}
        </button>
      </div>
      <button className="text-gray-600 hover:text-green-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
    </div>
  );
}

export default PostFooter; 