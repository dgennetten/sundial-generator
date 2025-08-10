// src/utils/simpleSvgExport.ts
// Simplified SVG export for debugging

import type { LineStyle } from '../components/LineSettings';

interface SpecialLayers {
  background: SVGGElement;
  border: SVGGElement;
  labels: SVGGElement;
  gnomon: SVGGElement;
  textBlock: SVGGElement;
  other: SVGGElement;
}

export interface SimpleSVGExportOptions {
  pageSize: 'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom';
  orientation: 'Landscape' | 'Portrait';
  showBackground?: boolean;
  backgroundColor?: string;
  customWidth?: number;
  customHeight?: number;
  customUnits?: 'in' | 'cm';
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
 * Simple SVG export that just clones the existing SVG with minimal processing
 */
export function createSimpleSVGExport(options: SimpleSVGExportOptions): string | null {
  // Get line styles from the application state to use for layer naming
  const lineStyles = getLineStylesFromDOM();
  console.log('=== SIMPLE SVG EXPORT DEBUG ===');
  console.log('Options:', options);
  
  // Find the sundial preview container more specifically
  // We need to find the div that contains the actual sundial SVG, not the card header
  const previewCards = document.querySelectorAll('.card');
  let svgContainer: HTMLElement | null = null;
  
  console.log('Found', previewCards.length, 'cards');
  
  for (const card of previewCards) {
    const title = card.querySelector('.card-title');
    console.log('Card title:', title?.textContent);
    
    if (title && title.textContent && title.textContent.includes('Sundial Preview')) {
      console.log('Found Sundial Preview card');
      
      // Debug: log all divs in this card
      const allDivs = card.querySelectorAll('div');
      console.log('Found', allDivs.length, 'divs in the card');
      
      allDivs.forEach((div, index) => {
        const style = div.getAttribute('style');
        console.log(`Div ${index}:`, {
          style: style,
          hasFlexDisplay: style?.includes('display: flex'),
          hasSVG: div.querySelector('svg') !== null,
          innerHTML: div.innerHTML.substring(0, 100) + '...'
        });
      });
      
      // Try multiple selectors to find the SVG container
      svgContainer = card.querySelector('div[style*="display: flex"]') as HTMLElement;
      if (!svgContainer) {
        // Try alternative selectors
        svgContainer = card.querySelector('div svg')?.parentElement as HTMLElement;
        console.log('Trying alternative selector (svg parent) - found:', !!svgContainer);
      }
      
      if (!svgContainer) {
        // Try finding any div that contains an SVG with a viewBox
        const allDivsWithSVG = card.querySelectorAll('div');
        for (const div of allDivsWithSVG) {
          const svg = div.querySelector('svg[viewBox]');
          if (svg) {
            svgContainer = div as HTMLElement;
            console.log('Found SVG container by viewBox selector');
            break;
          }
        }
      }
      
      if (svgContainer) {
        console.log('Found SVG container div');
        break;
      } else {
        console.error('Could not find SVG container in this card');
      }
    }
  }
  
  if (!svgContainer) {
    console.error('Could not find SVG container div in any card');
    return null;
  }
  
  console.log('Found SVG container');
  
  // Find the SVG element within the container (not the card header)
  const svgElement = svgContainer.querySelector('svg') as SVGSVGElement;
  if (!svgElement) {
    console.error('Could not find SVG element in SVG container');
    console.log('SVG container HTML:', svgContainer.innerHTML.substring(0, 500));
    return null;
  }
  
  console.log('Found SVG element');
  console.log('SVG viewBox:', svgElement.getAttribute('viewBox'));
  console.log('SVG width:', svgElement.getAttribute('width'));
  console.log('SVG height:', svgElement.getAttribute('height'));
  console.log('SVG style:', svgElement.getAttribute('style'));
  console.log('SVG children count:', svgElement.children.length);
  
  // Log each child element
  Array.from(svgElement.children).forEach((child, index) => {
    console.log(`Child ${index}:`, {
      tagName: child.tagName,
      stroke: child.getAttribute('stroke'),
      fill: child.getAttribute('fill'),
      strokeDasharray: child.getAttribute('stroke-dasharray'),
      strokeWidth: child.getAttribute('stroke-width'),
      transform: child.getAttribute('transform'),
      childrenCount: child.children.length,
      innerHTML: child.innerHTML.length > 0 ? `${child.innerHTML.length} chars` : 'empty'
    });
    
    // If it's a group, log its children too
    if (child.tagName === 'g' && child.children.length > 0) {
      console.log(`  Group ${index} children:`);
      Array.from(child.children).forEach((grandchild, gIndex) => {
        console.log(`    ${gIndex}:`, {
          tagName: grandchild.tagName,
          stroke: grandchild.getAttribute('stroke'),
          fill: grandchild.getAttribute('fill'),
          className: grandchild.getAttribute('class')
        });
      });
    }
  });
  
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
  
  // Clone the SVG element
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Set proper dimensions
  svgClone.setAttribute('width', `${pageWidthPt}pt`);
  svgClone.setAttribute('height', `${pageHeightPt}pt`);
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  // Remove the style attribute that might be causing issues
  svgClone.removeAttribute('style');
  
  // Filter out problematic elements
  const childrenToRemove: Element[] = [];
  Array.from(svgClone.children).forEach(child => {
    // Remove clipping boundary (stroke="#ccc", fill="none", stroke-dasharray="5,5")
    if (child.getAttribute('stroke') === '#ccc' && 
        child.getAttribute('fill') === 'none' && 
        child.getAttribute('stroke-dasharray') === '5,5') {
      console.log('Removing clipping boundary element');
      childrenToRemove.push(child);
    }
  });
  
  // Remove the problematic elements
  childrenToRemove.forEach(child => {
    svgClone.removeChild(child);
  });
  
  console.log('SVG clone children after filtering:', svgClone.children.length);
  
  // Add background if specified
  if (options.showBackground) {
    const bgColor = options.backgroundColor || '#ffffff';
    const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    
    // Get the viewBox to position the background correctly
    const viewBox = svgClone.getAttribute('viewBox');
    if (viewBox) {
      const [x, y, width, height] = viewBox.split(' ').map(Number);
      // Position the background to cover the entire viewBox area
      backgroundRect.setAttribute('x', x.toString());
      backgroundRect.setAttribute('y', y.toString());
      backgroundRect.setAttribute('width', width.toString());
      backgroundRect.setAttribute('height', height.toString());
      console.log(`Background positioned at: x=${x}, y=${y}, width=${width}, height=${height}`);
    } else {
      // Fallback to percentage-based positioning
      backgroundRect.setAttribute('x', '0');
      backgroundRect.setAttribute('y', '0');
      backgroundRect.setAttribute('width', '100%');
      backgroundRect.setAttribute('height', '100%');
      console.log('Using percentage-based background positioning');
    }
    
    backgroundRect.setAttribute('fill', bgColor);
    
    // Insert background as first child
    svgClone.insertBefore(backgroundRect, svgClone.firstChild);
  }
  
  // Organize content into layers before serializing
  const organizedSvg = organizeSVGIntoLayers(svgClone, lineStyles);
  
  // Convert to string
  const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const svgString = new XMLSerializer().serializeToString(organizedSvg);
  
  console.log('Generated SVG string length:', svgString.length);
  console.log('SVG string preview (first 1000 chars):', svgString.substring(0, 1000));
  
  return xmlDeclaration + svgString;
}

/**
 * Organizes SVG content into layers based on line styles
 */
function organizeSVGIntoLayers(svgElement: SVGSVGElement, lineStyleMap: Record<string, string>): SVGSVGElement {
  console.log('Organizing SVG into layers by line style...');
  
  // Create dynamic layers based on line styles found in the SVG
  const layers: Record<string, SVGGElement> = {};
  
  // Special layers for non-line elements
  const specialLayers = {
    background: createLayer('background-layer', 'Background'),
    border: createLayer('border-layer', 'Page Border'),
    labels: createLayer('labels-layer', 'Labels'),
    gnomon: createLayer('gnomon-layer', 'Gnomon'),
    textBlock: createLayer('text-block-layer', 'Text Block'),
    other: createLayer('other-layer', 'Other Elements')
  };
  
  // Process each child element and categorize it
  const elementsToMove: { element: Element, targetLayer: SVGGElement }[] = [];
  
  Array.from(svgElement.children).forEach(child => {
    const targetLayer = categorizeElementByLineStyle(child, layers, specialLayers, lineStyleMap);
    elementsToMove.push({ element: child, targetLayer });
  });
  
  // Clear the original SVG and add organized layers
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }
  
