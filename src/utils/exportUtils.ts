// src/utils/exportUtils.ts
import { createSVGExport, downloadSVG } from './svgExportUtils';
import type { ExportOptions, PageSize } from '../types';

// Re-export types for backward compatibility
export type { ExportFormat, PageSize } from '../types';
// import { createSimpleSVGExport, downloadSimpleSVG } from './simpleSvgExport';

const pageSizeMap: Record<Exclude<PageSize, 'Custom'>, { width: number; height: number }> = {
  Letter: { width: 8.5, height: 11 }, // inches
  A4: { width: 8.27, height: 11.69 }, // inches
  '11x17': { width: 11, height: 17 },
  '10x15cm Postcard': { width: 3.94, height: 5.91 }, // inches (100mm = 3.94", 150mm = 5.91")
};

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
 * Logs export activity to the server
 */
async function logExportActivity(options: ExportOptions): Promise<void> {
  try {
    const logData = {
      exportFormat: options.format,
      pageSize: options.pageSize,
      dateRange: options.dateRange || 'Unknown',
      gnomonType: options.gnomonType || 'Unknown',
      locationName: options.locationName || 'Unknown'
    };

    const response = await fetch('/export-logger.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Export logged successfully:', result);
    } else {
      console.warn('Failed to log export activity:', response.statusText);
    }
  } catch (error) {
    console.warn('Error logging export activity:', error);
    // Don't throw error - logging failure shouldn't prevent export
  }
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
    
    // Log the export activity after successful export
    await logExportActivity(options);
  } catch (error) {
    console.error(`Error exporting ${options.format}:`, error);
    throw error;
  }
}

/**
 * Exports as PNG using html2canvas (dynamically imported)
 */
