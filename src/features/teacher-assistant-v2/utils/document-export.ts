/**
 * Document Export Utilities for Teacher Assistant v2
 * Supports PDF and Word document export using existing patterns
 */

// Dynamic imports for client-side only libraries
const loadExportLibraries = async () => {
  const [html2canvas, jsPDF] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  return {
    html2canvas: html2canvas.default,
    jsPDF: jsPDF.jsPDF
  };
};

export interface ExportOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeMetadata?: boolean;
}

/**
 * Escape HTML characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Build a safe download filename using the document title only
 * - Keeps original casing and spaces
 * - Removes characters not allowed by file systems
 */
function buildFilename(title: string, ext: string): string {
  const base = (title || 'document')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${base || 'document'}.${ext}`;
}

/**
 * Convert HTML content to a clean format for export
 */
function prepareContentForExport(content: string, title: string): string {
  // Process markdown content to HTML with better formatting
  let processedContent = content
    // Images - handle markdown image syntax first
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 10px 0;" />')

    // Headers
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')

    // Text formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
    .replace(/<mark>(.*?)<\/mark>/g, '<mark style="background-color: #fff3cd; padding: 2px 4px;">$1</mark>')

    // Math equations
    .replace(/\$\$(.*?)\$\$/gs, '<div class="math-display">$1</div>')
    .replace(/\$(.*?)\$/g, '<span class="math-inline">$1</span>')

    // Lists - handle ordered lists first
    .replace(/^\d+\.\s+(.*$)/gm, '<li class="ordered">$1</li>')
    // Then unordered lists
    .replace(/^[\-\*\+]\s+(.*$)/gm, '<li class="unordered">$1</li>')

    // Convert line breaks to proper HTML
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive ordered list items
  processedContent = processedContent.replace(/(<li class="ordered">.*?<\/li>)(\s*<li class="ordered">.*?<\/li>)*/gs, (match) => {
    const items = match.replace(/ class="ordered"/g, '');
    return `<ol>${items}</ol>`;
  });

  // Wrap consecutive unordered list items
  processedContent = processedContent.replace(/(<li class="unordered">.*?<\/li>)(\s*<li class="unordered">.*?<\/li>)*/gs, (match) => {
    const items = match.replace(/ class="unordered"/g, '');
    return `<ul>${items}</ul>`;
  });

  // Wrap content in paragraphs if it doesn't start with a block element
  if (!processedContent.match(/^<(h[1-6]|ul|ol|div|p)/)) {
    processedContent = `<p>${processedContent}</p>`;
  }

  // Create a clean HTML document structure
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          max-width: 100%;
          margin: 0;
          padding: 30px;
          background: white;
          box-sizing: border-box;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        h1 {
          font-size: 24pt;
          font-weight: bold;
          margin: 24px 0 16px 0;
          color: #1a1a1a;
          border-bottom: 3px solid #2c3e50;
          padding-bottom: 8px;
        }
        h2 {
          font-size: 18pt;
          font-weight: bold;
          margin: 20px 0 14px 0;
          color: #1a1a1a;
          border-bottom: 2px solid #bdc3c7;
          padding-bottom: 4px;
        }
        h3 {
          font-size: 16pt;
          font-weight: bold;
          margin: 18px 0 12px 0;
          color: #1a1a1a;
        }
        h4 {
          font-size: 14pt;
          font-weight: bold;
          margin: 16px 0 10px 0;
          color: #1a1a1a;
        }
        p {
          margin: 12px 0;
          text-align: justify;
          line-height: 1.6;
        }
        strong {
          font-weight: bold;
          color: #2c3e50;
        }
        em {
          font-style: italic;
          color: #34495e;
        }
        u {
          text-decoration: underline;
        }
        del {
          text-decoration: line-through;
          color: #6c757d;
        }
        ul, ol {
          margin: 12px 0;
          padding-left: 30px;
        }
        li {
          margin: 6px 0;
          line-height: 1.5;
        }
        code {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background-color: #f8f9fa;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
          font-size: 0.9em;
        }
        .math-display {
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          font-family: 'KaTeX_Main', 'Times New Roman', serif;
        }
        .math-inline {
          background-color: #f8f9fa;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'KaTeX_Main', 'Times New Roman', serif;
        }
        /* Page break handling */
        h1, h2, h3, h4 {
          page-break-after: avoid;
          break-after: avoid;
        }
        p, li {
          page-break-inside: avoid;
          break-inside: avoid;
          orphans: 2;
          widows: 2;
        }
        ul, ol {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        img {
          page-break-inside: avoid;
          break-inside: avoid;
          max-width: 100%;
          height: auto;
        }
        @media print {
          body {
            margin: 0;
            padding: 20px;
            font-size: 11pt;
          }
          h1 { font-size: 18pt; }
          h2 { font-size: 16pt; }
          h3 { font-size: 14pt; }
          h4 { font-size: 12pt; }
          .math-display {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        @page {
          margin: 20mm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${escapeHtml(title)}</h1>
      </header>
      <main class="content">
        ${processedContent}
      </main>

    </body>
    </html>
  `;
}

/**
 * Export document as PDF
 */
