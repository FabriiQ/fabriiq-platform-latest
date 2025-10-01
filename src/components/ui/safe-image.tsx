'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, AlertTriangle } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  className?: string;
  onError?: () => void;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackText,
  className,
  onError,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    onError?.();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Check if this is a Google Drive link that needs conversion
  const getSafeSrc = (originalSrc: string) => {
    try {
      // Convert Google Drive share links to direct download links
      if (originalSrc.includes('drive.google.com/file/d/')) {
        const fileId = originalSrc.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (fileId) {
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
      }
      
      // Convert Google Drive open links
      if (originalSrc.includes('drive.google.com/open?id=')) {
        const fileId = originalSrc.match(/id=([a-zA-Z0-9-_]+)/)?.[1];
        if (fileId) {
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
      }

      return originalSrc;
    } catch (error) {
      console.error('Error processing image src:', error);
      return originalSrc;
    }
  };

  const safeSrc = getSafeSrc(src);
  const isGoogleDriveImage = src.includes('drive.google.com') || src.includes('googleusercontent.com');

  if (imageError) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-500",
        className
      )}>
        <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
        <p className="text-sm font-medium">Failed to load image</p>
        {fallbackText && (
          <p className="text-xs text-gray-400 mt-1 text-center">{fallbackText}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {alt || 'Image'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg animate-pulse">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      <img
        {...props}
        src={safeSrc}
        alt={alt}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={cn(
          "max-w-full h-auto rounded-lg shadow-sm border border-gray-200",
          !imageLoaded && "opacity-0",
          className
        )}
        // Only add CORS attributes for non-Google Drive images to avoid CORS errors
        {...(!isGoogleDriveImage && {
          referrerPolicy: "no-referrer" as const,
          crossOrigin: "anonymous" as const
        })}
      />
    </div>
  );
};

export default SafeImage;