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
              
              {/* North America - Ultra detailed with doubled points */}
              <path d="M10 55 L12 52 L15 45 L17 42 L20 40 L22 38 L25 35 L27 33 L30 32 L32 31 L35 30 L38 29 L42 28 L46 27 L50 25 L54 24 L58 24 L61 24 L65 25 L68 26 L72 27 L75 28 L78 30 L81 31 L85 33 L87 34 L90 36 L92 38 L95 40 L96 42 L98 45 L99 47 L100 50 L101 52 L102 55 L101 57 L100 60 L99 62 L98 65 L97 67 L95 70 L93 72 L92 75 L90 77 L88 80 L86 81 L85 83 L82 84 L80 86 L77 87 L75 88 L72 88 L70 89 L67 89 L65 90 L62 89 L60 89 L57 88 L55 88 L52 87 L50 86 L47 85 L45 84 L42 83 L40 82 L37 80 L35 79 L32 77 L30 76 L27 74 L25 72 L22 70 L20 68 L18 65 L16 63 L14 60 L12 58 L11 56 L10 55 Z" 
                    fill="#86efac" stroke="#22c55e" strokeWidth="0.8"/>
              
              {/* Alaska - Ultra detailed */}
              <path d="M8 35 L9 33 L12 30 L14 29 L18 28 L21 28 L25 30 L27 31 L30 33 L29 35 L28 38 L26 40 L25 42 L22 43 L20 44 L17 43 L15 42 L12 40 L10 38 L9 36 L8 35 Z" 
                    fill="#86efac" stroke="#22c55e" strokeWidth="0.8"/>
              
              {/* South America - Ultra detailed with doubled points */}
              <path d="M55 92 L57 91 L60 90 L62 89 L65 89 L67 89 L70 90 L72 91 L75 92 L76 93 L78 95 L79 97 L80 100 L81 102 L82 105 L83 107 L84 110 L84 112 L85 115 L85 117 L86 120 L85 122 L85 125 L84 127 L84 130 L83 132 L82 135 L81 137 L80 140 L79 142 L78 144 L76 145 L75 147 L72 148 L70 149 L67 149 L65 150 L62 149 L60 149 L58 148 L56 147 L54 145 L53 144 L52 142 L51 140 L50 137 L50 135 L49 132 L49 130 L48 127 L48 125 L48 122 L49 120 L49 117 L50 115 L50 112 L51 110 L51 107 L52 105 L52 102 L53 100 L53 97 L54 95 L54 93 L55 92 Z" 
                    fill="#86efac" stroke="#22c55e" strokeWidth="0.8"/>
              
              {/* Europe - Ultra detailed with doubled points */}
              <path d="M115 38 L116 36 L118 35 L120 33 L122 32 L124 31 L127 30 L129 29 L132 29 L134 29 L137 30 L139 31 L142 32 L144 33 L147 35 L148 36 L150 38 L151 40 L152 42 L152 44 L153 46 L152 48 L152 50 L151 52 L150 54 L149 55 L148 57 L146 58 L145 60 L143 61 L142 62 L140 62 L138 63 L136 63 L134 64 L132 63 L130 63 L128 62 L126 62 L124 61 L122 60 L120 58 L119 57 L117 55 L116 54 L115 52 L114 50 L113 48 L113 46 L113 44 L114 42 L114 40 L115 38 Z" 
                    fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8"/>
              
              {/* Scandinavia - Ultra detailed */}
              <path d="M125 20 L127 19 L130 18 L132 19 L135 20 L136 22 L138 25 L137 27 L136 30 L134 31 L133 33 L131 34 L130 35 L128 34 L127 33 L126 31 L125 30 L124 27 L124 25 L124 22 L125 20 Z" 
                    fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8"/>
              
              {/* Africa - Ultra detailed with doubled points */}
              <path d="M110 68 L112 66 L115 65 L117 64 L120 63 L122 62 L125 62 L127 62 L130 63 L132 64 L135 65 L137 66 L140 68 L142 70 L145 72 L146 74 L148 77 L149 79 L150 82 L150 84 L151 87 L150 89 L150 92 L149 94 L149 97 L148 99 L148 102 L147 104 L147 107 L146 109 L146 112 L145 114 L145 117 L144 119 L144 122 L143 124 L142 127 L141 129 L140 132 L139 134 L138 136 L136 137 L135 139 L133 140 L132 141 L130 141 L128 142 L126 142 L124 143 L122 142 L120 142 L118 141 L116 141 L114 140 L112 139 L110 137 L109 136 L108 134 L107 132 L106 129 L106 127 L105 124 L105 122 L105 119 L106 117 L106 114 L107 112 L107 109 L108 107 L108 104 L109 102 L108 99 L108 97 L108 94 L109 92 L109 89 L110 87 L109 84 L109 82 L109 79 L110 77 L109 74 L109 72 L109 70 L110 68 Z" 
                    fill="#fb7185" stroke="#f43f5e" strokeWidth="0.8"/>
              
              {/* Asia - Ultra detailed with doubled points */}
              <path d="M155 25 L160 22 L165 20 L170 19 L175 18 L180 17 L185 17 L190 17 L195 18 L200 18 L205 19 L210 19 L215 20 L220 20 L225 21 L230 21 L235 22 L240 23 L245 24 L250 25 L255 26 L260 27 L265 28 L270 29 L275 30 L280 31 L285 33 L290 34 L295 36 L297 38 L300 40 L301 42 L302 45 L301 47 L300 50 L299 52 L298 55 L296 57 L295 60 L292 62 L290 64 L287 65 L285 67 L282 68 L280 69 L277 69 L275 70 L272 70 L270 71 L267 70 L265 70 L262 69 L260 69 L257 68 L255 68 L252 67 L250 67 L247 66 L245 66 L242 65 L240 65 L237 64 L235 64 L232 63 L230 63 L227 62 L225 62 L222 61 L220 61 L217 60 L215 60 L212 59 L210 59 L207 58 L205 58 L202 57 L200 57 L197 56 L195 56 L192 55 L190 55 L187 54 L185 54 L182 53 L180 53 L177 52 L175 52 L172 51 L170 51 L167 50 L165 50 L162 49 L160 48 L158 46 L157 45 L156 42 L155 40 L154 37 L154 35 L154 32 L155 30 L155 27 L155 25 Z" 
                    fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.8"/>
              
              {/* India subcontinent */}
              <path d="M200 75 L210 73 L220 75 L225 80 L223 85 L220 88 L215 90 L210 88 L205 85 L202 80 L200 75 Z" 
                    fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.8"/>
              
              {/* Australia - Ultra detailed with doubled points */}
              <path d="M250 130 L255 129 L260 128 L265 128 L270 129 L275 130 L280 131 L285 132 L290 133 L292 134 L295 136 L296 138 L298 140 L297 142 L296 144 L295 146 L294 148 L292 149 L290 151 L287 152 L285 153 L282 153 L280 154 L277 153 L275 153 L272 152 L270 152 L267 151 L265 151 L262 150 L260 150 L257 149 L255 149 L252 148 L250 148 L247 147 L245 146 L243 144 L242 143 L241 141 L241 139 L242 137 L243 135 L244 133 L246 132 L248 131 L250 130 Z" 
                    fill="#34d399" stroke="#10b981" strokeWidth="0.8"/>
              
              {/* New Zealand */}
              <path d="M305 145 L310 143 L312 147 L310 151 L305 149 L305 145 Z" 
                    fill="#34d399" stroke="#10b981" strokeWidth="0.8"/>
              <path d="M307 155 L312 153 L314 157 L312 161 L307 159 L307 155 Z" 
                    fill="#34d399" stroke="#10b981" strokeWidth="0.8"/>
              
              {/* Greenland - Ultra detailed */}
              <path d="M80 18 L82 16 L85 15 L87 14 L90 14 L92 13 L95 13 L97 13 L100 14 L102 15 L105 16 L106 18 L108 20 L109 22 L110 25 L109 27 L108 30 L107 32 L106 35 L104 36 L103 38 L101 39 L100 40 L98 40 L95 41 L92 40 L90 40 L87 39 L85 38 L83 36 L82 35 L81 32 L80 30 L79 27 L79 25 L79 22 L80 20 L80 18 Z" 
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