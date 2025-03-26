export interface Post {
  _id?: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  comments: Array<any>;
}

export interface Comment {
  _id?: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
} 