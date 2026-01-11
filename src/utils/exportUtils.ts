// src/utils/exportUtils.ts
import { createSVGExport, downloadSVG } from './svgExportUtils';
import type { ExportOptions, PageSize } from '../types';
import { interpretDialTextBlockForEmail } from './dialTextBlockInterpreter';

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
  
  // First, let's try a more direct approach - look for any large SVG on the page
  const allSvgs = document.querySelectorAll('svg');
  console.log(`Found ${allSvgs.length} total SVG elements on page`);
  
  for (const svg of allSvgs) {
    const width = svg.getAttribute('width') || svg.clientWidth;
    const height = svg.getAttribute('height') || svg.clientHeight;
    const viewBox = svg.getAttribute('viewBox');
    const classes = svg.className;
    
    console.log(`SVG: width=${width}, height=${height}, viewBox=${viewBox}, classes="${classes}"`);
    
    // Skip small icons
    if (svg.classList.contains('lucide') || 
        (width && height && parseInt(width.toString()) <= 50 && parseInt(height.toString()) <= 50)) {
      console.log('Skipping small SVG');
      continue;
    }
    
    // Look for SVGs that might be the sundial (larger or no explicit size)
    const numWidth = width ? parseInt(width.toString()) : 0;
    const numHeight = height ? parseInt(height.toString()) : 0;
    
    if (numWidth > 100 || numHeight > 100 || (!width && !height) || 
        (viewBox && !viewBox.includes('0 0 24 24'))) {
      console.log('Found potential sundial SVG - checking parent');
      const parent = svg.parentElement;
      if (parent) {
        console.log(`SVG parent: ${parent.tagName}, classes: "${parent.className}"`);
        console.log(`Parent dimensions: ${parent.offsetWidth}x${parent.offsetHeight}`);
        
        // Make sure this isn't in a card header
        if (!parent.closest('.card-header') && !parent.closest('h1, h2, h3, h4, h5, h6')) {
          console.log('Found suitable sundial container');
          return parent;
        }
      }
    }
  }
  
  // Fallback: original card-based search
  console.log('Direct SVG search failed, trying card-based search...');
  const previewCards = document.querySelectorAll('.card');
  console.log('Found', previewCards.length, 'cards');
  
  for (const card of previewCards) {
    const title = card.querySelector('.card-title');
    console.log('Card title:', title?.textContent);
    
    if (title && title.textContent && title.textContent.includes('Sundial Preview')) {
      console.log('Found Sundial Preview card');
      console.log('Card HTML structure:', card.outerHTML.substring(0, 500));
      
      // Look everywhere in the card for SVGs
      const allSvgsInCard = card.querySelectorAll('svg');
      console.log(`Found ${allSvgsInCard.length} SVG elements in entire card`);
      
      for (const svg of allSvgsInCard) {
        const width = svg.getAttribute('width') || svg.clientWidth;
        const height = svg.getAttribute('height') || svg.clientHeight;
        const viewBox = svg.getAttribute('viewBox');
        
        console.log(`Card SVG: width=${width}, height=${height}, viewBox=${viewBox}, classes=${svg.className}`);
        console.log(`SVG parent: ${svg.parentElement?.tagName}, parent classes: ${svg.parentElement?.className}`);
        
        // Skip obvious icons
        if (!svg.classList.contains('lucide') && 
            (!width || !height || parseInt(width.toString()) > 50 || parseInt(height.toString()) > 50)) {
          console.log('Found potential sundial SVG in card');
          return svg.parentElement as HTMLElement;
        }
      }
    }
  }
  
  console.log('No suitable sundial container found anywhere');
  return null;
}





/**
 * Logs export activity to the server
 */
