import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LineSettings from '../components/LineSettings';
import { DEFAULT_LINE_STYLES } from '../components/lineStyleUtils';
import type { LineStyle } from '../components/LineSettings';

// Mock the saveLineStyles function
vi.mock('../components/lineStyleUtils', async () => {
  const actual = await vi.importActual('../components/lineStyleUtils');
  return {
    ...actual,
    saveLineStyles: vi.fn(),
  };
});

describe('LineSettings Calculated Style Popup', () => {
  const mockSetLineStyles = vi.fn();
  
  const testLineStyles: LineStyle[] = [
    {
      id: 'test-1',
      name: 'Test Style',
      width: '1mm',
      color: 'black',
      style: 'solid'
    },
    {
      id: '',
      name: '',
      width: 'hairline',
      color: 'black',
      style: 'solid'
    }
  ];

  beforeEach(() => {
    mockSetLineStyles.mockClear();
  });

  it('should show popup when calculated is selected from dropdown', () => {
    render(
      <LineSettings 
        lineStyles={testLineStyles} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Find all select elements
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];

    // Select "calculated" from dropdown
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Check if popup appears
    expect(screen.getByText('Choose desired calculated dash pattern')).toBeInTheDocument();
  });

  it('should display all calculated styles in the popup', () => {
    render(
      <LineSettings 
        lineStyles={testLineStyles} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Trigger popup
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Check if all calculated styles are displayed
    const calculatedStyles = DEFAULT_LINE_STYLES.filter(s => s.style === 'calculated');
    
    calculatedStyles.forEach(style => {
      expect(screen.getByText(style.name)).toBeInTheDocument();
    });
  });

  it('should close popup when cancel is clicked', () => {
    render(
      <LineSettings 
        lineStyles={testLineStyles} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Trigger popup
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Check if popup is closed
    expect(screen.queryByText('Choose desired calculated dash pattern')).not.toBeInTheDocument();
  });

  it('should close popup when X button is clicked', () => {
    render(
      <LineSettings 
        lineStyles={testLineStyles} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Trigger popup
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Click X button
    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);

    // Check if popup is closed
    expect(screen.queryByText('Choose desired calculated dash pattern')).not.toBeInTheDocument();
  });

  it('should create new calculated style with correct name and suffix', () => {
    render(
      <LineSettings 
        lineStyles={testLineStyles} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Trigger popup
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Select a calculated type
    const firstCalculatedStyle = DEFAULT_LINE_STYLES.find(s => s.style === 'calculated');
    if (firstCalculatedStyle?.calculatedType) {
      const radioButton = screen.getByDisplayValue(firstCalculatedStyle.calculatedType);
      fireEvent.click(radioButton);

      // Click create style
      fireEvent.click(screen.getByText('Create Style'));

      // Verify that setLineStyles was called
      expect(mockSetLineStyles).toHaveBeenCalled();
      
      const callArgs = mockSetLineStyles.mock.calls[0][0];
      const newStyle = callArgs.find((s: LineStyle) => s.style === 'calculated');
      
      expect(newStyle).toBeDefined();
      expect(newStyle.name).toBe(`${firstCalculatedStyle.name} (2)`);
      expect(newStyle.calculatedType).toBe(firstCalculatedStyle.calculatedType);
      expect(newStyle.applicableToLines).toEqual(firstCalculatedStyle.applicableToLines);
    }
  });

  it('should increment suffix when style name already exists', () => {
    const stylesWithExisting: LineStyle[] = [
      ...testLineStyles,
      {
        id: 'existing-calc',
        name: 'D: 2min dot (2)',
        width: 'hairline',
        color: 'black',
        style: 'calculated',
        calculatedType: 'declination-2min-dot'
      }
    ];

    render(
      <LineSettings 
        lineStyles={stylesWithExisting} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Trigger popup
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Select the same calculated type that already exists
    const dotStyle = DEFAULT_LINE_STYLES.find(s => s.calculatedType === 'declination-2min-dot');
    if (dotStyle?.calculatedType) {
      const radioButton = screen.getByDisplayValue(dotStyle.calculatedType);
      fireEvent.click(radioButton);

      // Click create style
      fireEvent.click(screen.getByText('Create Style'));

      // Verify that the new style has suffix (3) since (2) already exists
      const callArgs = mockSetLineStyles.mock.calls[0][0];
      const newStyle = callArgs.find((s: LineStyle) => s.name.includes('(3)'));
      
      expect(newStyle).toBeDefined();
      expect(newStyle.name).toBe('D: 2min dot (3)');
    }
  });

  it('should disable create button when no calculated type is selected', () => {
    render(
      <LineSettings 
        lineStyles={testLineStyles} 
        setLineStyles={mockSetLineStyles} 
      />
    );

    // Trigger popup
    const styleDropdowns = screen.getAllByRole('combobox');
    const lastDropdown = styleDropdowns[styleDropdowns.length - 1];
    fireEvent.change(lastDropdown, { target: { value: 'calculated' } });

    // Check if create button is disabled
    const createButton = screen.getByText('Create Style');
    expect(createButton).toBeDisabled();
  });
});