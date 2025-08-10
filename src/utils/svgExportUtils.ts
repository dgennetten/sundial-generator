// src/utils/svgExportUtils.ts
// Specialized SVG export utilities

import type { LineStyle } from '../components/LineSettings';

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
 * Extracts line styles from the DOM to use for layer naming
 */
function getLineStylesFromDOM(): Record<string, string> {
  const lineStyleMap: Record<string, string> = {};
  
  try {
    // Try to get line styles from localStorage (where they're stored)
    const storedStyles = localStorage.getItem('sundial-line-styles');
    if (storedStyles) {
      const styles = JSON.parse(storedStyles);
      if (Array.isArray(styles)) {
        styles.forEach((style: LineStyle) => {
          if (style.id && style.name) {
            lineStyleMap[style.id] = style.name;
          }
        });
      }
    }
  } catch (e) {
    console.warn('Could not load line styles from localStorage:', e);
  }
  
  // Add some default mappings in case localStorage is empty
  if (Object.keys(lineStyleMap).length === 0) {
    lineStyleMap['0.5mm-black'] = 'Thick Black';
    lineStyleMap['default-hairline'] = 'Hairline';
    lineStyleMap['dashed-hairline'] = 'Dashed Hairline';
    lineStyleMap['dotted-hairline'] = 'Dotted Hairline';
  }
  
  console.log('Line style mapping:', lineStyleMap);
  return lineStyleMap;
}

/**
 * Creates an SVG export by directly serializing the sundial SVG with proper formatting
 */
