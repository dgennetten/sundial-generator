import React, { useState, useEffect } from 'react';
import { Globe, Users, MapPin, RefreshCw } from 'lucide-react';
import VisitorMapLeaflet from './VisitorMapLeaflet';

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
        
        
        {/* Interactive World Map */}
        <div style={{ 
          backgroundColor: '#f1f5f9', 
          borderRadius: '8px', 
          padding: '0.75rem', 
          marginBottom: '1rem'
        }}>
          
          {/* Leaflet Map Component */}
          <div style={{ marginBottom: '0.5rem' }}>
            <VisitorMapLeaflet
              visitors={visitorData?.visitors || []}
              selectedCountry={selectedCountry}
              onCountrySelect={setSelectedCountry}
              height="300px"
            />
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
          Last 6 months, updated: {visitorData ? formatDate(visitorData.processedDate) : 'Never'}
        </div>
      </div>
    </div>
  );
};

export default VisitorMap;