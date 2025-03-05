import React, { useState, useRef } from 'react';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

interface DocumentUploaderProps {
  onDocumentUploaded: (newDocument: any) => void;
  userId: string | number;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentUploaded, userId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !title) {
      setUploadState({
        ...uploadState,
        error: 'Please provide a title and file',
        success: false
      });
      return;
    }
    
    // Verificar tamaño del archivo (10MB como ejemplo)
    if (file.size > 10 * 1024 * 1024) {
      setUploadState({
        ...uploadState,
        error: 'File size exceeds the 10MB limit',
        success: false
      });
      return;
    }
    
    setUploadState({
      isUploading: true,
      progress: 10,
      error: null,
      success: false
    });
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('document', file);
      formData.append('userId', userId.toString());
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 300);
      
      const response = await fetch('/api/docs/upload-docs', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Upload error details:', result);
        throw new Error(result.error || 'Failed to upload document');
      }
      
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true
      });
      
      // Call the callback function instead of dispatching an event
      if (result.document && typeof onDocumentUploaded === 'function') {
        onDocumentUploaded(result.document);
      }
      
      // Reset form after successful upload
      setTimeout(resetForm, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      });
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Document Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="document" className="block text-sm font-medium text-gray-700">
            Document File *
          </label>
          <input
            type="file"
            id="document"
            ref={fileInputRef}
            onChange={handleFileChange}
            required
            className="mt-1 block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100"
          />
          {file && (
            <p className="mt-1 text-sm text-gray-500">
              Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
        
        {uploadState.isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        )}
        
        {uploadState.error && (
          <div className="text-red-500 text-sm">
            Error: {uploadState.error}
          </div>
        )}
        
        {uploadState.success && (
          <div className="text-green-500 text-sm">
            Document uploaded successfully!
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            type="submit"
            disabled={uploadState.isUploading}
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                      ${uploadState.isUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {uploadState.isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
          
          {!uploadState.isUploading && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DocumentUploader; 