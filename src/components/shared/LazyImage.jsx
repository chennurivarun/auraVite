import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ImageIcon } from 'lucide-react';

export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  fallback = null,
  placeholder = null,
  onLoad = () => {},
  onError = () => {}
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoading(false);
    onLoad();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError();
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!inView && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder || <ImageIcon className="w-8 h-8 text-gray-400" />}
        </div>
      )}
      
      {inView && (
        <>
          {loading && (
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-500">
              {fallback || (
                <>
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">Failed to load</span>
                </>
              )}
            </div>
          )}
          
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-opacity duration-300 ${
              loading ? 'opacity-0' : 'opacity-100'
            } ${error ? 'hidden' : ''} w-full h-full object-cover`}
          />
        </>
      )}
    </div>
  );
}