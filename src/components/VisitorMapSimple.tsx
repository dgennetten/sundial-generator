import React from 'react';
import { Globe } from 'lucide-react';

const VisitorMapSimple: React.FC = () => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Globe color="#2563eb" size={20} style={{marginRight: 6}} />
          Visitor Map (Test)
        </h3>
      </div>
      <div className="card-content">
        <p>This is a test visitor map component to check if the basic structure works.</p>
        <div style={{ 
          backgroundColor: '#f1f5f9', 
          borderRadius: '8px', 
          padding: '1rem',
          textAlign: 'center'
        }}>
          🌍 Map placeholder - Component is working!
        </div>
      </div>
    </div>
  );
};

export default VisitorMapSimple;