async function logExportActivity(options: ExportOptions): Promise<void> {
  try {
    const dialTextBlockInterpreted = interpretDialTextBlockForEmail(options.dialTextBlock || '', {
      locationName: options.locationName,
      latitude: options.latitude,
      longitude: options.longitude,
      dateRange: options.dateRange,
      gnomonHeightMm: options.gnomonHeight,
      inclineType: options.inclineType,
      tiltAngle: options.tiltAngle,
    });

    const logData = {
      exportFormat: options.format,
      pageSize: options.pageSize,
      dateRange: options.dateRange || 'Unknown',
      gnomonType: options.gnomonType || 'Unknown',
      locationName: options.locationName || 'Unknown',
      sundialNotesMode: options.sundialNotesMode || 'Unknown',
      dialTextBlock: options.dialTextBlock || '',
      dialTextBlockInterpreted,
      latitude: options.latitude,
      longitude: options.longitude,
    };

    console.log('Sending log data to server:', logData);

    // Use production URL in development since Vite doesn't handle PHP
    const isDevelopment = import.meta.env.DEV;
    const loggerUrl = isDevelopment 
      ? 'https://sundial.gennetten.org/export-logger.php'
      : '/export-logger.php';

    console.log('Using logger URL:', loggerUrl);

    const response = await fetch(loggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      console.warn('Failed to log export activity:', response.status, response.statusText);
      return; // Do not throw
    }

    // In dev, the PHP file may return HTML or plain text. Try JSON, fall back to text.
    const text = await response.text();
    try {
      const result = JSON.parse(text);
      console.log('Export logged successfully:', result);
      if (!result.emailSent) {
        console.warn('Email was not sent:', result.emailError || 'Unknown error');
      }
    } catch {
      // Non-JSON response (e.g., HTML dev page). Log and continue.
      console.log('Export logged (non-JSON response):', text.substring(0, 200));
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

// Build a consistent filename like: sundial-[Location]-YYYYMMDD-HHMM.ext
function buildFilename(options: ExportOptions, ext: 'svg' | 'png' | 'pdf'): string {
  const sanitize = (s: string) => s
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '') // remove illegal filename chars
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .replace(/\s/g, '_')
    .slice(0, 60);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const base = 'sundial';
  const loc = options.locationName ? sanitize(options.locationName) : '';
  const name = [base, loc].filter(Boolean).join('-');
  return `${name}-${stamp}.${ext}`;
}

/**
 * Logs print activity to the server (exported for use in components)
 */
export async function logPrintActivity(options: {
  pageSize: PageSize;
  orientation: 'Landscape' | 'Portrait';
  customWidth?: number;
  customHeight?: number;
  dateRange?: string;
  gnomonType?: string;
  locationName?: string;
  sundialNotesMode?: string;
  dialTextBlock?: string;
  latitude?: number;
  longitude?: number;
  gnomonHeight?: number;
  inclineType?: import('../types').InclineType;
  tiltAngle?: number;
}): Promise<void> {
  try {
    const dialTextBlockInterpreted = interpretDialTextBlockForEmail(options.dialTextBlock || '', {
      locationName: options.locationName,
      latitude: options.latitude,
      longitude: options.longitude,
      dateRange: options.dateRange as import('../types').DateRange | undefined,
      gnomonHeightMm: options.gnomonHeight,
      inclineType: options.inclineType,
      tiltAngle: options.tiltAngle,
    });

    const logData = {
      exportFormat: 'PRINT', // Use 'PRINT' to distinguish from file exports
      pageSize: options.pageSize,
      dateRange: options.dateRange || 'Unknown',
      gnomonType: options.gnomonType || 'Unknown',
      locationName: options.locationName || 'Unknown',
      sundialNotesMode: options.sundialNotesMode || 'Unknown',
      dialTextBlock: options.dialTextBlock || '',
      dialTextBlockInterpreted,
      latitude: options.latitude,
      longitude: options.longitude,
    };

    console.log('Sending print log data to server:', logData);

    // Use production URL in development since Vite doesn't handle PHP
    const isDevelopment = import.meta.env.DEV;
    const loggerUrl = isDevelopment 
      ? 'https://sundial.gennetten.org/export-logger.php'
      : '/export-logger.php';

    console.log('Using logger URL:', loggerUrl);

    const response = await fetch(loggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      console.warn('Failed to log print activity:', response.status, response.statusText);
      return; // Do not throw
    }

    // In dev, the PHP file may return HTML or plain text. Try JSON, fall back to text.
    const text = await response.text();
    try {
      const result = JSON.parse(text);
      console.log('Print logged successfully:', result);
      if (!result.emailSent) {
        console.warn('Email was not sent:', result.emailError || 'Unknown error');
      }
    } catch {
      // Non-JSON response (e.g., HTML dev page). Log and continue.
      console.log('Print logged (non-JSON response):', text.substring(0, 200));
    }
  } catch (error) {
    console.warn('Error logging print activity:', error);
    // Don't throw error - logging failure shouldn't prevent printing
  }
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
        customWidth: options.customWidth,
        customHeight: options.customHeight,
      });
      
      if (!svgContent) {
        throw new Error('Failed to create SVG content');
      }
      
      downloadSVG(svgContent, buildFilename(options, 'svg'));
      console.log('SVG export completed successfully');
    } else if (options.format === 'PDF') {
      console.log('Exporting as PDF...');
      await exportPDF(options);
      console.log('PDF export completed successfully');
    }
    
    // Log the export activity after successful export
    await logExportActivity(options);
  } catch (error) {
    console.error(`Error exporting ${options.format}:`, error);
    throw error;
  }
}

