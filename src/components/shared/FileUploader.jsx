import React, { useState } from 'react';
import { Upload, File as FileIcon, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function FileUploader({ onUpload, uploadedFile, fileTypeLabel, description }) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file) => {
    if (file) {
      setLoading(true);
      try {
        await onUpload(file);
      } catch (error) {
        console.error("Upload failed", error);
        alert(`Upload failed for ${file.name}.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium mb-2">{fileTypeLabel}</label>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      
      {uploadedFile ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800 truncate">{uploadedFile.name}</span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id={`file-upload-${fileTypeLabel}`}
            accept="image/*,application/pdf"
            disabled={loading}
          />
          {loading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <label htmlFor={`file-upload-${fileTypeLabel}`} className="cursor-pointer">
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-gray-400 mb-4" />
                <p className="font-semibold text-gray-700">
                  {dragActive ? 'Drop the file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG accepted</p>
              </div>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
