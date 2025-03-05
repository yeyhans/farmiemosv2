import React from 'react';
import { supabase } from '../../lib/supabase';

interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  user_id: string;
}

interface DocumentViewerProps {
  documents: Document[];
  supabaseUrl: string;
}

const DocumentViewer = ({ documents, supabaseUrl }: DocumentViewerProps) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('text')) return '📃';
    return '📁';
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
      
      {documents.length === 0 ? (
        <p className="text-gray-500 italic">No documents have been uploaded yet.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <a 
              key={doc.id}
              href={`/docs/${doc.id}`}
              className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer bg-white block"
            >
              <div className="flex items-start">
                <div className="text-3xl mr-3">{getDocumentIcon(doc.file_type)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg truncate">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Size: {formatFileSize(doc.file_size)}</p>
                    <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentViewer; 