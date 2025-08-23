// src/types/export.ts
// Type definitions for export utilities

import type { PageSize, PageOrientation } from './sundial';

/**
 * SVG export specific options
 */
export interface SVGExportOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  showBackground: boolean;
  backgroundColor?: string;
  customWidth?: number;
  customHeight?: number;
}

/**
 * Simple SVG export options (for debugging)
 */
export interface SimpleSVGExportOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  showBackground: boolean;
  backgroundColor?: string;
  customWidth?: number;
  customHeight?: number;
}

/**
 * Page dimensions in different units
 */
export interface PageDimensions {
  /** Width in millimeters */
  widthMm: number;
  /** Height in millimeters */
  heightMm: number;
  /** Width in inches */
  widthIn: number;
  /** Height in inches */
  heightIn: number;
  /** Width in points (1 inch = 72 points) */
  widthPt: number;
  /** Height in points */
  heightPt: number;
}

/**
 * SVG element information for export processing
 */
export interface SVGElementInfo {
  /** The SVG element */
  element: SVGSVGElement;
  /** Container element holding the SVG */
  container: HTMLElement;
  /** Original viewBox attribute */
  viewBox: string;
  /** Computed dimensions */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Layer categorization for SVG export
 */
export interface LayerCategories {
  background: SVGGElement;
  border: SVGGElement;
  labels: SVGGElement;
  gnomon: SVGGElement;
  textBlock: SVGGElement;
  other: SVGGElement;
}

/**
 * Line style mapping for export
 */
export interface LineStyleMap {
  [styleId: string]: string;
}

/**
 * Export result information
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;
  /** Error message if export failed */
  error?: string;
  /** File size in bytes (if available) */
  fileSize?: number;
  /** Export duration in milliseconds */
  duration: number;
  /** Export format used */
  format: string;
}

/**
 * Canvas export configuration for PNG
 */
export interface CanvasExportConfig {
  /** Scale factor for high-DPI export */
  scale: number;
  /** Background color */
  backgroundColor: string;
  /** Whether to use CORS */
  useCORS: boolean;
  /** Whether to allow taint */
  allowTaint: boolean;
  /** Whether to enable logging */
  logging: boolean;
  /** Whether to use foreign object rendering */
  foreignObjectRendering: boolean;
}

/**
 * HTML2Canvas options with proper typing
 */
export interface Html2CanvasOptions {
  background?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  logging?: boolean;
}

/**
 * File download configuration
 */
export interface FileDownloadConfig {
  /** File content as Blob */
  blob: Blob;
  /** Filename for download */
  filename: string;
  /** MIME type */
  mimeType: string;
}

/**
 * Export progress information
 */
export interface ExportProgress {
  /** Current step in the export process */
  step: 'preparing' | 'processing' | 'rendering' | 'downloading' | 'complete' | 'error';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step description */
  message: string;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}
