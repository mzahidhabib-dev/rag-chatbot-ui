import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isUploading, uploadProgress }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await onUpload(e.target.files[0]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={cn(
        "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors bg-surface/50",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-textSecondary/50",
        isUploading && "opacity-50 pointer-events-none"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleChange}
        accept=".pdf,.docx"
        className="hidden" 
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-text">Uploading and indexing...</p>
          <div className="w-48 h-2 bg-border rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <UploadCloud className="w-6 h-6 text-textSecondary" />
          </div>
          <h3 className="text-sm font-semibold text-text mb-1">Upload a document</h3>
          <p className="text-xs text-textSecondary max-w-xs">
            Drag and drop your PDF or DOCX file here, or click to browse. Maximum size 10MB.
          </p>
        </div>
      )}
    </div>
  );
};