export async function exportToPDF(
  content: string,
  title: string,
  options: ExportOptions = {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 }
  }
): Promise<void> {
  try {
    const { html2canvas, jsPDF } = await loadExportLibraries();

    // Create a temporary container for the document with proper sizing
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.visibility = 'hidden';

    // Set container width based on format (convert mm to px at 96 DPI)
    const pageWidthPx = options.format === 'A4' ? 794 : 816; // A4: 210mm, Letter: 216mm at 96 DPI
    container.style.width = `${pageWidthPx}px`;
    container.style.backgroundColor = 'white';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';

    // Generate clean HTML content
    const htmlContent = prepareContentForExport(content, title);
    container.innerHTML = htmlContent;

    // Add to DOM temporarily
    document.body.appendChild(container);

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convert to canvas with high quality settings
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: container.scrollWidth,
      height: container.scrollHeight,
      windowWidth: pageWidthPx,
      windowHeight: container.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false, // Disable logging for cleaner output
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF with proper settings
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.format.toLowerCase() as 'a4' | 'letter',
      compress: true, // Enable compression for smaller file size
    });

    // Calculate dimensions with proper margins
    const margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const pageWidth = options.format === 'A4' ? 210 : 216;
    const pageHeight = options.format === 'A4' ? 297 : 279;

    const contentWidth = pageWidth - margins.left - margins.right;
    const contentHeight = pageHeight - margins.top - margins.bottom;

    // Calculate image dimensions to fit within content area
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let yPosition = 0;

    // Add first page
    pdf.addImage(
      canvas.toDataURL('image/png', 0.95), // Slightly compress for better performance
      'PNG',
      margins.left,
      margins.top,
      imgWidth,
      Math.min(imgHeight, contentHeight)
    );
    heightLeft -= contentHeight;

    // Add additional pages if content exceeds one page
    while (heightLeft > 0) {
      yPosition = -(imgHeight - heightLeft);
      pdf.addPage();

      pdf.addImage(
        canvas.toDataURL('image/png', 0.95),
        'PNG',
        margins.left,
        margins.top + yPosition,
        imgWidth,
        imgHeight
      );
      heightLeft -= contentHeight;
    }

    // Generate filename using document title only
    const filename = buildFilename(title, 'pdf');

    // Save the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}

/**
 * Export an existing DOM element as PDF (captures exact preview styling)
 */
export async function exportElementToPDF(
  element: HTMLElement,
  title: string,
  options: ExportOptions = {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  }
): Promise<void> {
  try {
    const { html2canvas, jsPDF } = await loadExportLibraries();

    // Normalize capture width to the PDF content width (prevents tiny/compressed text)
    const normMargins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const pageWidthMM = options.format === 'A4' ? 210 : 216;
    const contentWidthMM = pageWidthMM - normMargins.left - normMargins.right;
    const pxPerMM = 96 / 25.4; // CSS pixels per mm at 96 DPI
    const contentWidthPx = Math.round(contentWidthMM * pxPerMM);

    // Clone the element into an off-screen container sized to the PDF content width
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = '#ffffff';
    container.style.width = `${contentWidthPx}px`;
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';

    const clone = element.cloneNode(true) as HTMLElement;
    (clone.style as any).width = '100%';
    container.appendChild(clone);
    document.body.appendChild(container);

    // Let fonts/images settle briefly
    await new Promise((r) => setTimeout(r, 50));

    // Render the normalized container
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: container.scrollWidth,
      height: container.scrollHeight,
      windowWidth: contentWidthPx,
      windowHeight: container.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    // Clean up temporary container
    document.body.removeChild(container);

    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.format.toLowerCase() as 'a4' | 'letter',
    });

    const pdfMargins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const pageWidth = options.format === 'A4' ? 210 : 216;
    const pageHeight = options.format === 'A4' ? 297 : 279;

    const contentWidth = pageWidth - pdfMargins.left - pdfMargins.right;
    const contentHeight = pageHeight - pdfMargins.top - pdfMargins.bottom;

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = pdfMargins.top;

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      pdfMargins.left,
      position,
      imgWidth,
      Math.min(imgHeight, contentHeight)
    );
    heightLeft -= contentHeight;

    while (heightLeft > 0) {
      position = pdfMargins.top - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        pdfMargins.left,
        position,
        imgWidth,
        Math.min(heightLeft, contentHeight)
      );
      heightLeft -= contentHeight;
    }

    const filename = buildFilename(title, 'pdf');
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting element to PDF:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}


// --- Helpers for Word export image compatibility ---
function createPlaceholderPng(width = 400, height = 300, text = 'Educational Image'): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1E40AF';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
  return canvas.toDataURL('image/png');
}

function svgDataUriToPng(svgDataUri: string, width = 400, height = 300): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        const scale = Math.min(width / img.width, height / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(createPlaceholderPng(width, height));
    img.src = svgDataUri;
  });
}

