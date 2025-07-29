// src/utils/exportUtils.ts
import html2canvas from 'html2canvas';
import { createSVGExport, downloadSVG } from './svgExportUtils';
// import { createSimpleSVGExport, downloadSimpleSVG } from './simpleSvgExport';

export type ExportFormat = 'SVG' | 'PNG' | 'PDF';
export type PageSize = 'A4' | 'Letter' | '11x17' | '10x15cm Postcard';

const pageSizeMap = {
  Letter: { width: 8.5, height: 11 }, // inches
  A4: { width: 8.27, height: 11.69 }, // inches
  '11x17': { width: 11, height: 17 },
  '10x15cm Postcard': { width: 3.94, height: 5.91 }, // inches (100mm = 3.94", 150mm = 5.91")
};

interface ExportOptions {
  format: ExportFormat;
  pageSize: PageSize;
  orientation: 'Landscape' | 'Portrait';
  dpi?: number;
  showBackground?: boolean;
  backgroundColor?: string;
}

/**
 * Finds the sundial preview container in the DOM
 */
function findPreviewContainer(): HTMLElement | null {
  console.log('=== MAIN EXPORT CONTAINER SEARCH ===');
  const previewCards = document.querySelectorAll('.card');
  console.log('Found', previewCards.length, 'cards');
  
  for (const card of previewCards) {
    const title = card.querySelector('.card-title');
    console.log('Card title:', title?.textContent);
    
    if (title && title.textContent && title.textContent.includes('Sundial Preview')) {
      console.log('Found Sundial Preview card');
      
      // Return the SVG container div, not the entire card
      let svgContainer = card.querySelector('div[style*="display: flex"]') as HTMLElement;
      console.log('Found flex div:', !!svgContainer);
      
      // If that doesn't work, try finding the parent of the SVG
      if (!svgContainer) {
        const svg = card.querySelector('svg');
        console.log('Found SVG in card:', !!svg);
        if (svg) {
          svgContainer = svg.parentElement as HTMLElement;
          console.log('Using SVG parent as container');
        }
      }
      
      // Additional fallback - find any div with SVG
      if (!svgContainer) {
        const allDivs = card.querySelectorAll('div');
        for (const div of allDivs) {
          if (div.querySelector('svg[viewBox]')) {
            svgContainer = div as HTMLElement;
            console.log('Found container via viewBox selector');
            break;
          }
        }
      }
      
      console.log('Final container found:', !!svgContainer);
      return svgContainer;
    }
  }
  
  console.log('No Sundial Preview card found');
  return null;
}





/**
 * Downloads a file with the given content
 */
function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the sundial design in the specified format
 */
export async function exportSundial(options: ExportOptions): Promise<void> {
  console.log('Starting export with options:', options);
  
  // findPreviewContainer now returns the SVG container directly
  const svgContainer = findPreviewContainer();
  if (!svgContainer) {
    console.error('Could not find SVG container');
    throw new Error('Could not find SVG container within the preview.');
  }
  console.log('Found SVG container:', svgContainer);

  const svgElement = svgContainer.querySelector('svg') as SVGSVGElement;
  if (!svgElement) {
    console.error('Could not find SVG element');
    throw new Error('Could not find SVG element within the preview.');
  }
  console.log('Found SVG element:', svgElement);

  try {
    if (options.format === 'PNG') {
      console.log('Exporting as PNG...');
      await exportPNG(svgContainer, options);
      console.log('PNG export completed successfully');
    } else if (options.format === 'SVG') {
      console.log('Exporting as SVG...');
      // Use the sophisticated SVG export utility
      const svgContent = createSVGExport({
        pageSize: options.pageSize,
        orientation: options.orientation,
        showBackground: options.showBackground,
        backgroundColor: options.backgroundColor,
      });
      
      if (!svgContent) {
        throw new Error('Failed to create SVG content');
      }
      
      downloadSVG(svgContent);
      console.log('SVG export completed successfully');
    } else if (options.format === 'PDF') {
      throw new Error('PDF export is not yet implemented');
    }
  } catch (error) {
    console.error(`Error exporting ${options.format}:`, error);
    throw error;
  }
}

/**
 * Exports as PNG using html2canvas
 */
async function exportPNG(svgContainer: HTMLElement, options: ExportOptions): Promise<void> {
  // Get intended print dimensions
  let { width: printWidth, height: printHeight } = pageSizeMap[options.pageSize] || pageSizeMap.Letter;
  if (options.orientation === 'Landscape') {
    [printWidth, printHeight] = [printHeight, printWidth];
  }

  // Calculate scale for the specified DPI
  const dpi = options.dpi || 600;
  const domWidth = svgContainer.offsetWidth;
  const pixelWidth = printWidth * dpi;
  const scale = pixelWidth / domWidth;

  const canvas = await html2canvas(svgContainer, {
    backgroundColor: options.showBackground ? (options.backgroundColor || '#ffffff') : '#ffffff',
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, 'sundial.png', 'image/png');
        resolve();
      } else {
        reject(new Error('Failed to create PNG blob'));
      }
    }, 'image/png');
  });
}

