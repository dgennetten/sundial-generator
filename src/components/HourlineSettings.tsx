import React from 'react';
import type { LineStyle } from './LineSettings';

type DateRange = 'FullYear' | 'SummerToWinter' | 'WinterToSummer';

interface HourlineSettingsProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  lineStyles: LineStyle[];
  selectedStyle: string;
  setSelectedStyle: (id: string) => void;
}

const HourlineSettings: React.FC<HourlineSettingsProps> = ({
  dateRange,
  setDateRange,
  lineStyles,
  selectedStyle,
  setSelectedStyle,
}) => {
  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hourline Settings</strong></legend>
      <label>
        Date Range:&nbsp;
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
        >
          <option value="FullYear">Full Year</option>
          <option value="SummerToWinter">Summer to Winter</option>
          <option value="WinterToSummer">Winter to Summer</option>
        </select>
      </label>
      <br /><br />
      <label>
        Hourline Style:&nbsp;
        <select
          value={selectedStyle}
          onChange={e => setSelectedStyle(e.target.value)}
        >
          {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
            <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
          ))}
        </select>
      </label>
    </fieldset>
  );
};

export default HourlineSettings; 