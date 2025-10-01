'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Info, Eye } from 'lucide-react';

// Simple icon components
const Code = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const ExternalLink = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

interface EmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmbed: (embedCode: string) => void;
}

export const EmbedDialog: React.FC<EmbedDialogProps> = ({
  open,
  onOpenChange,
  onEmbed
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'code'>('url');
  const [url, setUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('400');
  const [showPreview, setShowPreview] = useState(false);
  const [previewCode, setPreviewCode] = useState('');

  const generateEmbedCode = (inputUrl: string) => {
    if (!inputUrl.trim()) return '';

    let finalEmbedCode = '';
    const cleanUrl = inputUrl.trim();

    // YouTube URL conversion
    const youtubeMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      finalEmbedCode = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px;">
  <iframe
    src="https://www.youtube.com/embed/${videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allowfullscreen
    title="YouTube video">
  </iframe>
</div>`;
    }
    // Vimeo URL conversion
    else if (cleanUrl.includes('vimeo.com/')) {
      const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        const videoId = vimeoMatch[1];
        finalEmbedCode = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px;">
  <iframe
    src="https://player.vimeo.com/video/${videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allowfullscreen
    title="Vimeo video">
  </iframe>
</div>`;
      }
    }
    // Generic iframe for other URLs
    else {
      finalEmbedCode = `<div style="position: relative; width: 100%; max-width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
  <iframe
    src="${cleanUrl}"
    style="width: 100%; height: ${height}px; border: 0;"
    title="Embedded content">
  </iframe>
</div>`;
    }

    return finalEmbedCode;
  };

  const handleUrlEmbed = () => {
    const code = generateEmbedCode(url);
    if (code) {
      onEmbed(code);
      handleClose();
    }
  };

  const handlePreview = () => {
    const code = generateEmbedCode(url);
    if (code) {
      setPreviewCode(code);
      setShowPreview(true);
    }
  };

  const handleCodeEmbed = () => {
    if (!embedCode.trim()) return;
    
    // Wrap the embed code in a container for better styling
    const wrappedCode = `<div style="position: relative; width: 100%; max-width: 100%; border-radius: 8px; overflow: hidden;">
  ${embedCode.trim()}
</div>`;
    
    onEmbed(wrappedCode);
    handleClose();
  };

  const handleClose = () => {
    setUrl('');
    setEmbedCode('');
    setWidth('100%');
    setHeight('400');
    setActiveTab('url');
    onOpenChange(false);
  };

  const getPreviewUrl = () => {
    if (!url.trim()) return null;
    
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
    }
    
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Content
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'url' | 'code')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">From URL</span>
              <span className="sm:hidden">URL</span>
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Code className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Embed Code</span>
              <span className="sm:hidden">Code</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Paste a URL from YouTube, Vimeo, or any embeddable content. We'll automatically convert it to the proper embed format.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="embed-url">Content URL</Label>
                <Input
                  id="embed-url"
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="embed-width">Width</Label>
                  <Input
                    id="embed-width"
                    placeholder="100%"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="embed-height">Height (px)</Label>
                  <Input
                    id="embed-height"
                    placeholder="400"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!url.trim()}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>

              {showPreview && previewCode && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <div
                    className="w-full max-h-64 overflow-hidden rounded border bg-white"
                    dangerouslySetInnerHTML={{ __html: previewCode }}
                  />
                </div>
              )}

              {getPreviewUrl() && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium mb-2">Thumbnail Preview:</p>
                  <img
                    src={getPreviewUrl()!}
                    alt="Video preview"
                    className="w-full max-w-xs rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Paste the embed code (iframe, script, etc.) from the source. This is useful for simulations, interactive content, or custom embeds.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="embed-code">Embed Code</Label>
              <Textarea
                id="embed-code"
                placeholder="<iframe src=&quot;...&quot; width=&quot;100%&quot; height=&quot;400&quot;></iframe>"
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={activeTab === 'url' ? handleUrlEmbed : handleCodeEmbed}
            disabled={activeTab === 'url' ? !url.trim() : !embedCode.trim()}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Embed Content</span>
            <span className="sm:hidden">Embed</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