export function createSVGExport(options: SVGExportOptions): string | null {
  console.log('Starting SVG export with options:', options);
  
  // Get line styles from the application state to use for layer naming
  const lineStyles = getLineStylesFromDOM();
  
  // Find the sundial preview container using the robust logic
  console.log('=== SVG EXPORT CONTAINER SEARCH ===');
  const previewCards = document.querySelectorAll('.card');
  let svgContainer: HTMLElement | null = null;
  
  console.log('Found', previewCards.length, 'cards');
  
  for (const card of previewCards) {
    const title = card.querySelector('.card-title');
    console.log('Card title:', title?.textContent);
    
    if (title && title.textContent && title.textContent.includes('Sundial Preview')) {
      console.log('Found Sundial Preview card');
      
      // Try multiple selectors to find the SVG container
      svgContainer = card.querySelector('div[style*="display: flex"]') as HTMLElement;
      console.log('Found flex div:', !!svgContainer);
      
      if (!svgContainer) {
        // Try alternative selectors
        const svg = card.querySelector('svg');
        console.log('Found SVG in card:', !!svg);
        if (svg) {
          svgContainer = svg.parentElement as HTMLElement;
          console.log('Using SVG parent as container');
        }
      }
      
      if (!svgContainer) {
        // Additional fallback - find any div with SVG
        const allDivs = card.querySelectorAll('div');
        for (const div of allDivs) {
          if (div.querySelector('svg[viewBox]')) {
            svgContainer = div as HTMLElement;
            console.log('Found container via viewBox selector');
            break;
          }
        }
      }
      
      if (svgContainer) {
        console.log('Final container found');
        break;
      }
    }
  }
  
  if (!svgContainer) {
    console.error('Could not find SVG container');
    return null;
  }
  
  console.log('Found SVG container:', svgContainer);
  
  // Find the SVG element within the container
  const svgElement = svgContainer.querySelector('svg') as SVGSVGElement;
  if (!svgElement) {
    console.error('Could not find SVG element in container');
    console.log('Container HTML:', svgContainer.innerHTML.substring(0, 500));
    return null;
  }
  
  console.log('Found SVG element:', svgElement);
  console.log('SVG viewBox:', svgElement.getAttribute('viewBox'));
  console.log('SVG children count:', svgElement.children.length);
  
  // Get page dimensions
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
  
  // Convert to points for SVG (1 inch = 72 points)
  const pageWidthPt = printWidth * 72;
  const pageHeightPt = printHeight * 72;
  
  // Get the original viewBox
  const originalViewBox = svgElement.getAttribute('viewBox') || '';
  console.log('Original viewBox:', originalViewBox);
  
  // Create the export SVG structure
  let svgContent = '';
  
  // Add XML declaration
  svgContent += '<?xml version="1.0" encoding="UTF-8"?>\n';
  
  // Start SVG element with proper dimensions and namespace
  svgContent += `<svg xmlns="http://www.w3.org/2000/svg" `;
  svgContent += `width="${pageWidthPt}pt" height="${pageHeightPt}pt" `;
  
  if (originalViewBox) {
    svgContent += `viewBox="${originalViewBox}" `;
  } else {
    // Try to get bounding box
    try {
      const bbox = svgElement.getBBox();
      svgContent += `viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" `;
      console.log('Created viewBox from bbox:', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    } catch {
      console.warn('Could not get bounding box, using default viewBox');
      svgContent += `viewBox="0 0 800 600" `;
    }
  }
  
  svgContent += `preserveAspectRatio="xMidYMid meet">\n`;
  
  // Add background if specified
  if (options.showBackground) {
    const bgColor = options.backgroundColor || '#ffffff';
    
    // Position background to cover the entire viewBox area
    if (originalViewBox) {
      const [x, y, width, height] = originalViewBox.split(' ').map(Number);
      svgContent += `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${bgColor}"/>\n`;
      console.log(`Background positioned at: x=${x}, y=${y}, width=${width}, height=${height}`);
    } else {
      svgContent += `  <rect x="0" y="0" width="100%" height="100%" fill="${bgColor}"/>\n`;
      console.log('Using percentage-based background positioning');
    }
  }
  
  // Extract and organize the SVG content by line style
  const organizedContent = extractAndOrganizeSVGContentByLineStyle(svgElement, lineStyles);
  console.log('Organized content layers:', Object.keys(organizedContent));
  
  // Add each layer as a separate group
  Object.entries(organizedContent).forEach(([layerName, content]) => {
    if (content.trim()) {
      svgContent += `  <!-- ${layerName} -->\n`;
      svgContent += `  <g id="${layerName.toLowerCase().replace(/\s+/g, '-')}" data-layer="${layerName}">\n`;
      svgContent += content;
      svgContent += `  </g>\n`;
    }
  });
  
  // Close SVG
  svgContent += '\n</svg>';
  
  console.log('Generated SVG content length:', svgContent.length);
  console.log('SVG preview:', svgContent.substring(0, 500) + '...');
  
  return svgContent;
}

/**
 * Extracts and organizes SVG content into layers based on line styles
 */
function extractAndOrganizeSVGContentByLineStyle(svgElement: SVGSVGElement, lineStyleMap: Record<string, string>): Record<string, string> {
  const layers: Record<string, string> = {};
  
  // Special layers for non-line elements
  const specialLayers: Record<string, string> = {
    'Background': '',
    'Page Border': '',
    'Labels': '',
    'Gnomon': '',
    'Text Block': '',
    'Other Elements': ''
  };

  console.log('Analyzing SVG structure by line style...');
  console.log('SVG children:', svgElement.children.length);

  // Process each child element of the SVG
  Array.from(svgElement.children).forEach((child, index) => {
    console.log(`Processing child ${index}:`, child.tagName, {
      class: child.getAttribute('class'),
      stroke: child.getAttribute('stroke'),
      fill: child.getAttribute('fill'),
      strokeDasharray: child.getAttribute('stroke-dasharray'),
      id: child.getAttribute('id')
    });
    
    // Skip clipping boundary (debugging element)
    if ((child.getAttribute('stroke') === '#ccc' && 
         child.getAttribute('fill') === 'none' && 
         child.getAttribute('stroke-dasharray') === '5,5') ||
        (child.getAttribute('stroke-dasharray') === '5,5' && 
         child.getAttribute('fill') === 'none')) {
      console.log('Skipping clipping boundary element');
      return;
    }

    const serialized = new XMLSerializer().serializeToString(child);
    const fixedContent = fixSVGContent(serialized);

    // Categorize element by line style or element type
    const layerName = categorizeElementForLayer(child, lineStyleMap);
    
    if (Object.prototype.hasOwnProperty.call(specialLayers, layerName)) {
      specialLayers[layerName] += `    ${fixedContent}\n`;
    } else {
      // It's a line style layer
      if (!layers[layerName]) {
        layers[layerName] = '';
      }
      layers[layerName] += `    ${fixedContent}\n`;
    }
  });

  // Combine special layers and line style layers
  const allLayers = { ...specialLayers, ...layers };
  
  // Remove empty layers
  Object.keys(allLayers).forEach(key => {
    if (!allLayers[key].trim()) {
      delete allLayers[key];
    }
  });

  return allLayers;
}

/**
 * Categorizes an element for layer assignment
 */
function categorizeElementForLayer(element: Element, lineStyleMap: Record<string, string>): string {
  // Handle special element types first
  if (element.tagName === 'rect') {
    const fill = element.getAttribute('fill');
    const stroke = element.getAttribute('stroke');
    
    if (fill && fill !== 'none' && !stroke) {
      return 'Background';
    } else if (stroke) {
      return 'Page Border';
    }
  }
  
  if (element.tagName === 'text') {
    return 'Labels';
  }
  
  // For groups and line elements, analyze their line style
  const lineStyleInfo = extractLineStyleFromElementString(element);
  
  if (lineStyleInfo) {
    const styleKey = lineStyleInfo.styleKey;
    const styleName = lineStyleMap[styleKey] || lineStyleInfo.descriptiveName || styleKey;
    return styleName;
  }
  
  // Check if it's a gnomon element
  if (isGnomonElementString(element)) {
    return 'Gnomon';
  }
  
  // Check if it's a text block
  if (isTextBlockElementString(element)) {
    return 'Text Block';
  }
  
  return 'Other Elements';
}

/**
 * Extracts line style information from an SVG element (string-based version)
 */
function extractLineStyleFromElementString(element: Element): { styleKey: string, descriptiveName: string } | null {
  // Check if element has line/stroke properties
  const stroke = element.getAttribute('stroke');
  const strokeWidth = element.getAttribute('stroke-width');
  const strokeDasharray = element.getAttribute('stroke-dasharray');
  
  if (!stroke || stroke === 'none') {
    // Check children for line properties (for groups)
    const children = Array.from(element.children);
    for (const child of children) {
      const childResult = extractLineStyleFromElementString(child);
      if (childResult) return childResult;
    }
    return null;
  }
  
  // Create a style key based on the visual properties
  let styleKey = '';
  let descriptiveName = '';
  
  // Determine line width
  if (strokeWidth) {
    if (strokeWidth.includes('0.1') || strokeWidth.includes('hairline')) {
      styleKey += 'hairline';
      descriptiveName += 'Hairline ';
    } else if (strokeWidth.includes('0.5')) {
      styleKey += '0.5mm';
      descriptiveName += 'Medium ';
    } else if (strokeWidth.includes('1')) {
      styleKey += '1mm';
      descriptiveName += 'Thick ';
    } else {
      styleKey += strokeWidth.replace(/[^a-zA-Z0-9]/g, '');
      descriptiveName += strokeWidth + ' ';
    }
  } else {
    styleKey += 'default';
    descriptiveName += 'Default ';
  }
  
  // Determine line style
  if (strokeDasharray && strokeDasharray !== 'none') {
    if (strokeDasharray.includes('5,5') || strokeDasharray.includes('10,10')) {
      styleKey += '-dashed';
      descriptiveName += 'Dashed';
    } else if (strokeDasharray.includes('2,2') || strokeDasharray.includes('1,1')) {
      styleKey += '-dotted';
      descriptiveName += 'Dotted';
    } else {
      styleKey += '-custom-dash';
      descriptiveName += 'Custom Dashed';
    }
  } else {
    styleKey += '-solid';
    descriptiveName += 'Solid';
  }
  
  // Add color info
  if (stroke && stroke !== 'black' && stroke !== '#000000') {
    styleKey += '-' + stroke.replace(/[^a-zA-Z0-9]/g, '');
    descriptiveName += ' ' + stroke;
  } else {
    styleKey += '-black';
    descriptiveName += ' Black';
  }
  
  return { styleKey, descriptiveName };
}

/**
 * Checks if an element is a gnomon element (string-based version)
 */
function isGnomonElementString(element: Element): boolean {
  if (element.tagName === 'polygon' || element.tagName === 'path') {
    return true;
  }
  
  if (element.tagName === 'g') {
    const children = Array.from(element.children);
    return children.some(child => 
      child.tagName === 'polygon' || 
      (child.tagName === 'path' && child.getAttribute('d')?.includes('M'))
    );
  }
  
  return false;
}

/**
 * Checks if an element is a text block element (string-based version)
 */
function isTextBlockElementString(element: Element): boolean {
  if (element.tagName === 'text') {
    return true;
  }
  
  if (element.tagName === 'g') {
    const children = Array.from(element.children);
    return children.some(child => child.tagName === 'text' || child.tagName === 'tspan');
  }
  
  return false;
}

/**
 * Fixes common issues in SVG content for export
 */
function fixSVGContent(svgContent: string): string {
  // Fix stroke-width values without units
  svgContent = svgContent.replace(/stroke-width="([0-9.]+)"/g, (_, value) => {
    return `stroke-width="${value}px"`;
  });
  
  // Fix stroke-dasharray values without units
  svgContent = svgContent.replace(/stroke-dasharray="([0-9.,\s]+)"/g, (_, value) => {
    const fixedValue = value.split(',').map((v: string) => {
      const trimmed = v.trim();
      const num = parseFloat(trimmed);
      if (!isNaN(num) && !trimmed.includes('px')) {
        return num + 'px';
      }
      return trimmed;
    }).join(',');
    return `stroke-dasharray="${fixedValue}"`;
  });
  
  // Fix font-size values without units
  svgContent = svgContent.replace(/font-size="([0-9.]+)"/g, (_, value) => {
    return `font-size="${value}px"`;
  });
  
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