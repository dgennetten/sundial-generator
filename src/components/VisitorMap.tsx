import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Globe, Users, MapPin } from 'lucide-react';
import type { VisitorData, VisitorLocation } from '../types';
import { isVisitorData, safeJsonParse } from '../utils/typeGuards';

// Lazy load the Leaflet map component to reduce initial bundle size
const VisitorMapLeaflet = lazy(() => import('./VisitorMapLeaflet'));

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
      
      const rawData = await response.text();
      const parseResult = safeJsonParse(rawData, isVisitorData);

      if (parseResult.success) {
        console.log('VisitorMap: Successfully loaded visitor data - Visitors:', parseResult.data.totalVisitors, 'Visits:', parseResult.data.totalVisits);
        console.log('VisitorMap: ProcessedDate:', parseResult.data.processedDate);
        console.log('VisitorMap: Last visitor IP:', parseResult.data.visitors[parseResult.data.visitors.length - 1]?.ip);
        setVisitorData(parseResult.data);
        setError(null);
      } else {
        throw new Error(`Invalid visitor data format: ${parseResult.error}`);
      }
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

  // Get country flag image
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
    
              return (
       <img 
         src={`https://flagicons.lipis.dev/flags/4x3/${upperCode.toLowerCase()}.svg`}
         alt={`${upperCode} flag`}
         style={{
           width: '16px',
           height: '12px',
           display: 'inline-block',
           borderRadius: '1px',
           boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
           border: '1px solid rgba(0,0,0,0.1)',
           imageRendering: 'crisp-edges'
         }}
         title={`${upperCode} flag`}
         onError={(e) => {
           // Fallback to country code if image fails to load
           const target = e.target as HTMLImageElement;
           target.style.display = 'none';
           const fallback = document.createElement('span');
           fallback.textContent = upperCode;
           fallback.style.cssText = `
             background-color: #6b7280;
             color: white;
             padding: 3px 6px;
             border-radius: 4px;
             font-size: 0.7rem;
             font-weight: bold;
             min-width: 24px;
             text-align: center;
             display: inline-block;
           `;
           target.parentNode?.insertBefore(fallback, target);
         }}
       />
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

  // Group visitors by country and aggregate data
  const countryData = visitorData.visitors.reduce((acc, visitor) => {
    const country = visitor.country;
    if (!acc[country]) {
      acc[country] = {
        country: visitor.country,
        countryCode: visitor.countryCode,
        totalVisits: 0,
        cities: new Set<string>(),
        regions: new Set<string>(),
        visitors: []
      };
    }
    acc[country].totalVisits += visitor.visitCount;
    acc[country].cities.add(visitor.city);
    acc[country].regions.add(visitor.region);
    acc[country].visitors.push(visitor);
    return acc;
  }, {} as Record<string, {
    country: string;
    countryCode: string;
    totalVisits: number;
    cities: Set<string>;
    regions: Set<string>;
    visitors: VisitorLocation[];
  }>);

  const countryList = Object.values(countryData);

  return (
    <div className="card">
             <div className="card-header">
         <h3 className="card-title">
           <Globe color="#2563eb" size={20} style={{marginRight: 6}} />
           Visitor Map  — Last 7 days (GDPR compliant)
           {error && (
             <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '8px' }}>
               (Using fallback data)
             </span>
           )}
         </h3>
       </div>
      <div className="card-content">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '1rem', 
          marginBottom: '0.5rem' 
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
          marginBottom: '0.5rem',
          position: 'relative'
        }}>
          
          {/* Leaflet Map Component */}
          <div style={{ marginBottom: '0.5rem' }}>
            <Suspense fallback={
              <div style={{
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                color: '#64748b'
              }}>
                Loading world map...
              </div>
            }>
              <VisitorMapLeaflet
                visitors={visitorData?.visitors || []}
                selectedCountry={selectedCountry}
                onCountrySelect={setSelectedCountry}
                height="300px"
              />
            </Suspense>
          </div>
          
          {/* Simple list of visitor locations - one per country */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.4rem', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {countryList.map((country, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: selectedCountry === country.country ? '#eff6ff' : '#ffffff',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  border: selectedCountry === country.country ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
                title={`${country.country} - ${country.totalVisits} total visits from ${country.cities.size} cities`}
                onClick={() => setSelectedCountry(selectedCountry === country.country ? null : country.country)}
              >
                <span style={{ fontSize: '0.875rem' }}>
                  {getCountryFlag(country.countryCode)}
                </span>
                <span>{country.country}</span>
                <span style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  borderRadius: '10px', 
                  padding: '1px 6px',
                  fontSize: '0.625rem',
                  fontWeight: 'bold'
                }}>
                  {country.totalVisits}
                </span>
              </div>
            ))}
          </div>
          
          {/* Instruction text in lower left corner */}
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            fontSize: '0.625rem',
            color: '#94a3b8',
            fontStyle: 'italic'
          }}>
            click flags for details.
          </div>
        </div>

        {/* Selected Country Details */}
        {selectedCountry && (
          <div style={{ 
            marginTop: '0.0rem', 
            padding: '0.6rem', 
            backgroundColor: '#eff6ff', 
            borderRadius: '6px',
            border: '1px solid #2563eb'
          }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.4rem' }}>
              Selected: {selectedCountry}
            </h5>
            <div style={{ fontSize: '0.75rem', color: '#374151' }}>
              {countryData[selectedCountry]?.visitors.map((visitor, index) => (
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
          Last 7 days (GDPR compliant), updated: {visitorData ? formatDate(visitorData.processedDate) : 'Never'} MDT
        </div>
      </div>
    </div>
  );
};

export default VisitorMap;