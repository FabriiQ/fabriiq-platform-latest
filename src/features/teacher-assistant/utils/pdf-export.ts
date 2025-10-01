/**
 * PDF Export Utility for Teacher Assistant Documents
 * Uses html2canvas and jsPDF for client-side PDF generation
 */

import { Document } from '../types';

// Dynamic imports for client-side only libraries
const loadPDFLibraries = async () => {
  const [html2canvas, jsPDF] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);
  
  return {
    html2canvas: html2canvas.default,
    jsPDF: jsPDF.jsPDF
  };
};

export interface PDFExportOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeAnswerKey?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Export a document to PDF
 */
export async function exportDocumentToPDF(
  document: Document,
  options: PDFExportOptions = {
    format: 'A4',
    orientation: 'portrait',
    includeAnswerKey: false,
    margins: { top: 20, right: 20, bottom: 20, left: 20 }
  }
): Promise<void> {
  try {
    // Load PDF libraries dynamically
    const { html2canvas, jsPDF } = await loadPDFLibraries();

    // Create a temporary container for the document
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.5';

    // Generate HTML content
    const htmlContent = generateDocumentHTML(document, options);
    container.innerHTML = htmlContent;

    // Add to DOM temporarily
    document.body.appendChild(container);

    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.format.toLowerCase() as 'a4' | 'letter'
    });

    // Calculate dimensions
    const imgWidth = options.format === 'A4' ? 210 : 216; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = options.format === 'A4' ? 297 : 279; // mm

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      position,
      imgWidth,
      imgHeight
    );
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;
    }

    // Generate filename
    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Save the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}

/**
 * Generate HTML content for the document
 */
function generateDocumentHTML(document: Document, options: PDFExportOptions): string {
  const { title, sections, metadata } = document;

  let html = `
    <div style="margin-bottom: 30px;">
      <h1 style="font-size: 24pt; font-weight: bold; margin-bottom: 10px; text-align: center;">
        ${escapeHtml(title)}
      </h1>
      
      <div style="text-align: center; margin-bottom: 20px; color: #666;">
        ${metadata.subject ? `<div>Subject: ${escapeHtml(metadata.subject)}</div>` : ''}
        ${metadata.gradeLevel ? `<div>Grade Level: ${escapeHtml(metadata.gradeLevel)}</div>` : ''}
        ${metadata.author ? `<div>Created by: ${escapeHtml(metadata.author)}</div>` : ''}
        ${metadata.estimatedTime ? `<div>Estimated Time: ${metadata.estimatedTime} minutes</div>` : ''}
      </div>
      
      ${metadata.learningOutcomes && metadata.learningOutcomes.length > 0 ? `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 10px;">Learning Outcomes:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${metadata.learningOutcomes.map(outcome => `<li>${escapeHtml(outcome)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  // Add sections
  sections
    .sort((a, b) => a.order - b.order)
    .forEach((section, index) => {
      html += `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <h2 style="font-size: 16pt; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">
            ${section.order}. ${escapeHtml(section.title)}
          </h2>
          
          <div style="margin-left: 10px;">
            ${formatSectionContent(section.content, section.type)}
          </div>
        </div>
      `;
    });

  // Add footer
  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 10pt;">
      Generated on ${new Date().toLocaleDateString()} • ${document.type.replace('-', ' ').toUpperCase()}
    </div>
  `;

  return html;
}

/**
 * Format section content based on type
 */
function formatSectionContent(content: string, type: string): string {
  if (!content.trim()) {
    return '<div style="color: #999; font-style: italic;">Content not provided</div>';
  }

  switch (type) {
    case 'question':
      // Simple question formatting
      const lines = content.split('\n').filter(line => line.trim());
      return lines.map((line, index) => {
        if (line.trim().endsWith('?')) {
          return `<div style="margin-bottom: 15px; font-weight: bold;">${index + 1}. ${escapeHtml(line)}</div>`;
        }
        return `<div style="margin-bottom: 10px; margin-left: 20px;">${escapeHtml(line)}</div>`;
      }).join('');

    case 'table':
      // Basic table formatting (would need more sophisticated parsing for real tables)
      return `<div style="border: 1px solid #ddd; padding: 10px; background: #f9f9f9;">${escapeHtml(content)}</div>`;

    case 'text':
    default:
      // Convert basic markdown-like formatting
      let formatted = escapeHtml(content);
      
      // Convert line breaks
      formatted = formatted.replace(/\n\n/g, '</p><p>');
      formatted = formatted.replace(/\n/g, '<br>');
      
      // Wrap in paragraph
      formatted = `<p>${formatted}</p>`;
      
      // Basic bold/italic (very simple implementation)
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      return formatted;
  }
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if PDF export is supported
 */
export function isPDFExportSupported(): boolean {
  return typeof window !== 'undefined' && 'document' in window;
}