async function prepareElementForWord(element: HTMLElement): Promise<HTMLElement> {
  const clone = element.cloneNode(true) as HTMLElement;
  const imgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(
    imgs.map(async (img) => {
      const src = (img.getAttribute('src') || '').trim();
      const lower = src.toLowerCase();
      const hasValidScheme = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:') || lower.startsWith('blob:') || lower.startsWith('/');
      const isPlaceholder = lower.startsWith('placeholder_') || lower === 'image_url';

      if (lower.startsWith('data:image/svg+xml')) {
        img.src = await svgDataUriToPng(src);
        return;
      }
      if (!hasValidScheme || isPlaceholder) {
        img.src = createPlaceholderPng();
      }
    })
  );
  return clone;
}

/**
 * Export an existing DOM element as a Word-compatible HTML (.doc)
 */
export async function exportElementToWord(
  element: HTMLElement,
  title: string
): Promise<void> {
  try {
    // Prepare a clone with images compatible for Word export (convert inline SVGs/placeholders to PNG)
    const prepared = await prepareElementForWord(element);
    const contentHtml = prepared.innerHTML;

    const wordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 1in; color: #000; }
          h1 { font-size: 18pt; font-weight: bold; margin: 18pt 0 12pt 0; }
          h2 { font-size: 16pt; font-weight: bold; margin: 16pt 0 10pt 0; }
          h3 { font-size: 14pt; font-weight: bold; margin: 14pt 0 8pt 0; }
          p { margin: 6pt 0; text-align: justify; }
          ul, ol { margin: 6pt 0 6pt 20pt; }
          li { margin: 4pt 0; }
          blockquote { border-left: 3pt solid #999; padding-left: 8pt; margin-left: 0; color: #555; }
          code { font-family: 'Courier New', monospace; background: #f5f5f5; padding: 1pt 3pt; }
          pre { background: #f5f5f5; padding: 6pt; overflow-x: auto; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1pt solid #ccc; padding: 4pt 6pt; }
          img { max-width: 100%; height: auto; }
          @page { margin: 1in; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <main>${contentHtml}</main>
      </body>
      </html>
    `;

    const blob = new Blob([wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(title, 'doc');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting element to Word:', error);
    throw new Error('Failed to export Word document. Please try again.');
  }
}


/**
 * Export document as Word (.docx) - using clean HTML format for compatibility
 */
export async function exportToWord(
  content: string,
  title: string,
  options: ExportOptions = {
    format: 'A4',
    orientation: 'portrait'
  }
): Promise<void> {
  try {
    // Convert markdown content to clean text
    const cleanContent = convertMarkdownToPlainText(content);

    // Create a simple HTML document for Word
    const wordContent = createWordCompatibleHTML(cleanContent, title);

    // Create blob and download as .doc (HTML format that Word can open)
    const blob = new Blob([wordContent], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(title, 'doc');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error exporting Word document:', error);
    throw new Error('Failed to export Word document. Please try again.');
  }
}

/**
 * Export document as plain text
 */
export function exportToText(content: string, title: string): void {
  try {
    // Strip HTML tags and convert to plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    const textContent = `${title}\n${'='.repeat(title.length)}\n\n${plainText}`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(title, 'txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error exporting text file:', error);
    throw new Error('Failed to export text file. Please try again.');
  }
}

/**
 * Convert markdown content to clean plain text with basic formatting
 */
function convertMarkdownToPlainText(content: string): string {
  // Remove markdown code fences
  let cleanContent = content.replace(/```[\s\S]*?```/g, '');

  // Convert images to HTML for Word compatibility
  cleanContent = cleanContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 10px 0;" />');

  // Convert headers to plain text with emphasis
  cleanContent = cleanContent.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // Convert bold and italic to plain text
  cleanContent = cleanContent.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanContent = cleanContent.replace(/\*(.*?)\*/g, '$1');

  // Convert lists to simple format
  cleanContent = cleanContent.replace(/^\s*[\-\*\+]\s+/gm, '• ');
  cleanContent = cleanContent.replace(/^\s*\d+\.\s+/gm, '1. ');

  // Clean up extra whitespace
  cleanContent = cleanContent.replace(/\n\s*\n/g, '\n\n');

  return cleanContent.trim();
}

/**
 * Create Word-compatible HTML document
 */
function createWordCompatibleHTML(content: string, title: string): string {
  // Process content for Word compatibility
  const processedContent = content
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => {
      // If paragraph contains HTML img tags, don't escape it
      if (paragraph.includes('<img')) {
        return paragraph;
      }
      return `<p>${escapeHtml(paragraph)}</p>`;
    })
    .join('\n');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 1in;
          color: #000;
        }
        h1 {
          font-size: 18pt;
          font-weight: bold;
          margin: 24pt 0 12pt 0;
          color: #000;
        }
        p {
          margin: 6pt 0;
          text-align: justify;
        }
        img {
          max-width: 100%;
          height: auto;
          margin: 10pt 0;
          display: block;
        }
        @page {
          margin: 1in;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${processedContent}
    </body>
    </html>
  `;
}

/**
 * Export document as HTML
 */
export function exportToHTML(content: string, title: string): void {
  try {
    const htmlContent = prepareContentForExport(content, title);

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(title, 'html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error exporting HTML file:', error);
    throw new Error('Failed to export HTML file. Please try again.');
  }
}
