'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getEnhancedContent } from '@/lib/content-sanitizer';
import { SafeImage } from './safe-image';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface EnhancedContentRendererProps {
  content: string;
  className?: string;
  allowImageFallback?: boolean;
}

/**
 * Enhanced content renderer that intelligently handles images and embeds
 * with special handling for Google Drive images and CORS issues
 */
export const EnhancedContentRenderer: React.FC<EnhancedContentRendererProps> = ({
  content,
  className,
  allowImageFallback = true
}) => {
  const [processedContent, setProcessedContent] = useState<string>('');
  const [problematicImages, setProblematicImages] = useState<Array<{ src: string; index: number }>>([]);

  useEffect(() => {
    if (!content) {
      setProcessedContent('');
      return;
    }

    let enhanced = getEnhancedContent(content).__html;
    const googleDriveImages: Array<{ src: string; index: number }> = [];

    // Find potentially problematic Google Drive images
    enhanced = enhanced.replace(/<img[^>]*>/gi, (match, offset) => {
      const srcMatch = match.match(/src=["']([^"']*)["']/i);
      if (srcMatch) {
        const src = srcMatch[1];
        if (src.includes('googleusercontent.com') || 
            (src.includes('drive.google.com') && src.includes('uc?'))) {
          
          // Track this as potentially problematic
          googleDriveImages.push({ src, index: googleDriveImages.length });
          
          // Replace with a placeholder that we can handle
          return `<div data-problematic-image="${googleDriveImages.length - 1}" data-image-src="${src}" class="problematic-image-placeholder"></div>`;
        }
      }
      return match;
    });

    setProcessedContent(enhanced);
    setProblematicImages(googleDriveImages);
  }, [content]);

  const handleImageRetry = (imageData: { src: string; index: number }) => {
    // Try to reload the image by updating the src
    const updatedContent = processedContent.replace(
      `<div data-problematic-image="${imageData.index}"`,
      `<img src="${imageData.src}" alt="Retried image" class="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"`
    );
    setProcessedContent(updatedContent);
  };

  // Custom component to render problematic image placeholders
  const renderProblematicImage = (imageData: { src: string; index: number }) => {
    const isGoogleDrive = imageData.src.includes('drive.google.com') || imageData.src.includes('googleusercontent.com');
    
    return (
      <div key={`problematic-${imageData.index}`} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50 text-amber-800 my-4">
        <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
        <p className="text-sm font-medium mb-2">Image temporarily unavailable</p>
        <p className="text-xs text-center mb-4 max-w-md">
          {isGoogleDrive 
            ? "This Google Drive image may have sharing restrictions. Please ensure the file is set to 'Anyone with the link can view' or try using a different image."
            : "This image is currently experiencing loading issues."
          }
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleImageRetry(imageData)}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
          {isGoogleDrive && (
            <Button 
              variant="outline" 
              size="sm"
              asChild
              className="text-xs"
            >
              <a href={imageData.src} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Original
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!content) {
    return null;
  }

  return (
    <div className={cn("enhanced-content-renderer", className)}>
      <div
        className="prose max-w-none prose-lg
          /* Enhanced image styles - handled by content sanitizer */
          [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:border [&_img]:border-gray-200
          /* Enhanced iframe styles */
          [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border [&_iframe]:shadow-sm [&_iframe]:min-h-[400px]
          [&_div[data-iframe-wrapper]]:w-full [&_div[data-iframe-wrapper]]:rounded-lg [&_div[data-iframe-wrapper]]:overflow-hidden [&_div[data-iframe-wrapper]]:shadow-sm [&_div[data-iframe-wrapper]]:border [&_div[data-iframe-wrapper]]:border-gray-200 [&_div[data-iframe-wrapper]]:min-h-[400px]
          [&_div[data-iframe-wrapper]_iframe]:w-full [&_div[data-iframe-wrapper]_iframe]:h-full [&_div[data-iframe-wrapper]_iframe]:border-0 [&_div[data-iframe-wrapper]_iframe]:min-h-[400px]
          /* Video styles */
          [&_video]:w-full [&_video]:rounded-lg
          /* Content styling */
          [&_.hidden]:hidden
          [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic
          [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
          [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded
          /* YouTube iframe responsive styles */
          [&_div[style*='padding-bottom']]:relative [&_div[style*='padding-bottom']]:w-full [&_div[style*='padding-bottom']]:rounded-lg [&_div[style*='padding-bottom']]:overflow-hidden [&_div[style*='padding-bottom']]:shadow-sm [&_div[style*='padding-bottom']]:border [&_div[style*='padding-bottom']]:border-gray-200
          [&_div[style*='padding-bottom']_iframe]:absolute [&_div[style*='padding-bottom']_iframe]:top-0 [&_div[style*='padding-bottom']_iframe]:left-0 [&_div[style*='padding-bottom']_iframe]:w-full [&_div[style*='padding-bottom']_iframe]:h-full [&_div[style*='padding-bottom']_iframe]:border-0
          /* Hide problematic image placeholders in HTML */
          [&_.problematic-image-placeholder]:hidden"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
      
      {/* Render problematic images as React components */}
      {allowImageFallback && problematicImages.map(renderProblematicImage)}
    </div>
  );
};

export default EnhancedContentRenderer;