/**
 * Exports as vector PDF by converting the generated SVG
 */
async function exportPDF(options: ExportOptions): Promise<void> {
  // Add a small delay to ensure all DOM updates are complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Build SVG content using the existing SVG export path
  console.log('PDF Export calling SVG export with options:', {
    pageSize: options.pageSize,
    orientation: options.orientation,
    showBackground: options.showBackground,
    backgroundColor: options.backgroundColor,
    customWidth: options.pageSize === 'Custom' ? options.customWidth : 'not passed',
    customHeight: options.pageSize === 'Custom' ? options.customHeight : 'not passed',
  });
  
  const svgContent = createSVGExport({
    pageSize: options.pageSize,
    orientation: options.orientation,
    showBackground: options.showBackground,
    backgroundColor: options.backgroundColor,
    // Only pass custom dimensions if pageSize is actually 'Custom'
    ...(options.pageSize === 'Custom' && {
      customWidth: options.customWidth,
      customHeight: options.customHeight,
    }),
  });

  if (!svgContent) {
    throw new Error('Failed to create SVG content for PDF export');
  }

  // Parse the SVG string back into a DOM element
  const parsed = new DOMParser().parseFromString(svgContent, 'image/svg+xml');
  const svgEl = parsed.documentElement as unknown as SVGSVGElement;
  if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
    throw new Error('Parsed SVG content is invalid');
  }
  
  console.log('Parsed SVG dimensions:', {
    width: svgEl.getAttribute('width'),
    height: svgEl.getAttribute('height'),
    viewBox: svgEl.getAttribute('viewBox')
  });
  
  // Also log the first few lines of the SVG content to see what was actually generated
  console.log('SVG content first 300 chars:', svgContent.substring(0, 300));
  
  // Extract the SVG tag to see the exact dimensions
  const svgTagMatch = svgContent.match(/<svg[^>]*>/);
  if (svgTagMatch) {
    console.log('SVG tag:', svgTagMatch[0]);
  }

  // Ensure strokes don't get thicker due to scaling when fitting to page
  try {
    const styleEl = parsed.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.setAttribute('type', 'text/css');
    styleEl.textContent = 'path,line,polyline,polygon,circle,ellipse,rect { vector-effect: non-scaling-stroke; }';
    svgEl.insertBefore(styleEl, svgEl.firstChild);
  } catch {
    // Silently fail if style element insertion fails
  }

  // Extract dimensions directly from the SVG that was generated
  const svgWidthAttr = svgEl.getAttribute('width');
  const svgHeightAttr = svgEl.getAttribute('height');
  
  if (!svgWidthAttr || !svgHeightAttr) {
    throw new Error('SVG missing width or height attributes');
  }
  
  // Parse the dimensions (should be in format "792pt")
  const widthPt = parseFloat(svgWidthAttr.replace('pt', ''));
  const heightPt = parseFloat(svgHeightAttr.replace('pt', ''));
  
  console.log('Using SVG dimensions for PDF (pt):', { widthPt, heightPt });

  // Adjust stroke width and dash lengths to counteract viewBox scaling
  const viewBoxAttr = svgEl.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+/).map(Number);
    if (parts.length === 4) {
      const [, , vbW, vbH] = parts;
      const scaleX = widthPt / vbW;
      const scaleY = heightPt / vbH;
      const strokeScale = (isFinite(scaleX) && isFinite(scaleY) && scaleX > 0 && scaleY > 0) ? (scaleX === scaleY ? scaleX : Math.max(scaleX, scaleY)) : 1;
      if (strokeScale !== 1) {
        const elements = svgEl.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse');
        elements.forEach(el => {
          const sw = el.getAttribute('stroke-width');
          if (sw) {
            const hasPx = /px$/i.test(sw);
            const num = parseFloat(sw);
            if (isFinite(num) && num > 0) {
              const adjusted = num / strokeScale;
              el.setAttribute('stroke-width', hasPx ? `${adjusted}px` : String(adjusted));
            }
          }
          const dash = el.getAttribute('stroke-dasharray');
          if (dash && dash !== 'none') {
            const hasPxDash = /px/i.test(dash);
            const parts = dash.split(/[\s,]+/).filter(Boolean);
            const adjusted = parts.map(p => {
              const val = parseFloat(p);
              return isFinite(val) ? (val / strokeScale) : p;
            }).join(',');
            el.setAttribute('stroke-dasharray', hasPxDash ? adjusted.replace(/(\d+(?:\.\d+)?)(?!px)/g, '$1px') : adjusted);
          }
        });
      }
    }
  }

  // Dynamically import dependencies to keep initial bundle small
  const jsPDFModule = await import('jspdf');
  const jsPDF = (jsPDFModule as { jsPDF: new (options?: unknown) => {
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
    save(filename: string): void;
  } }).jsPDF;
  const svg2pdfModule: Record<string, unknown> = await import('svg2pdf.js');
  const svg2pdfFn: unknown = svg2pdfModule?.default || svg2pdfModule?.svg2pdf || (globalThis as Record<string, unknown>)?.svg2pdf;
  if (typeof svg2pdfFn !== 'function') {
    throw new Error('svg2pdf function not available (module format mismatch)');
  }

  // Use pt so the SVG's pt dimensions map 1:1 to PDF, avoiding any implicit scaling
  console.log('Creating jsPDF with format:', [widthPt, heightPt]);
  
  // Determine orientation based on dimensions
  const orientation = widthPt > heightPt ? 'landscape' : 'portrait';
  console.log('Calculated orientation:', orientation);
  
  // Try using standard format name if it matches
  let format: string | number[] = [widthPt, heightPt];
  if (Math.abs(widthPt - 792) < 1 && Math.abs(heightPt - 612) < 1) {
    format = 'letter';
    console.log('Using standard letter format with landscape orientation');
  } else if (Math.abs(widthPt - 612) < 1 && Math.abs(heightPt - 792) < 1) {
    format = 'letter';
    console.log('Using standard letter format with portrait orientation');
  }
  
  const doc = new jsPDF({ 
    unit: 'pt', 
    format: format,
    orientation: orientation as 'landscape' | 'portrait'
  });
  console.log('jsPDF created with internal page size:', doc.internal.pageSize);
  console.log('jsPDF page dimensions:', {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight()
  });









  // Process the North Point specifically to handle its unique rendering issues
  processNorthPointForPdf(svgEl);

  // Render SVG without forcing a different width/height (prevents stroke/dash scaling)
  await Promise.resolve(svg2pdfFn(svgEl, doc, { x: 0, y: 0, useCSS: true }));

  // Trigger download
  doc.save(buildFilename(options, 'pdf'));
}

