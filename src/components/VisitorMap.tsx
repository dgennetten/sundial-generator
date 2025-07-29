import React, { useState, useEffect } from 'react';
import { Globe, Users, MapPin, RefreshCw } from 'lucide-react';

interface VisitorLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
}

interface VisitorData {
  visitors: VisitorLocation[];
  totalVisitors: number;
  totalVisits: number;
  processedDate: string;
  daysSince?: number;
}

// Move getSampleData function before the component
const getSampleData = (): VisitorData => {
    return {
      visitors: [
        {
          ip: '192.168.1.1',
          country: 'United States',
          countryCode: 'US',
          region: 'Colorado',
          city: 'Fort Collins',
          lat: 40.5853,
          lon: -105.0844,
          timezone: 'America/Denver',
          firstVisit: '2024-01-15T10:30:00Z',
          lastVisit: '2024-01-20T14:22:00Z',
          visitCount: 15
        },
        {
          ip: '203.0.113.1',
          country: 'Germany',
          countryCode: 'DE',
          region: 'Bavaria',
          city: 'Munich',
          lat: 48.1351,
          lon: 11.5820,
          timezone: 'Europe/Berlin',
          firstVisit: '2024-01-18T09:15:00Z',
          lastVisit: '2024-01-18T09:15:00Z',
          visitCount: 3
        },
        {
          ip: '198.51.100.1',
          country: 'Japan',
          countryCode: 'JP',
          region: 'Tokyo',
          city: 'Tokyo',
          lat: 35.6762,
          lon: 139.6503,
          timezone: 'Asia/Tokyo',
          firstVisit: '2024-01-19T22:45:00Z',
          lastVisit: '2024-01-19T22:45:00Z',
          visitCount: 1
        }
      ],
      totalVisitors: 3,
      totalVisits: 19,
      processedDate: new Date().toISOString()
    };
};

