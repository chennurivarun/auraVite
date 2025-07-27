import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ 
  size = 'default', 
  text = 'Loading...', 
  className = '',
  fullScreen = false 
}) {
  const sizeMap = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeMap = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg',
    xl: 'text-xl'
  };

  const containerClass = fullScreen 
    ? 'flex h-screen w-full items-center justify-center bg-momentum-surface-1'
    : 'flex items-center justify-center p-4';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex items-center gap-3">
        <Loader2 className={`${sizeMap[size]} animate-spin text-blue-500`} />
        <span className={`${textSizeMap[size]} text-gray-600`}>{text}</span>
      </div>
    </div>
  );
}
