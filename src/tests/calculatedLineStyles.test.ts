import { describe, it, expect } from 'vitest';
import { DEFAULT_LINE_STYLES } from '../components/lineStyleUtils';
import type { LineStyle } from '../components/LineSettings';

describe('Calculated Line Styles', () => {
  it('should include the new calculated line styles in defaults', () => {
    const declinationDotStyle = DEFAULT_LINE_STYLES.find(s => s.id === 'declination-2min-dot');
    const declination5minDotStyle = DEFAULT_LINE_STYLES.find(s => s.id === 'declination-5min-dot');
    const declinationDashStyle = DEFAULT_LINE_STYLES.find(s => s.id === 'declination-2min-dash');
    const hourlineDashStyle = DEFAULT_LINE_STYLES.find(s => s.id === 'hourline-5-2-day-dash');
    const hourline25DashStyle = DEFAULT_LINE_STYLES.find(s => s.id === 'hourline-2-5-day-dash');

    expect(declinationDotStyle).toBeDefined();
    expect(declination5minDotStyle).toBeDefined();
    expect(declinationDashStyle).toBeDefined();
    expect(hourlineDashStyle).toBeDefined();
    expect(hourline25DashStyle).toBeDefined();

    // Check declination dot style properties
    expect(declinationDotStyle?.name).toBe('D: 2min dot');
    expect(declinationDotStyle?.style).toBe('calculated');
    expect(declinationDotStyle?.calculatedType).toBe('declination-2min-dot');
    expect(declinationDotStyle?.applicableToLines).toEqual(['declination']);
    expect(declinationDotStyle?.fixed).toBe(true);

    // Check declination 5min dot style properties
    expect(declination5minDotStyle?.name).toBe('D: 5min dot');
    expect(declination5minDotStyle?.style).toBe('calculated');
    expect(declination5minDotStyle?.calculatedType).toBe('declination-5min-dot');
    expect(declination5minDotStyle?.applicableToLines).toEqual(['declination']);
    expect(declination5minDotStyle?.fixed).toBe(true);

    // Check declination dash style properties
    expect(declinationDashStyle?.name).toBe('D: 2min dash');
    expect(declinationDashStyle?.style).toBe('calculated');
    expect(declinationDashStyle?.calculatedType).toBe('declination-2min-dash');
    expect(declinationDashStyle?.applicableToLines).toEqual(['declination']);
    expect(declinationDashStyle?.fixed).toBe(true);

    // Check hourline dash style properties
    expect(hourlineDashStyle?.name).toBe('H: 5/2 day dash');
    expect(hourlineDashStyle?.style).toBe('calculated');
    expect(hourlineDashStyle?.calculatedType).toBe('hourline-5-2-day-dash');
    expect(hourlineDashStyle?.applicableToLines).toEqual(['hourline']);
    expect(hourlineDashStyle?.fixed).toBe(true);

    // Check hourline 2/5 dash style properties
    expect(hourline25DashStyle?.name).toBe('H: 2/5 day dash');
    expect(hourline25DashStyle?.style).toBe('calculated');
    expect(hourline25DashStyle?.calculatedType).toBe('hourline-2-5-day-dash');
    expect(hourline25DashStyle?.applicableToLines).toEqual(['hourline']);
    expect(hourline25DashStyle?.fixed).toBe(true);
  });

  it('should filter line styles correctly for different line types', () => {
    // Test hourline filtering
    const hourlineStyles = DEFAULT_LINE_STYLES.filter(s => 
      s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('hourline'))
    );
    
    const hourlineCalculatedStyle = hourlineStyles.find(s => s.id === 'hourline-5-2-day-dash');
    const hourline25CalculatedStyle = hourlineStyles.find(s => s.id === 'hourline-2-5-day-dash');
    const declinationDotCalculatedStyle = hourlineStyles.find(s => s.id === 'declination-2min-dot');
    const declination5minDotCalculatedStyle = hourlineStyles.find(s => s.id === 'declination-5min-dot');
    const declinationDashCalculatedStyle = hourlineStyles.find(s => s.id === 'declination-2min-dash');
    
    expect(hourlineCalculatedStyle).toBeDefined();
    expect(hourline25CalculatedStyle).toBeDefined();
    expect(declinationDotCalculatedStyle).toBeUndefined(); // Should not be available for hourlines
    expect(declination5minDotCalculatedStyle).toBeUndefined(); // Should not be available for hourlines
    expect(declinationDashCalculatedStyle).toBeUndefined(); // Should not be available for hourlines

    // Test declination filtering
    const declinationStyles = DEFAULT_LINE_STYLES.filter(s => 
      s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('declination'))
    );
    
    const declinationDotStyleFiltered = declinationStyles.find(s => s.id === 'declination-2min-dot');
    const declination5minDotStyleFiltered = declinationStyles.find(s => s.id === 'declination-5min-dot');
    const declinationDashStyleFiltered = declinationStyles.find(s => s.id === 'declination-2min-dash');
    const hourlineCalculatedStyleFiltered = declinationStyles.find(s => s.id === 'hourline-5-2-day-dash');
    const hourline25CalculatedStyleFiltered = declinationStyles.find(s => s.id === 'hourline-2-5-day-dash');
    
    expect(declinationDotStyleFiltered).toBeDefined();
    expect(declination5minDotStyleFiltered).toBeDefined();
    expect(declinationDashStyleFiltered).toBeDefined();
    expect(hourlineCalculatedStyleFiltered).toBeUndefined(); // Should not be available for declination lines
    expect(hourline25CalculatedStyleFiltered).toBeUndefined(); // Should not be available for declination lines

    // Test border filtering (should exclude all calculated styles)
    const borderStyles = DEFAULT_LINE_STYLES.filter(s => 
      s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('border'))
    );
    
    const borderDeclinationDotStyle = borderStyles.find(s => s.id === 'declination-2min-dot');
    const border5minDeclinationDotStyle = borderStyles.find(s => s.id === 'declination-5min-dot');
    const borderDeclinationDashStyle = borderStyles.find(s => s.id === 'declination-2min-dash');
    const borderHourlineStyle = borderStyles.find(s => s.id === 'hourline-5-2-day-dash');
    const borderHourline25Style = borderStyles.find(s => s.id === 'hourline-2-5-day-dash');
    
    expect(borderDeclinationDotStyle).toBeUndefined(); // Should not be available for borders
    expect(border5minDeclinationDotStyle).toBeUndefined(); // Should not be available for borders
    expect(borderDeclinationDashStyle).toBeUndefined(); // Should not be available for borders
    expect(borderHourlineStyle).toBeUndefined(); // Should not be available for borders
    expect(borderHourline25Style).toBeUndefined(); // Should not be available for borders
  });

  it('should include regular styles for all line types when applicableToLines is undefined', () => {
    const regularStyles = DEFAULT_LINE_STYLES.filter(s => !s.applicableToLines);
    
    // Regular styles should be available for all line types
    const hourlineRegularStyles = regularStyles.filter(s => 
      s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('hourline'))
    );
    
    const declinationRegularStyles = regularStyles.filter(s => 
      s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('declination'))
    );
    
    const borderRegularStyles = regularStyles.filter(s => 
      s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('border'))
    );

    expect(hourlineRegularStyles.length).toBeGreaterThan(0);
    expect(declinationRegularStyles.length).toBeGreaterThan(0);
    expect(borderRegularStyles.length).toBeGreaterThan(0);
    
    // All should have the same regular styles
    expect(hourlineRegularStyles.length).toBe(declinationRegularStyles.length);
    expect(declinationRegularStyles.length).toBe(borderRegularStyles.length);
  });
});