const VisitorMap: React.FC = () => {
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Load visitor data from JSON file
  const loadVisitorData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/visitor-data.json?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load visitor data: ${response.status}`);
      }
      
      const data: VisitorData = await response.json();
      console.log('VisitorMap: Successfully loaded visitor data - Visitors:', data.totalVisitors, 'Visits:', data.totalVisits);
      setVisitorData(data);
      setError(null);
    } catch (err) {
      console.error('VisitorMap: Error loading visitor data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visitor data');
      // Fallback to sample data if real data fails to load
      const sampleData = getSampleData();
      console.log('VisitorMap: Using fallback sample data');
      setVisitorData(sampleData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitorData();
  }, []);
  
  // Helper functions
  const totalVisitors = visitorData?.totalVisitors || 0;
  const totalVisits = visitorData?.totalVisits || 0;
  
  // Debug logging
  React.useEffect(() => {
    if (visitorData) {
      console.log('VisitorMap: Rendering - Visitors:', totalVisitors, 'Visits:', totalVisits);
    }
  }, [visitorData, totalVisitors, totalVisits]);

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get country flag with Windows-friendly approach
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) {
      return (
        <span style={{
          backgroundColor: '#6b7280',
          color: 'white',
          padding: '3px 6px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          minWidth: '24px',
          textAlign: 'center',
          display: 'inline-block'
        }}>
          ??
        </span>
      );
    }
    
    const upperCode = countryCode.toUpperCase();
    
    // Windows often has issues with flag emojis, so let's use a more reliable approach
    // Create attractive country code badges with country-specific colors
    const countryColors: { [key: string]: { bg: string; text: string } } = {
      'US': { bg: '#1e40af', text: 'white' },    // Blue
      'DE': { bg: '#dc2626', text: 'white' },    // Red  
      'NL': { bg: '#ea580c', text: 'white' },    // Orange
      'GB': { bg: '#7c2d12', text: 'white' },    // Brown
      'FR': { bg: '#1e3a8a', text: 'white' },    // Navy
      'JP': { bg: '#dc2626', text: 'white' },    // Red
      'CA': { bg: '#dc2626', text: 'white' },    // Red
      'AU': { bg: '#059669', text: 'white' },    // Green
      'IT': { bg: '#059669', text: 'white' },    // Green
      'ES': { bg: '#dc2626', text: 'white' },    // Red
      'BR': { bg: '#059669', text: 'white' },    // Green
      'IN': { bg: '#ea580c', text: 'white' },    // Orange
      'CN': { bg: '#dc2626', text: 'white' },    // Red
      'RU': { bg: '#1e40af', text: 'white' },    // Blue
      'KR': { bg: '#1e40af', text: 'white' },    // Blue
    };
    
    const colors = countryColors[upperCode] || { bg: '#6b7280', text: 'white' };
    
    return (
      <span 
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          padding: '3px 6px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          minWidth: '24px',
          textAlign: 'center',
          display: 'inline-block',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
        title={`${upperCode} flag`}
      >
        {upperCode}
      </span>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Globe color="#2563eb" size={20} style={{marginRight: 6}} />
            Visitor Map
          </h3>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Loading visitor data...
          </div>
        </div>
      </div>
    );
  }

  // Show error state (but still render with fallback data)
  if (error) {
    console.warn('Visitor Map Error:', error);
  }

  // Don't render if no data
  if (!visitorData) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Globe color="#2563eb" size={20} style={{marginRight: 6}} />
            Visitor Map
          </h3>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            No visitor data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title">
          <Globe color="#2563eb" size={20} style={{marginRight: 6}} />
          Visitor Map
          {error && (
            <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '8px' }}>
              (Using fallback data)
            </span>
          )}
        </h3>
        <button 
          onClick={loadVisitorData}
          disabled={loading}
          style={{
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.875rem',
            color: '#64748b'
          }}
          title="Refresh visitor data"
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>
      <div className="card-content">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
              {loading ? '...' : totalVisitors}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Unique Visitors
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
              {loading ? '...' : totalVisits}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Total Visits
            </div>
          </div>
        </div>
        
        {/* Data source indicator */}
        <div style={{ 
          fontSize: '0.75rem', 
          color: error ? '#dc2626' : '#059669', 
          textAlign: 'center', 
          marginBottom: '1rem',
          fontStyle: 'italic'
        }}>
          {error ? '⚠️ Using sample data (real data failed to load)' : '✅ Live data from server logs'}
        </div>
        
        {/* World Map Visualization */}
        <div style={{ 
          backgroundColor: '#f1f5f9', 
          borderRadius: '8px', 
          padding: '0.75rem', 
          marginBottom: '1rem'
        }}>
          
          {/* Highly Detailed SVG World Map */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '0.5rem'
          }}>
            <svg width="400" height="200" viewBox="0 0 400 200" style={{ backgroundColor: '#dbeafe', borderRadius: '8px', border: '1px solid #93c5fd' }}>
              {/* Highly detailed continent shapes */}
              
              {/* North America - Much more detailed */}
              <path d="M10 55 L15 45 L20 40 L25 35 L30 32 L35 30 L42 28 L50 25 L58 24 L65 25 L72 27 L78 30 L85 33 L90 36 L95 40 L98 45 L100 50 L102 55 L100 60 L98 65 L95 70 L92 75 L88 80 L85 83 L80 86 L75 88 L70 89 L65 90 L60 89 L55 88 L50 86 L45 84 L40 82 L35 79 L30 76 L25 72 L20 68 L16 63 L12 58 L10 55 Z" 
                    fill="#86efac" stroke="#22c55e" strokeWidth="0.8"/>
              
              {/* Alaska */}
              <path d="M8 35 L12 30 L18 28 L25 30 L30 33 L28 38 L25 42 L20 44 L15 42 L10 38 L8 35 Z" 
                    fill="#86efac" stroke="#22c55e" strokeWidth="0.8"/>
              
              {/* South America - Much more detailed */}
              <path d="M55 92 L60 90 L65 89 L70 90 L75 92 L78 95 L80 100 L82 105 L84 110 L85 115 L86 120 L85 125 L84 130 L82 135 L80 140 L78 144 L75 147 L70 149 L65 150 L60 149 L56 147 L53 144 L51 140 L50 135 L49 130 L48 125 L49 120 L50 115 L51 110 L52 105 L53 100 L54 95 L55 92 Z" 
                    fill="#86efac" stroke="#22c55e" strokeWidth="0.8"/>
              
              {/* Europe - Much more detailed */}
              <path d="M115 38 L118 35 L122 32 L127 30 L132 29 L137 30 L142 32 L147 35 L150 38 L152 42 L153 46 L152 50 L150 54 L148 57 L145 60 L142 62 L138 63 L134 64 L130 63 L126 62 L122 60 L119 57 L116 54 L114 50 L113 46 L114 42 L115 38 Z" 
                    fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8"/>
              
              {/* Scandinavia */}
              <path d="M125 20 L130 18 L135 20 L138 25 L136 30 L133 33 L130 35 L127 33 L125 30 L124 25 L125 20 Z" 
                    fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8"/>
              
              {/* Africa - Much more detailed */}
              <path d="M110 68 L115 65 L120 63 L125 62 L130 63 L135 65 L140 68 L145 72 L148 77 L150 82 L151 87 L150 92 L149 97 L148 102 L147 107 L146 112 L145 117 L144 122 L142 127 L140 132 L138 136 L135 139 L132 141 L128 142 L124 143 L120 142 L116 141 L112 139 L109 136 L107 132 L106 127 L105 122 L106 117 L107 112 L108 107 L109 102 L108 97 L109 92 L110 87 L109 82 L110 77 L109 72 L110 68 Z" 
                    fill="#fb7185" stroke="#f43f5e" strokeWidth="0.8"/>
              
              {/* Asia - Much more detailed */}
              <path d="M155 25 L165 20 L175 18 L185 17 L195 18 L205 19 L215 20 L225 21 L235 22 L245 24 L255 26 L265 28 L275 30 L285 33 L295 36 L300 40 L302 45 L300 50 L298 55 L295 60 L290 64 L285 67 L280 69 L275 70 L270 71 L265 70 L260 69 L255 68 L250 67 L245 66 L240 65 L235 64 L230 63 L225 62 L220 61 L215 60 L210 59 L205 58 L200 57 L195 56 L190 55 L185 54 L180 53 L175 52 L170 51 L165 50 L160 48 L157 45 L155 40 L154 35 L155 30 L155 25 Z" 
                    fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.8"/>
              
              {/* India subcontinent */}
              <path d="M200 75 L210 73 L220 75 L225 80 L223 85 L220 88 L215 90 L210 88 L205 85 L202 80 L200 75 Z" 
                    fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.8"/>
              
              {/* Australia - Much more detailed */}
              <path d="M250 130 L260 128 L270 129 L280 131 L290 133 L295 136 L298 140 L296 144 L294 148 L290 151 L285 153 L280 154 L275 153 L270 152 L265 151 L260 150 L255 149 L250 148 L245 146 L242 143 L241 139 L243 135 L246 132 L250 130 Z" 
                    fill="#34d399" stroke="#10b981" strokeWidth="0.8"/>
              
              {/* New Zealand */}
              <path d="M305 145 L310 143 L312 147 L310 151 L305 149 L305 145 Z" 
                    fill="#34d399" stroke="#10b981" strokeWidth="0.8"/>
              <path d="M307 155 L312 153 L314 157 L312 161 L307 159 L307 155 Z" 
                    fill="#34d399" stroke="#10b981" strokeWidth="0.8"/>
              
              {/* Greenland - More detailed */}
              <path d="M80 18 L85 15 L90 14 L95 13 L100 14 L105 16 L108 20 L110 25 L108 30 L106 35 L103 38 L100 40 L95 41 L90 40 L85 38 L82 35 L80 30 L79 25 L80 20 L80 18 Z" 
                    fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.8"/>
              
              {/* Madagascar */}
              <path d="M158 115 L162 113 L164 118 L162 123 L158 125 L156 120 L158 115 Z" 
                    fill="#fb7185" stroke="#f43f5e" strokeWidth="0.8"/>
              
              {/* Japan */}
              <path d="M320 55 L325 53 L328 57 L326 61 L322 63 L318 61 L320 55 Z" 
                    fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.8"/>
              
              {/* UK and Ireland */}
              <path d="M108 42 L112 40 L115 44 L113 48 L109 46 L108 42 Z" 
                    fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8"/>
              <path d="M105 44 L108 42 L109 46 L107 48 L105 44 Z" 
                    fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8"/>
              
              {/* Visitor dots positioned on detailed map */}
              {visitorData?.visitors.map((visitor, index) => {
                // Precise mapping for the larger, detailed map
                const positions: { [key: string]: { x: number; y: number } } = {
                  'United States': { x: 75, y: 70 },
                  'Germany': { x: 135, y: 50 },
                  'Japan': { x: 323, y: 58 },
                  'United Kingdom': { x: 110, y: 45 },
                  'France': { x: 130, y: 55 },
                  'Canada': { x: 70, y: 45 }
                };
                
                const pos = positions[visitor.country] || { x: 200, y: 100 };
                
                return (
                  <g key={index}>
                    {/* Outer glow effect */}
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r="8" 
                      fill={selectedCountry === visitor.country ? "#3b82f6" : "#ef4444"}
                      opacity="0.2"
                    />
                    {/* Middle glow */}
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r="6" 
                      fill={selectedCountry === visitor.country ? "#3b82f6" : "#ef4444"}
                      opacity="0.4"
                    />
                    {/* Main dot */}
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r="4" 
                      fill={selectedCountry === visitor.country ? "#1d4ed8" : "#dc2626"}
                      stroke="white" 
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedCountry(selectedCountry === visitor.country ? null : visitor.country)}
                    />
                    {/* Visit count label with better background */}
                    <rect
                      x={pos.x - 10}
                      y={pos.y - 20}
                      width="20"
                      height="14"
                      fill="rgba(255,255,255,0.95)"
                      stroke="#64748b"
                      strokeWidth="0.5"
                      rx="3"
                    />
                    <text 
                      x={pos.x} 
                      y={pos.y - 10} 
                      textAnchor="middle" 
                      fontSize="10" 
                      fill="#374151"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {visitor.visitCount}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* Simple list of visitor locations */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.4rem', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {visitorData?.visitors.map((visitor, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: selectedCountry === visitor.country ? '#eff6ff' : '#ffffff',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  border: selectedCountry === visitor.country ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
                title={`${visitor.city}, ${visitor.region}, ${visitor.country} - ${visitor.visitCount} visits`}
                onClick={() => setSelectedCountry(selectedCountry === visitor.country ? null : visitor.country)}
              >
                <span style={{ fontSize: '0.875rem' }}>
                  {getCountryFlag(visitor.countryCode)}
                </span>
                <span>{visitor.city}</span>
                <span style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  borderRadius: '10px', 
                  padding: '1px 6px',
                  fontSize: '0.625rem',
                  fontWeight: 'bold'
                }}>
                  {visitor.visitCount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Country Details */}
        {selectedCountry && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.6rem', 
            backgroundColor: '#eff6ff', 
            borderRadius: '6px',
            border: '1px solid #2563eb'
          }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.4rem' }}>
              Selected: {selectedCountry}
            </h5>
            <div style={{ fontSize: '0.75rem', color: '#374151' }}>
              {visitorData?.visitors
                .filter(v => v.country === selectedCountry)
                .map((visitor, index) => (
                  <div key={index} style={{ marginBottom: '0.2rem' }}>
                    📍 {visitor.city}, {visitor.region} - {visitor.visitCount} visits
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div style={{ 
          marginTop: '0.75rem', 
          fontSize: '0.75rem', 
          color: '#64748b', 
          textAlign: 'center',
          paddingTop: '0.5rem',
          borderTop: '1px solid #e2e8f0'
        }}>
          Last 90 days, updated: {visitorData ? formatDate(visitorData.processedDate) : 'Never'}
        </div>
      </div>
    </div>
  );
};

export default VisitorMap;