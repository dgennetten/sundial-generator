// src/components/GnomonNetSVG.tsx
// Preview component for the cut-and-fold gnomon net page.
import React from 'react';
import { MoveUpRight } from 'lucide-react';
import { buildGnomonNetSVGString } from '../utils/gnomonNetUtils';

interface GnomonNetSVGProps {
  gnomonHeight: number;       // mm — standing height of gnomon
  pageWidth: number;          // mm
  pageHeight: number;         // mm
  showBackground?: boolean;
  backgroundColor?: string;
  borderMarginMm?: number;    // border inset in mm (0 = no border)
}

const GnomonNetSVG: React.FC<GnomonNetSVGProps> = ({
  gnomonHeight, pageWidth, pageHeight,
  showBackground = false, backgroundColor = 'white', borderMarginMm = 0,
}) => {
  const svgString = buildGnomonNetSVGString(
    gnomonHeight, pageWidth, pageHeight, showBackground, backgroundColor, borderMarginMm
  );

  // Inject width:100%;height:auto so the SVG scales to fit the card rather than
  // rendering at its physical mm size (which creates whitespace on screen).
  // Export functions call buildGnomonNetSVGString directly and receive the
  // unmodified mm-dimensioned SVG for correct print/PDF sizing.
  const scaledSvg = svgString.replace('<svg ', '<svg style="width:100%;height:auto;display:block;" ');

  return (
    <div className="card" style={{ width: '100%', margin: 0 }}>
      <div className="card-header">
        <h3 className="card-title">
          <MoveUpRight color="#2563eb" size={20} style={{ marginRight: 6 }} />
          Cut-and-Fold Gnomons
        </h3>
      </div>
      <div
        className="sundial-preview-svg-host"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}
        dangerouslySetInnerHTML={{ __html: scaledSvg }}
      />
    </div>
  );
};

export default GnomonNetSVG;
