'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/core/button';
import { Modal } from '@/components/ui/feedback/modal';
import {
  MessageSquare,
  X,
  Download,
  Settings,
  Save,
  Copy
} from 'lucide-react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { CanvasEditor } from './CanvasEditor';

interface CanvasModeProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen canvas mode for document creation and editing
 * Split-screen interface with chat on left and canvas editor on right
 */
export function TeacherAssistantCanvasMode({ isOpen, onClose }: CanvasModeProps) {
  const [canvasContent, setCanvasContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(canvasContent);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([canvasContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving document:', { title: documentTitle, content: canvasContent });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="p-0"
      contentClassName="h-full"
    >
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">
              {documentTitle}
            </h1>
            <span className="text-sm text-muted-foreground">
              Canvas Mode • {canvasContent.length} characters
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Sidebar */}
          <div className="w-96 border-r flex flex-col bg-muted/20">
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">AI Assistant</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask me to help create content for your canvas
              </p>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col min-h-0">
                <MessageList className="flex-1" />
                <MessageInput className="border-t" />
              </div>
            </div>
          </div>

          {/* Canvas Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Canvas Header */}
            <div className="p-4 border-b bg-muted/10">
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none outline-none w-full"
                placeholder="Document Title"
              />
            </div>

            {/* Canvas Editor */}
            <div className="flex-1">
              <CanvasEditor
                content={canvasContent}
                onChange={setCanvasContent}
                placeholder="Start writing your document here...

You can use markdown formatting:
- **bold text**
- *italic text*
- # Headings
- - Lists
- > Quotes
- `code`

Ask the AI assistant to help you create content!"
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
