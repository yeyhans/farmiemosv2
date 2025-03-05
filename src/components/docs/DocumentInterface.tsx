import { useState, useEffect } from 'react';
import DocumentUploader from './DocumentUploader';
import DocumentViewer from './DocumentViewer';

interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  user_id: string;
  url?: string;
}

interface DocumentInterfaceProps {
  documents: Document[];
  userId: string | number;
  supabaseUrl?: string;
}

export default function DocumentInterface({ 
  documents: initialDocuments, 
  userId, 
  supabaseUrl 
}: DocumentInterfaceProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset error when documents change
  useEffect(() => {
    if (error) setError(null);
  }, [documents]);
  
  // This function will be passed to DocumentUploader to update documents list after upload
  const onDocumentUploaded = (newDocument: Document) => {
    setDocuments(prevDocuments => [newDocument, ...prevDocuments]);
    setError(null);
  };
  
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
        <DocumentUploader 
          onDocumentUploaded={onDocumentUploaded} 
          userId={userId} 
          onError={handleError}
        />
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Document Viewer Component */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-gray-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents found. Upload your first document above.</p>
          </div>
        ) : (
          <DocumentViewer 
            documents={documents} 
            supabaseUrl={supabaseUrl} 
            onError={handleError}
            setIsLoading={setIsLoading}
          />
        )}
      </div>
    </div>
  );
} 