  // Add special layers first (in logical order)
  [specialLayers.background, specialLayers.border, specialLayers.gnomon].forEach(layer => {
    if (layer.children.length > 0) {
      svgElement.appendChild(layer);
      console.log(`Added special layer: ${layer.getAttribute('data-layer')} with ${layer.children.length} elements`);
    }
  });
  
  // Add line style layers (sorted by name for consistency)
  Object.keys(layers).sort().forEach(styleKey => {
    const layer = layers[styleKey];
    if (layer.children.length > 0) {
      svgElement.appendChild(layer);
      console.log(`Added line style layer: ${layer.getAttribute('data-layer')} with ${layer.children.length} elements`);
    }
  });
  
  // Add remaining special layers
  [specialLayers.labels, specialLayers.textBlock, specialLayers.other].forEach(layer => {
    if (layer.children.length > 0) {
      svgElement.appendChild(layer);
      console.log(`Added special layer: ${layer.getAttribute('data-layer')} with ${layer.children.length} elements`);
    }
  });
  
  return svgElement;
}

/**
 * Creates a layer group element
 */
function createLayer(id: string, name: string): SVGGElement {
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  layer.setAttribute('id', id);
  layer.setAttribute('data-layer', name);
  return layer;
}

/**
 * Categorizes an element based on its line style or element type
 */
