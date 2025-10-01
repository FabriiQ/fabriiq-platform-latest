/**
 * Content sanitization and enhancement utilities
 * Handles adding proper CORS, loading, and security attributes to HTML content
 */

/**
 * Enhanced image attributes for better loading and security
 */
const ENHANCED_IMAGE_ATTRS = {
  loading: 'eager',
  crossorigin: 'anonymous',
  referrerpolicy: 'no-referrer',
  style: 'max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid rgb(229, 231, 235);'
};

/**
 * Enhanced image attributes for Google Drive images (without CORS attributes)
 */
const GOOGLE_DRIVE_IMAGE_ATTRS = {
  loading: 'eager',
  style: 'max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid rgb(229, 231, 235);'
};

/**
 * Enhanced iframe attributes for better security and functionality
 */
const ENHANCED_IFRAME_ATTRS = {
  loading: 'lazy',
  referrerpolicy: 'no-referrer-when-downgrade',
  sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation',
  style: 'width: 100%; border-radius: 8px; border: 1px solid rgb(229, 231, 235); box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);'
};

/**
 * Convert Google Drive share URLs to direct view URLs
 */
export function convertGoogleDriveUrl(url: string): string {
  try {
    // Handle /file/d/ format
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Handle already converted URLs
    if (url.includes('drive.google.com/uc?')) {
      return url;
    }

    // Handle ?id= format
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch && url.includes('drive.google.com')) {
      const fileId = idMatch[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Handle googleusercontent.com URLs - these are often problematic
    // For CORS issues, we might need to proxy or use a different approach
    if (url.includes('googleusercontent.com') || url.includes('lh3.googleusercontent.com')) {
      console.warn('Detected Google Drive image with potential CORS issues:', url);
      // For now, return the URL as-is but with appropriate CORS attributes
      // In production, consider using a proxy server or asking users to use public sharing
      return url;
    }

    return url;
  } catch (error) {
    console.error('Error converting Google Drive URL:', error);
    return url;
  }
}

/**
 * Add or update attributes on an HTML element string
 */
function addAttributesToElement(elementString: string, attributes: Record<string, string>): string {
  let result = elementString;
  
  Object.entries(attributes).forEach(([attr, value]) => {
    const attrRegex = new RegExp(`\\s${attr}=["'][^"']*["']`, 'gi');
    
    if (attrRegex.test(result)) {
      // Update existing attribute
      result = result.replace(attrRegex, ` ${attr}="${value}"`);
    } else {
      // Add new attribute before the closing >
      result = result.replace(/(\s*)>/, ` ${attr}="${value}"$1>`);
    }
  });
  
  return result;
}

/**
 * Enhance image elements in HTML content
 */
export function enhanceImageElements(html: string): string {
  return html.replace(/<img[^>]*>/gi, (match) => {
    let enhancedImg = match;
    let isGoogleDriveImage = false;
    
    // Extract and convert src if it's a Google Drive URL
    const srcMatch = match.match(/src=["']([^"']*)["']/i);
    if (srcMatch) {
      const originalSrc = srcMatch[1];
      if (originalSrc.includes('drive.google.com') || originalSrc.includes('googleusercontent.com')) {
        isGoogleDriveImage = true;
        const convertedSrc = convertGoogleDriveUrl(originalSrc);
        enhancedImg = enhancedImg.replace(/src=["'][^"']*["']/i, `src="${convertedSrc}"`);
      }
    }
    
    // Add appropriate enhanced attributes based on image source
    const attributesToAdd = isGoogleDriveImage ? GOOGLE_DRIVE_IMAGE_ATTRS : ENHANCED_IMAGE_ATTRS;
    enhancedImg = addAttributesToElement(enhancedImg, attributesToAdd);
    
    return enhancedImg;
  });
}

/**
 * Enhance iframe elements in HTML content
 */
export function enhanceIframeElements(html: string): string {
  return html.replace(/<iframe[^>]*>/gi, (match) => {
    let enhancedIframe = match;
    
    // Add enhanced attributes
    enhancedIframe = addAttributesToElement(enhancedIframe, ENHANCED_IFRAME_ATTRS);
    
    return enhancedIframe;
  });
}

/**
 * Wrap standalone iframes in responsive containers
 */
export function wrapIframesInContainers(html: string): string {
  return html.replace(/<iframe[^>]*>.*?<\/iframe>/gi, (match) => {
    // Check if iframe is already wrapped in a data-iframe-wrapper
    const isAlreadyWrapped = html.includes(`data-iframe-wrapper`) && html.indexOf(match) > html.lastIndexOf(`data-iframe-wrapper`, html.indexOf(match));
    
    if (isAlreadyWrapped) {
      return match;
    }
    
    // Determine if this looks like a YouTube or Vimeo embed for responsive aspect ratio
    const isVideoEmbed = match.includes('youtube.com/embed') || match.includes('player.vimeo.com');
    
    const wrapperStyle = isVideoEmbed 
      ? 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; margin: 1rem 0;'
      : 'position: relative; width: 100%; max-width: 100%; border-radius: 8px; overflow: hidden; margin: 1rem 0;';
    
    const iframeStyle = isVideoEmbed
      ? 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;'
      : 'width: 100%; min-height: 400px; border: 0;';
    
    // Add style to iframe
    const styledIframe = match.includes('style=')
      ? match.replace(/style=["']([^"']*)["']/i, `style="${iframeStyle}"`)
      : match.replace(/<iframe/, `<iframe style="${iframeStyle}"`);
    
    return `<div data-iframe-wrapper="true" style="${wrapperStyle}">${styledIframe}</div>`;
  });
}

/**
 * Main function to sanitize and enhance HTML content
 */
export function enhanceHtmlContent(html: string): string {
  if (!html || typeof html !== 'string') {
    return html;
  }
  
  let enhancedHtml = html;
  
  // Enhance images
  enhancedHtml = enhanceImageElements(enhancedHtml);
  
  // Enhance iframes
  enhancedHtml = enhanceIframeElements(enhancedHtml);
  
  // Wrap iframes in responsive containers
  enhancedHtml = wrapIframesInContainers(enhancedHtml);
  
  return enhancedHtml;
}

/**
 * Enhanced content renderer component props
 */
export interface EnhancedContentProps {
  content: string;
  className?: string;
  enhanceImages?: boolean;
  enhanceIframes?: boolean;
}

/**
 * Get enhanced content for dangerouslySetInnerHTML
 */
export function getEnhancedContent(
  content: string, 
  options: { enhanceImages?: boolean; enhanceIframes?: boolean } = {}
): { __html: string } {
  const { enhanceImages = true, enhanceIframes = true } = options;
  
  let enhancedContent = content;
  
  if (enhanceImages) {
    enhancedContent = enhanceImageElements(enhancedContent);
  }
  
  if (enhanceIframes) {
    enhancedContent = enhanceIframeElements(enhancedContent);
    enhancedContent = wrapIframesInContainers(enhancedContent);
  }
  
  return { __html: enhancedContent };
}