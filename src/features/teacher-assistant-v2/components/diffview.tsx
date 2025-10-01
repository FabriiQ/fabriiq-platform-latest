'use client';

interface DiffViewProps {
  oldContent: string;
  newContent: string;
}

export function DiffView({ oldContent, newContent }: DiffViewProps) {
  // Simple diff view - can be enhanced with a proper diff library later
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm font-medium">Document Changes</div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium text-red-600 mb-2">Previous Version</div>
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
            {oldContent}
          </div>
        </div>
        
        <div>
          <div className="text-xs font-medium text-green-600 mb-2">Current Version</div>
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
            {newContent}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Enhanced diff view with line-by-line comparison coming soon.
      </div>
    </div>
  );
}
