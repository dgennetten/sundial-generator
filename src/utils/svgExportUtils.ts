// src/utils/svgExportUtils.ts
// Simple SVG export utilities - restored to the original working approach

export interface SVGExportOptions {
  pageSize: 'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom';
  customWidth?: number;
  customHeight?: number;
  customUnits?: 'in' | 'cm';
  orientation: 'Landscape' | 'Portrait';
  showBackground?: boolean;
  backgroundColor?: string;
}

const pageSizeMap = {
  Letter: { width: 8.5, height: 11 }, // inches
  A4: { width: 8.27, height: 11.69 }, // inches
  '11x17': { width: 11, height: 17 },
  '10x15cm Postcard': { width: 3.94, height: 5.91 }, // inches
};

/**
 * Creates a simple SVG export by directly serializing the sundial SVG
 * This is the original working approach that was replaced by complex layering
 */
export function createSVGExport(options: SVGExportOptions): string | null {
  console.log('Starting simple SVG export with options:', options);
  
  // Find the sundial preview container
  console.log('=== SIMPLE SVG EXPORT - FINDING SUNDIAL ===');
  const previewCards = document.querySelectorAll('.card');
  let svgContainer: HTMLElement | null = null;
  
  for (const card of previewCards) {
    const title = card.querySelector('.card-title');
    if (title && title.textContent && title.textContent.includes('Sundial Preview')) {
      console.log('Found Sundial Preview card');
      
      // Find the SVG container
      svgContainer = card.querySelector('div[style*="display: flex"]') as HTMLElement;
      if (!svgContainer) {
        const svg = card.querySelector('svg');
        if (svg) {
          svgContainer = svg.parentElement as HTMLElement;
        }
      }
      
      if (svgContainer) {
        console.log('Found SVG container');
        break;
      }
    }
  }
  
  if (!svgContainer) {
    console.error('Could not find SVG container');
    return null;
  }
  
  // Find the main SVG element
  const svgElement = svgContainer.querySelector('svg') as SVGSVGElement;
  if (!svgElement) {
    console.error('Could not find SVG element');
    return null;
  }
  
  console.log('Found SVG element:', svgElement);
  console.log('SVG viewBox:', svgElement.getAttribute('viewBox'));
  
  // Get page dimensions
  const customPageSize = options.pageSize === 'Custom' && options.customWidth && options.customHeight
    ? { width: options.customWidth / 25.4, height: options.customHeight / 25.4 } // Convert mm to inches
    : null;
  
  let { width: printWidth, height: printHeight } = customPageSize || 
    (options.pageSize !== 'Custom' ? pageSizeMap[options.pageSize as keyof typeof pageSizeMap] : pageSizeMap.Letter);
  
  // Apply orientation
  if (!customPageSize && options.orientation === 'Landscape') {
    [printWidth, printHeight] = [printHeight, printWidth];
  }
  
  // Convert to points for SVG (1 inch = 72 points)
  const pageWidthPt = printWidth * 72;
  const pageHeightPt = printHeight * 72;
  
  console.log('SVG Export dimensions:', { pageSize: options.pageSize, orientation: options.orientation, printWidth, printHeight, pageWidthPt, pageHeightPt });
  
  // Get the original viewBox
  const originalViewBox = svgElement.getAttribute('viewBox') || '';
  console.log('Original viewBox:', originalViewBox);
  
  // Create the export SVG structure - SIMPLE APPROACH
  let svgContent = '';
  
  // Add XML declaration
  svgContent += '<?xml version="1.0" encoding="UTF-8"?>\n';
  
  // Start SVG element with proper dimensions
  svgContent += `<svg xmlns="http://www.w3.org/2000/svg" `;
  svgContent += `width="${pageWidthPt}pt" height="${pageHeightPt}pt" `;
  
  if (originalViewBox) {
    svgContent += `viewBox="${originalViewBox}" `;
  }
  
  svgContent += `preserveAspectRatio="xMidYMid meet">\n`;
  
  // Add background if specified
  if (options.showBackground) {
    const bgColor = options.backgroundColor || '#ffffff';
    if (originalViewBox) {
      const [x, y, width, height] = originalViewBox.split(' ').map(Number);
      svgContent += `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${bgColor}"/>\n`;
    }
  }
  
  // SIMPLE APPROACH: Just serialize the entire SVG content directly
  // This avoids all the complex layering that was causing duplicate dials
  const svgInnerContent = svgElement.innerHTML;
  console.log('SVG inner content length:', svgInnerContent.length);
  
  // Add the content directly without any special processing
  svgContent += svgInnerContent;
  
  // Close SVG
  svgContent += '\n</svg>';
  
  console.log('Generated simple SVG content length:', svgContent.length);
  console.log('SVG preview:', svgContent.substring(0, 500) + '...');
  
  return svgContent;
}

/**
 * Downloads the SVG content as a file
 */
export function downloadSVG(svgContent: string, filename: string = 'sundial.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