function categorizeElementByLineStyle(
  element: Element,
  lineStyleLayers: Record<string, SVGGElement>,
  specialLayers: SpecialLayers,
  lineStyleMap: Record<string, string>
): SVGGElement {
  // Handle special element types first
  if (element.tagName === 'rect') {
    const fill = element.getAttribute('fill');
    const stroke = element.getAttribute('stroke');
    
    if (fill && fill !== 'none' && !stroke) {
      return specialLayers.background;
    } else if (stroke) {
      return specialLayers.border;
    }
  }
  
  if (element.tagName === 'text') {
    return specialLayers.labels;
  }
  
  // For groups and line elements, analyze their line style
  const lineStyleInfo = extractLineStyleFromElement(element);
  
  if (lineStyleInfo) {
    const styleKey = lineStyleInfo.styleKey;
    const styleName = lineStyleMap[styleKey] || lineStyleInfo.descriptiveName || styleKey;
    
    // Create layer if it doesn't exist
    if (!lineStyleLayers[styleKey]) {
      lineStyleLayers[styleKey] = createLayer(
        `line-style-${styleKey.replace(/[^a-zA-Z0-9]/g, '-')}`,
        styleName
      );
    }
    
    return lineStyleLayers[styleKey];
  }
  
  // Check if it's a gnomon element
  if (isGnomonElement(element)) {
    return specialLayers.gnomon;
  }
  
  // Check if it's a text block
  if (isTextBlockElement(element)) {
    return specialLayers.textBlock;
  }
  
  return specialLayers.other;
}

/**
 * Extracts line style information from an SVG element
 */
function extractLineStyleFromElement(element: Element): { styleKey: string, descriptiveName: string } | null {
  // Check if element has line/stroke properties
  const stroke = element.getAttribute('stroke');
  const strokeWidth = element.getAttribute('stroke-width');
  const strokeDasharray = element.getAttribute('stroke-dasharray');
  
  if (!stroke || stroke === 'none') {
    // Check children for line properties (for groups)
    const children = Array.from(element.children);
    for (const child of children) {
      const childResult = extractLineStyleFromElement(child);
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
  
  console.log(`Extracted style: ${styleKey} -> ${descriptiveName}`);
  return { styleKey, descriptiveName };
}

/**
 * Checks if an element is a gnomon element
 */
function isGnomonElement(element: Element): boolean {
  // Check for gnomon-specific shapes
  if (element.tagName === 'polygon' || element.tagName === 'path') {
    return true;
  }
  
  // Check for gnomon in groups
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
 * Checks if an element is a text block element
 */
function isTextBlockElement(element: Element): boolean {
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
 * Downloads the SVG content as a file
 */
export function downloadSimpleSVG(svgContent: string, filename: string = 'sundial-simple.svg'): void {
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