/**
 * Finds and processes the North Point (Compass Rose) in the SVG for PDF export.
 * This function simplifies the complex transform attribute to ensure it is rendered correctly.
 * @param svgEl The SVG element to process.
 */
function processNorthPointForPdf(svgEl: SVGSVGElement) {
  console.log('Processing North Point for PDF export by simplifying its transform...');

  const groupElements = svgEl.querySelectorAll('g');
  let northPointFound = false;

  groupElements.forEach(groupEl => {
    const transform = groupEl.getAttribute('transform');
    if (transform && transform.includes('translate') && transform.includes('scale') && transform.includes('-460.035')) {
      console.log('Found North Point group with transform:', transform);
      northPointFound = true;

      // This logic is borrowed from the successful PNG export
      const translateMatch = transform.match(/translate\(([^)]+)\)/);
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);

      if (translateMatch && scaleMatch) {
        const [tx, ty] = translateMatch[1].split(',').map(s => parseFloat(s.trim()));
        const scaleFactor = parseFloat(scaleMatch[1]);

        // The original transform is a chain that svg2pdf.js cannot handle.
        // We simplify it to a single translate and scale.
        const finalTx = tx + (-460.035 * scaleFactor);
        const finalTy = ty + (-600 * scaleFactor);
        const newTransform = `translate(${finalTx}, ${finalTy}) scale(${scaleFactor})`;

        console.log('Simplified North Point transform to:', newTransform);
        groupEl.setAttribute('transform', newTransform);
      }
    }
  });

  if (!northPointFound) {
    console.log('North Point group not found in SVG for PDF processing.');
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
  const domHeight = svgContainer.offsetHeight;
  const pixelWidth = printWidth * dpi;
  let scale = pixelWidth / domWidth;

  // Check for potential canvas size limits
  const maxCanvasSize = 32767; // Common browser limit
  const estimatedWidth = domWidth * scale;
  const estimatedHeight = domHeight * scale;
  
  if (estimatedWidth > maxCanvasSize || estimatedHeight > maxCanvasSize) {
    console.warn('Canvas would exceed browser limits, reducing scale');
    const maxScale = Math.min(maxCanvasSize / domWidth, maxCanvasSize / domHeight);
    scale = Math.min(scale, maxScale * 0.9); // Use 90% of max to be safe
    console.log('Adjusted scale to:', scale);
  }

  // Minimal logging for PNG export
  console.log(`PNG Export: ${domWidth}x${domHeight} @ ${dpi}DPI (scale: ${scale.toFixed(2)})`);

  // Find the SVG element within the container
  const originalSvg = svgContainer.querySelector('svg');
  if (!originalSvg) {
    console.error('No SVG found in container. Container HTML:', svgContainer.innerHTML.substring(0, 500));
    throw new Error('No SVG found in the container');
  }
  
  console.log(`Original SVG found: ${originalSvg.tagName}`);
  console.log(`Original SVG dimensions: ${originalSvg.clientWidth}x${originalSvg.clientHeight}`);
  console.log(`SVG viewBox: ${originalSvg.getAttribute('viewBox')}`);
  console.log(`SVG children count: ${originalSvg.children.length}`);
  
  // Log what children the original SVG has
  for (let i = 0; i < originalSvg.children.length; i++) {
    const child = originalSvg.children[i];
    console.log(`Original SVG child ${i}: ${child.tagName}, id="${child.id}", class="${child.className}"`);
  }
  
  // Check if there are other SVGs in the container (like compass rose)
  const allSvgsInContainer = svgContainer.querySelectorAll('svg');
  console.log(`Total SVGs in container: ${allSvgsInContainer.length}`);
  if (allSvgsInContainer.length > 1) {
    console.log('Multiple SVGs found - checking for compass rose...');
    allSvgsInContainer.forEach((svg, index) => {
      console.log(`SVG ${index}: ${svg.getAttribute('width')}x${svg.getAttribute('height')}, children: ${svg.children.length}`);
    });
  }
  
  // Instead of creating a new container, let's clone the original container
  // but ensure it has the right content and dimensions
  const tempContainer = svgContainer.cloneNode(true) as HTMLElement;
  console.log(`Cloned container children count: ${tempContainer.children.length}`);
  
  // Find the SVG in the cloned container
  const tempSvg = tempContainer.querySelector('svg');
  if (!tempSvg) {
    console.error('No SVG found in cloned container!');
    throw new Error('Cloned container has no SVG');
  }
  
  console.log(`Cloned SVG children count: ${tempSvg.children.length}`);
  
  // Log what children we actually have
  for (let i = 0; i < tempSvg.children.length; i++) {
    const child = tempSvg.children[i];
    console.log(`SVG child ${i}: ${child.tagName}, id="${child.id}", class="${child.className}"`);
  }
  
  // Verify the clone has content
  if (tempSvg.children.length === 0) {
    console.error('Cloned SVG has no children! Trying to re-clone...');
    // Try to replace the empty SVG with a fresh clone
    const freshSvgClone = originalSvg.cloneNode(true) as SVGElement;
    tempSvg.parentNode?.replaceChild(freshSvgClone, tempSvg);
    console.log(`Fresh clone children count: ${freshSvgClone.children.length}`);
  }
  
  // Set up the container dimensions
  let svgWidth = originalSvg.clientWidth || (originalSvg as unknown as HTMLElement).offsetWidth || domWidth;
  let svgHeight = originalSvg.clientHeight || (originalSvg as unknown as HTMLElement).offsetHeight || domHeight;
  
  // Fallback: if SVG dimensions are still zero, use container dimensions
  if (svgWidth === 0) svgWidth = domWidth;
  if (svgHeight === 0) svgHeight = domHeight;
  
  // Ensure minimum dimensions
  if (svgWidth < 100) svgWidth = Math.max(domWidth, 400);
  if (svgHeight < 100) svgHeight = Math.max(domHeight, 400);
  
  // Copy important styles from the original container
  const originalComputedStyle = window.getComputedStyle(svgContainer);
  tempContainer.style.display = originalComputedStyle.display;
  tempContainer.style.justifyContent = originalComputedStyle.justifyContent;
  tempContainer.style.alignItems = originalComputedStyle.alignItems;
  tempContainer.style.overflow = 'visible';
  
  // Apply dimensions to the container (keep original size)
  tempContainer.style.width = `${svgWidth}px`;
  tempContainer.style.height = `${svgHeight}px`;
  tempContainer.style.minWidth = `${svgWidth}px`;
  tempContainer.style.minHeight = `${svgHeight}px`;
  
  // Fix the SVG dimensions for html2canvas
  if (tempSvg) {
    // Remove percentage-based dimensions and set explicit pixel dimensions
    tempSvg.removeAttribute('width');
    tempSvg.removeAttribute('height');
    tempSvg.setAttribute('width', svgWidth.toString());
    tempSvg.setAttribute('height', svgHeight.toString());
    
    // Ensure the SVG fills the container
    tempSvg.style.width = `${svgWidth}px`;
    tempSvg.style.height = `${svgHeight}px`;
    tempSvg.style.display = 'block';
    
    console.log(`Fixed SVG dimensions: ${tempSvg.getAttribute('width')}x${tempSvg.getAttribute('height')}`);
  }
  
  console.log(`Temp container setup: ${svgWidth}x${svgHeight}`);
  console.log(`Temp container final HTML length: ${tempContainer.outerHTML.length}`);
  
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
      // which are used for dial orientation
      if (transform.includes('matrix') || transform.split(' ').length > 4) {
        textEl.removeAttribute('transform');
      }
    }
  });
  
  // Also check for problematic group transforms
  const groupElements = tempContainer.querySelectorAll('g');
  groupElements.forEach(groupEl => {
    const transform = groupEl.getAttribute('transform');
    if (transform) {
      // Special handling for NorthPoint (compass rose) transforms
      // These have the pattern: translate(x, y) scale(s) translate(-460.035, -600) [rotate(180 460.035 600)]
      if (transform.includes('translate') && transform.includes('scale') && transform.includes('-460.035')) {
        console.log('Found NorthPoint transform, attempting to fix for html2canvas:', transform);
        
        // Parse the transform components
        const translateMatch1 = transform.match(/translate\(([^)]+)\)/);
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        const rotateMatch = transform.match(/rotate\(180 460\.035 600\)/);
        
        if (translateMatch1 && scaleMatch) {
          const [tx, ty] = translateMatch1[1].split(',').map(s => parseFloat(s.trim()));
          const scaleFactor = parseFloat(scaleMatch[1]);
          
          console.log('NorthPoint transform parsing:', {
            originalTransform: transform,
            tx, ty, scaleFactor,
            rotateMatch: !!rotateMatch
          });
          
          // The original transform chain is: translate(tx, ty) scale(s) translate(-460.035, -600) [rotate(180 460.035 600)]
          // We need to apply the transforms in order to get the final position
          
          // After translate(tx, ty) scale(s), the coordinate system is scaled
          // Then translate(-460.035, -600) moves by (-460.035 * s, -600 * s) in the original coordinate system
          const finalTx = tx + (-460.035 * scaleFactor);
          const finalTy = ty + (-600 * scaleFactor);
          
          let newTransform = `translate(${finalTx}, ${finalTy}) scale(${scaleFactor})`;
          
          // Add rotation if present - rotate around the NorthPoint center in the scaled coordinate system
          if (rotateMatch) {
            // The rotation center should be at the center of the NorthPoint after all transforms
            newTransform += ` rotate(180 460.035 600)`;
          }
          
          console.log('Simplified NorthPoint transform:', {
            finalTx, finalTy, scaleFactor,
            newTransform
          });
          groupEl.setAttribute('transform', newTransform);
        }
      }
      // Handle other complex transforms
      else if (transform.includes('scale') && transform.includes('rotate')) {
        // Check if this is a dial orientation transform (scale + rotate(180))
        if (transform.includes('rotate(180)')) {
          // Keep the dial orientation transform as-is
        } else if (transform.includes('matrix') || transform.split(' ').length > 6) {
          // Only simplify very complex transforms
          const scaleMatch = transform.match(/scale\([^)]+\)/);
          if (scaleMatch) {
            groupEl.setAttribute('transform', scaleMatch[0]);
          }
        }
      }
    }
  });
  
  // Temporarily add the container to the DOM for html2canvas
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  document.body.appendChild(tempContainer);
  
  // Force layout and check dimensions after adding to DOM
  void tempContainer.offsetHeight; // Force reflow by accessing layout property
  console.log(`Final temp container dimensions: ${tempContainer.offsetWidth}x${tempContainer.offsetHeight}`);
  
  // If the temp container has no dimensions, try to fix it
  if (tempContainer.offsetWidth === 0 || tempContainer.offsetHeight === 0) {
    console.warn('Temp container has zero dimensions, attempting to fix...');
    tempContainer.style.width = `${svgWidth}px`;
    tempContainer.style.height = `${svgHeight}px`;
    tempContainer.style.minWidth = `${svgWidth}px`;
    tempContainer.style.minHeight = `${svgHeight}px`;
    
    // Force another reflow
    void tempContainer.offsetHeight; // Force reflow by accessing layout property
    console.log(`After fix: ${tempContainer.offsetWidth}x${tempContainer.offsetHeight}`);
  }

  try {
    const startTime = performance.now();
    
    // Final verification before html2canvas
    const finalSvg = tempContainer.querySelector('svg');
    if (!finalSvg || finalSvg.children.length === 0) {
      console.error('CRITICAL: No SVG content found before html2canvas!');
      console.error('Container HTML:', tempContainer.outerHTML.substring(0, 2000));
      throw new Error('No SVG content to export');
    }
    
    console.log(`Final verification: SVG has ${finalSvg.children.length} children`);
    console.log(`SVG viewBox: ${finalSvg.getAttribute('viewBox')}`);
    
    // Capture at original size with scale option for high DPI
    const containerWidth = tempContainer.offsetWidth;
    const containerHeight = tempContainer.offsetHeight;
    
    console.log(`html2canvas options: width=${containerWidth}, height=${containerHeight}, scale=${scale}`);
    console.log(`Container dimensions: ${containerWidth}x${containerHeight}`);
    
    const canvasPromise = html2canvas(tempContainer, {
      backgroundColor: options.showBackground ? (options.backgroundColor || '#ffffff') : '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false, // Disable html2canvas logging for better performance
      ...(scale > 1 && { scale: scale }), // Add scale option if > 1
    } as Parameters<typeof html2canvas>[1]);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PNG export timed out after 30 seconds')), 30000);
    });
    
    const finalCanvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;
    const endTime = performance.now();
    console.log(`PNG export completed in ${(endTime - startTime).toFixed(0)}ms`);
    console.log(`Final canvas dimensions: ${finalCanvas.width}x${finalCanvas.height}`);
    
    // Remove the temporary container now that we have the canvas
    document.body.removeChild(tempContainer);
    
    return new Promise((resolve, reject) => {
      try {
        finalCanvas.toBlob((blob) => {
          if (blob) {
            downloadFile(blob, buildFilename(options, 'png'), 'image/png');
            resolve();
          } else {
            console.error('Canvas toBlob returned null');
            console.error('Canvas width:', finalCanvas.width, 'height:', finalCanvas.height);
            console.error('Canvas context:', finalCanvas.getContext('2d'));
            
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
              width: svgContainer.offsetWidth,
              height: svgContainer.offsetHeight,
              logging: false,
            } as Parameters<typeof html2canvas>[1]).then(fallbackCanvas => {
              fallbackCanvas.toBlob((fallbackBlob) => {
                if (fallbackBlob) {
                  console.log('Fallback PNG export succeeded');
                  downloadFile(fallbackBlob, buildFilename(options, 'png'), 'image/png');
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

