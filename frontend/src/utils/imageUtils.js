import React, { useState, useEffect } from 'react';

// Image utility to handle CORS and loading issues
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // For local uploads, construct the full URL
  const baseUrl = window.location.origin.includes('localhost:3000') 
    ? 'http://localhost:5000' 
    : window.location.origin;
  return `${baseUrl}${imagePath}`;
};

export const ImageWithFallback = ({ src, alt, className, fallback }) => {
  const [imageSrc, setImageSrc] = useState(getImageUrl(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImageSrc(getImageUrl(src));
    setHasError(false);
  }, [src]);

  const handleError = () => {
    console.warn(`Failed to load image: ${imageSrc}`);
    setHasError(true);
    
    // Try alternative API route if direct static serving fails
    if (imageSrc && imageSrc.includes('/uploads/') && !imageSrc.includes('/api/uploads/')) {
      const alternativeUrl = imageSrc.replace('/uploads/', '/api/uploads/');
      setImageSrc(alternativeUrl);
      setHasError(false);
    }
  };

  if (hasError || !imageSrc) {
    return fallback || (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">No image</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      crossOrigin="anonymous"
    />
  );
};