async function exportPNG(svgContainer: HTMLElement, options: ExportOptions): Promise<void> {
  // Dynamically import html2canvas to reduce initial bundle size
  const { default: html2canvas } = await import('html2canvas');
  // Get intended print dimensions
  // Calculate custom page size in mm
  const getCustomPageSize = () => {
    if (options.pageSize !== 'Custom' || !options.customWidth || !options.customHeight) return null;
    // customWidth and customHeight are already stored in millimeters
    return {
      width: options.customWidth,
      height: options.customHeight
    };
  };
  
  const customPageSize = getCustomPageSize();
  let { width: printWidth, height: printHeight } = customPageSize || (options.pageSize !== 'Custom' ? pageSizeMap[options.pageSize as keyof typeof pageSizeMap] : pageSizeMap.Letter);
  if (options.orientation === 'Landscape') {
    [printWidth, printHeight] = [printHeight, printWidth];
  }

  // Calculate scale for the specified DPI
  const dpi = options.dpi || 600;
  const domWidth = svgContainer.offsetWidth;
  const pixelWidth = printWidth * dpi;
  let scale = pixelWidth / domWidth;

  // Check for potential canvas size limits
  const maxCanvasSize = 32767; // Common browser limit
  const estimatedWidth = domWidth * scale;
  const estimatedHeight = svgContainer.offsetHeight * scale;
  
  if (estimatedWidth > maxCanvasSize || estimatedHeight > maxCanvasSize) {
    console.warn('Canvas would exceed browser limits, reducing scale');
    const maxScale = Math.min(maxCanvasSize / domWidth, maxCanvasSize / svgContainer.offsetHeight);
    scale = Math.min(scale, maxScale * 0.9); // Use 90% of max to be safe
    console.log('Adjusted scale to:', scale);
  }

  // Minimal logging for PNG export
  console.log(`PNG Export: ${domWidth}x${svgContainer.offsetHeight} @ ${dpi}DPI (scale: ${scale.toFixed(2)})`);

  // Create a temporary clone of the SVG container to fix compatibility issues
  const tempContainer = svgContainer.cloneNode(true) as HTMLElement;
  
  // Quick optimization check - only log if there are excessive elements
  const tempPathElements = tempContainer.querySelectorAll('path');
  if (tempPathElements.length > 100) {
    console.log(`PNG Export: Processing ${tempPathElements.length} path elements`);
  }
  
  // Fix text positioning attributes that html2canvas doesn't handle well
  const tempTextElements = tempContainer.querySelectorAll('text');
  tempTextElements.forEach(textEl => {
    // Replace alignmentBaseline="middle" with dominant-baseline="central"
    if (textEl.getAttribute('alignmentBaseline') === 'middle') {
      textEl.removeAttribute('alignmentBaseline');
      textEl.setAttribute('dominant-baseline', 'central');
    }
    
    // Ensure text-anchor is properly set
    if (!textEl.getAttribute('text-anchor') && textEl.getAttribute('textAnchor')) {
      textEl.setAttribute('text-anchor', textEl.getAttribute('textAnchor') || 'middle');
    }
    
    // Simplify complex transforms that might cause issues
    const transform = textEl.getAttribute('transform');
    if (transform && transform.includes('rotate')) {
      // Only remove very complex transforms, but preserve simple rotations like "rotate(180 x y)"
      // which are used for dial facing
      if (transform.includes('matrix') || transform.split(' ').length > 4) {
        textEl.removeAttribute('transform');
      }
    }
  });
  
  // Also check for problematic group transforms
  const groupElements = tempContainer.querySelectorAll('g');
  groupElements.forEach(groupEl => {
    const transform = groupEl.getAttribute('transform');
    if (transform && transform.includes('scale') && transform.includes('rotate')) {
      // Check if this is a dial facing transform (scale + rotate(180))
      if (transform.includes('rotate(180)')) {
        // Keep the dial facing transform as-is
      } else if (transform.includes('matrix') || transform.split(' ').length > 6) {
        // Only simplify very complex transforms
        const scaleMatch = transform.match(/scale\([^)]+\)/);
        if (scaleMatch) {
          groupEl.setAttribute('transform', scaleMatch[0]);
        }
      }
    }
  });
  
  // Temporarily add the container to the DOM for html2canvas
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  document.body.appendChild(tempContainer);

  try {
    const startTime = performance.now();
    
    // Add a timeout to prevent hanging
    const canvasPromise = html2canvas(tempContainer, {
      backgroundColor: options.showBackground ? (options.backgroundColor || '#ffffff') : '#ffffff',
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false, // Disable html2canvas logging for better performance
      foreignObjectRendering: false, // Disable foreign object rendering which can cause issues
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PNG export timed out after 30 seconds')), 30000);
    });
    
    const canvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;
    const endTime = performance.now();
    console.log(`PNG export completed in ${(endTime - startTime).toFixed(0)}ms`);
    
    // Remove the temporary container now that we have the canvas
    document.body.removeChild(tempContainer);
    
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadFile(blob, 'sundial.png', 'image/png');
            resolve();
          } else {
            console.error('Canvas toBlob returned null');
            console.error('Canvas width:', canvas.width, 'height:', canvas.height);
            console.error('Canvas context:', canvas.getContext('2d'));
            
            // Try with a lower DPI as fallback
            if (dpi > 150) {
              console.log('Retrying with lower DPI...');
              exportPNG(svgContainer, { ...options, dpi: 150 }).then(resolve).catch(reject);
              return;
            }
            
            // Final fallback: try with minimal options
            console.log('Trying final fallback with minimal options...');
            html2canvas(svgContainer, {
              backgroundColor: '#ffffff',
              scale: 1,
              logging: false,
            }).then(fallbackCanvas => {
              fallbackCanvas.toBlob((fallbackBlob) => {
                if (fallbackBlob) {
                  console.log('Fallback PNG export succeeded');
                  downloadFile(fallbackBlob, 'sundial.png', 'image/png');
                  resolve();
                } else {
                  reject(new Error('Failed to create PNG blob - all fallback methods failed'));
                }
              }, 'image/png');
            }).catch(fallbackError => {
              console.error('Fallback also failed:', fallbackError);
              reject(new Error('Failed to create PNG blob - canvas.toBlob() returned null'));
            });
          }
        }, 'image/png');
      } catch (error) {
        console.error('Error in toBlob:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`Failed to create PNG blob: ${errorMessage}`));
      }
    });
    
  } catch (error) {
    // Clean up the temporary container in case of error
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
    
    console.error('Error in html2canvas:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // If it's a timeout error and we haven't tried a lower DPI yet, try again
    if (errorMessage.includes('timed out') && dpi > 150) {
      console.log('PNG export timed out, retrying with lower DPI...');
      return exportPNG(svgContainer, { ...options, dpi: 150 });
    }
    throw new Error(`PNG export failed: ${errorMessage}`);
  }
}

