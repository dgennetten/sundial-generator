# Sundial Generator User Manual

**Version 1.19.8**

A comprehensive guide to creating beautiful, accurate sundials for any location on Earth.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Location Settings](#location-settings)
4. [Page Settings](#page-settings)
5. [Gnomon Settings](#gnomon-settings)
6. [Hour Line Settings](#hour-line-settings)
7. [Declination Lines](#declination-lines)
8. [Line Styles](#line-styles)
9. [Dial Text Block](#dial-text-block)
10. [Export and Print](#export-and-print)
11. [Saving and Loading Configurations](#saving-and-loading-configurations)
12. [Advanced Features](#advanced-features)
13. [Tips and Best Practices](#tips-and-best-practices)
14. [Troubleshooting](#troubleshooting)
15. [Proposed Enhancements](#proposed-enhancements)

---

## Introduction

The Sundial Generator is a web-based application that allows you to design and create accurate sundials for any location on Earth. Using precise astronomical calculations, the app generates hour lines, declination lines, and analemmas that accurately represent the sun's path throughout the year.

![Sundial Generator Main Interface](images/main-interface.png)
*Figure 1: The main interface showing the control panel on the left and preview on the right*

### Key Features

- **Real-time Preview**: See your sundial design update instantly as you make changes
- **Location-Based Accuracy**: Automatic calculations for any latitude and longitude
- **Multiple Export Formats**: PNG, SVG, PDF, and direct printing
- **Customizable Design**: Control every aspect from line styles to text placement
- **Professional Output**: High-resolution exports suitable for printing

---

## Getting Started

### First Launch

When you first open the Sundial Generator, you'll see a welcome dialog that guides you through the basic steps of creating a sundial. This dialog can be dismissed and will reappear if you reset your settings.

![Welcome Dialog](images/welcome-dialog.png)
*Figure 2: The welcome dialog provides an overview of the main features*

### Interface Overview

The application is divided into two main panels:

- **Left Panel**: Control settings organized into cards
- **Right Panel**: Real-time preview of your sundial design

The interface is responsive and adapts to different screen sizes, with a mobile-friendly layout for smaller devices.

---

## Location Settings

The accuracy of your sundial depends on correctly setting your location. The Sundial Generator provides multiple ways to specify your location.

![Location Settings Card](images/location-settings.png)
*Figure 3: Location settings with multiple input methods*

### Setting Location by City

1. Click the **Location** dropdown menu
2. Select a city from the list of major cities worldwide
3. The latitude, longitude, and timezone will be automatically set

### Setting Location by Coordinates

1. Enter your **Latitude** (degrees, -90 to +90)
   - Positive values for Northern Hemisphere
   - Negative values for Southern Hemisphere
2. Enter your **Longitude** (degrees, -180 to +180)
   - Positive values for Eastern Hemisphere
   - Negative values for Western Hemisphere
3. Enter your **Timezone Meridian** (degrees)
   - This is the longitude of your timezone's standard meridian
   - Example: -105° for Mountain Standard Time (MST)

### Using the Interactive Map

1. Click the **Map** button to open the interactive map picker
2. Navigate to your location on the map
3. Click on the map to set your location
4. The coordinates will be automatically filled in

![Interactive Map Picker](images/map-picker.png)
*Figure 4: Interactive map for selecting your location*

### Location Name

Enter a custom name for your location. This will appear in the dial text block and can include placeholders like `{location}`, `{coordinates}`, etc.

### Hemisphere Detection

The app automatically detects your hemisphere based on latitude:
- **Northern Hemisphere** (latitude ≥ 0): Default dial orientation is North
- **Southern Hemisphere** (latitude < 0): Default dial orientation is South

---

## Page Settings

The Page Settings card controls the physical dimensions and orientation of your sundial.

![Page Settings Card](images/page-settings.png)
*Figure 5: Page settings for size, orientation, and dial configuration*

### Page Size

Choose from several standard sizes:
- **Letter** (8.5" × 11" / 216mm × 279mm)
- **A4** (210mm × 297mm)
- **11×17** (11" × 17" / 279mm × 432mm)
- **10×15cm Postcard** (100mm × 150mm)
- **Custom**: Define your own dimensions

### Custom Page Size

When selecting Custom:
1. Enter **Width** and **Height** values
2. Choose units: **Inches** or **Centimeters**
3. Values are stored internally in millimeters for precision

### Orientation

- **Landscape**: Width > Height
- **Portrait**: Height > Width

### Incline Type

Controls how the sundial surface is oriented relative to the horizontal:

- **Horizontal**: Flat surface (most common)
- **Cancer**: Tilted toward the Tropic of Cancer (23.5° toward north in Northern Hemisphere)
- **Polar**: Parallel to Earth's polar axis (tilted at your latitude)
- **Capricorn**: Tilted toward the Tropic of Capricorn (23.5° toward south in Northern Hemisphere)
- **Vertical**: Perpendicular to horizontal (90° tilt)
- **Manual**: Custom tilt angle

**Note**: Cancer, Polar, and Capricorn incline types are only available when declination is set to the default direction (North for Northern Hemisphere, South for Southern Hemisphere).

### Tilt Angle

When using **Manual** incline type, set the tilt angle in degrees:
- 0° = Horizontal
- 90° = Vertical
- Values between for inclined surfaces

### Declination Type

For vertical or declined dials, controls which direction the dial faces:

- **North**: Dial faces north
- **Northeast**: Dial faces northeast
- **Northwest**: Dial faces northwest
- **East**: Dial faces east
- **West**: Dial faces west
- **Southeast**: Dial faces southeast
- **Southwest**: Dial faces southwest
- **South**: Dial faces south
- **Manual**: Custom declination angle

### Declination Degrees

When using **Manual** declination, enter the angle in degrees from north (0° = north, 90° = east, etc.).

### Dial Orientation

Controls which direction is "up" on the dial:
- **North**: North at top (Northern Hemisphere default)
- **South**: South at top (Southern Hemisphere default)

**Note**: For non-horizontal dials outside the tropics, dial orientation is automatically locked based on hemisphere.

### Dial Shape

- **Rectangle**: Classic rectangular sundial
- **Oval**: Elliptical sundial shape

### Border Style

Choose from various border styles:
- **Default Hairline**: Thin solid line
- **Dashed**: Dashed border
- **Dotted**: Dotted border
- Custom styles can be created in Line Settings

### Border Margin

Set the margin between the dial content and border:
- Measured in inches
- Default: 0.236" (6mm)
- Smaller for postcard size: 0.1"

### Background

- **Show Background**: Toggle background color
- **Background Color**: Choose color (default: Cornsilk)

---

## Gnomon Settings

The gnomon is the shadow-casting element of your sundial. The Sundial Generator offers several gnomon types and automatic height calculation.

![Gnomon Settings Card](images/gnomon-settings.png)
*Figure 6: Gnomon settings with type selection and height/position controls*

### Gnomon Type

Choose from five gnomon styles:

1. **Crosshair**: Simple crosshair marker
2. **Crosshair + North Point**: Crosshair with north indicator
3. **Crosshair + Height**: Crosshair with height label
4. **Popup**: 3D popup gnomon (ideal for paper dials)
5. **Popup with Brace**: Popup gnomon with support brace

![Gnomon Types Comparison](images/gnomon-types.png)
*Figure 7: Different gnomon types available*

### Height Mode

- **Auto**: Automatically calculates optimal gnomon height based on:
  - Your latitude
  - Page dimensions
  - Winter-to-summer solstice shadow distance
- **Manual**: Set a specific height in millimeters

### Position Mode

- **Auto**: Automatically positions gnomon to center the noon analemma vertically
- **Manual**: Set vertical position from top edge in millimeters

### Height Calculation

The auto height calculation ensures that the distance between winter and summer solstice shadows is approximately 40% of the page height, providing optimal readability throughout the year.

---

## Hour Line Settings

Hour lines show the time throughout the day. You can customize which intervals are displayed and how they're styled.

![Hour Line Settings Card](images/hourline-settings.png)
*Figure 8: Hour line settings with interval selection and time range controls*

### Date Range

Controls which part of the year the hour lines represent:

- **Full Year**: Hour lines for the entire year (creates analemmas)
- **Winter to Spring**: Hour lines for December 21 to June 21
- **Summer to Fall**: Hour lines for June 21 to December 21

**Tip**: Using a half-year range creates cleaner, easier-to-read hour lines without the analemma curves.

### Hour Line Intervals

Configure which time intervals are displayed:

- **Hour**: Full hour marks (always active)
- **Half-hour**: 30-minute intervals
- **Quarter-hour**: 15-minute intervals
- **5-minute**: 5-minute intervals
- **2-minute**: 2-minute intervals

Each interval can be:
- **Activated/Deactivated**: Toggle visibility
- **Styled**: Assign different line styles

### Time Range

Set the hours to display:
- **Start Hour**: First hour to show (default: 4 AM)
- **Stop Hour**: Last hour to show (default: 8 PM)
- **24-Hour Format**: Toggle between 12-hour (AM/PM) and 24-hour format

### Label Options

- **Label Winter Side**: Show labels on winter solstice side
- **Label Summer Side**: Show labels on summer solstice side
- **Label Offset**: Distance from hour line to label (in mm)

### Font Settings

- **Font Family**: Choose font (sans-serif, serif, monospace, etc.)
- **Font Size**: Size in points (adjusts automatically for postcard size)

### Daylight Saving Time

- **Use DST**: Account for daylight saving time adjustments

### Declination Noonmarks

- **Show Noonmarks**: Display marks on declination lines at noon

---

## Declination Lines

Declination lines show the sun's position on specific dates throughout the year, creating the analemma (figure-8) pattern.

![Declination Lines Card](images/declination-lines.png)
*Figure 9: Declination line options for special dates*

### Built-in Declination Lines

The app includes several pre-configured declination lines:

- **Summer Solstice**: June 21 (longest day)
- **Equinox**: March 20 and September 23 (equal day/night)
- **Winter Solstice**: December 21 (shortest day)
- **1st of the Month**: First day of each month
- **1st and 15th**: First and fifteenth of each month
- **Today**: Current date (shown in red)

### Custom Declination Lines

Add your own special dates:

1. Click **Add Date Line**
2. Enter the **Day** (1-31)
3. Enter the **Month** (1-12)
4. Select a **Line Style**
5. Check **Active** to display the line

### Line Styles for Declination

Special calculated line styles are available:
- **D: 2min dot**: Dots every 2 minutes
- **D: 5min dot**: Dots every 5 minutes
- **D: 2min dash**: Dashes every 2 minutes

These styles encode time information in the line pattern, making it easier to interpolate times between hour lines.

---

## Line Styles

Line styles control the appearance of hour lines and declination lines. You can create custom styles or use built-in options.

![Line Settings Card](images/line-settings.png)
*Figure 10: Line style editor with customization options*

### Built-in Line Styles

- **Default Hairline**: Thin solid black line
- **Dashed Hairline**: Dashed black line
- **Dotted Hairline**: Dotted black line
- **0.5mm Black**: 0.5mm solid black line
- **Red Dash Hairline**: Red dashed line

### Calculated Line Styles

Special styles that encode date/time information:

- **H: 5/2 day dash**: Hourline with 5mm dashes, 2mm gaps (5 days on, 2 days off pattern)
- **H: 2/2 day dash**: Hourline with 2mm dashes, 2mm gaps (2 days on, 2 days off pattern)
- **D: 2min dot**: Declination line with dots every 2 minutes
- **D: 5min dot**: Declination line with dots every 5 minutes
- **D: 2min dash**: Declination line with dashes every 2 minutes

### Creating Custom Line Styles

1. Scroll to the **Custom Styles** section
2. Click **Add Line Style**
3. Configure:
   - **Name**: Descriptive name
   - **Width**: Hairline, 0.5mm, 1mm, etc.
   - **Color**: Black, red, or custom CSS color
   - **Style**: Solid, dashed, dotted
4. Click **Save**

### Editing and Deleting Styles

- **Edit**: Click the style name to modify
- **Delete**: Click the delete button (X) for custom styles
- **Note**: Built-in styles cannot be deleted

---

## Dial Text Block

The text block allows you to add custom text, location information, and metadata to your sundial.

![Dial Text Block Settings](images/text-block-settings.png)
*Figure 11: Text block configuration with placeholder options*

### Text Block Content

Enter text with support for:
- **Markdown formatting**: Bold (`**text**`), italic (`*text*`)
- **Placeholders**: Dynamic content that updates automatically

### Available Placeholders

- `{location}`: Location name
- `{coordinates}`: Latitude and longitude
- `{half-year}`: Date range (Winter-Spring or Summer-Fall)
- `{gnomon}`: Gnomon type and height
- `{incline}`: Incline type and angle
- `{today}`: Current date

### Text Block Position

- **Mode**: 
  - **Text Block**: Standard text block
  - **Sundial Notes**: Alternative positioning
- **Position Mode**:
  - **Auto**: Automatically positioned
  - **Manual**: Set custom offset in millimeters
- **Offset**: Vertical offset from default position

### Font Settings

- **Font Family**: Choose font family
- **Font Size**: Size in points (auto-adjusts for postcard)

### Background

- **Show Background**: Toggle background color
- **Background Color**: Choose color (default: Cornsilk)

---

## Export and Print

The Sundial Generator supports multiple export formats and direct printing.

![Export and Print Card](images/export-print.png)
*Figure 12: Export options with format selection and print button*

### Export Formats

1. **PNG**: Raster image format
   - Select **DPI**: 150, 300, 600, 1200, or 2400
   - Higher DPI = better quality, larger file size
   - Recommended: 600 DPI for printing

2. **SVG**: Vector format (scalable)
   - Perfect for further editing
   - Maintains quality at any size

3. **PDF**: Portable Document Format
   - Print-ready format
   - Maintains vector quality

### Export Process

1. Select your **Export Format**
2. If PNG, choose **DPI**
3. Click **Export**
4. Wait for processing (larger DPI takes longer)
5. File downloads automatically

### Direct Printing

1. Click the **Print** button
2. Your browser's print dialog opens
3. Configure print settings:
   - **Paper Size**: Match your page size setting
   - **Orientation**: Match your orientation setting
   - **Scale**: 100% for accurate size
4. Print

**Tip**: Use the popup gnomon to verify your dial's scale before printing. Measure the gnomon height on the printed dial to ensure accuracy.

### Reset to Defaults

Click the **Undo** button (↶) to:
- Reset all custom settings to defaults
- Clear saved line styles and declination lines
- Restore the welcome dialog

---

## Saving and Loading Configurations

Save your dial configurations to reuse later or share with others.

![Save and Load Buttons](images/save-load.png)
*Figure 13: Save and Load buttons for configuration management*

### Saving a Configuration

1. Configure your sundial settings
2. Click **Save**
3. Enter a descriptive name
4. Click **Save** in the dialog

Your configuration is saved to browser localStorage and includes:
- Location settings
- Page settings
- Gnomon settings
- Hour line settings
- Line styles
- Declination lines
- Text block settings

### Loading a Saved Configuration

1. Click **Load**
2. Browse saved configurations
3. Click on a configuration to restore it
4. All settings are restored instantly

### Managing Saved Configurations

- **Delete**: Click the trash icon next to a saved configuration
- **Confirmation**: Requires two clicks to prevent accidental deletion

### Configuration Persistence

- Configurations are stored in your browser's localStorage
- They persist across browser sessions
- Clearing browser data will remove saved configurations
- Each configuration includes a timestamp

---

## Advanced Features

### Calculated Line Styles

The Sundial Generator includes sophisticated "calculated" line styles that encode temporal information in their visual appearance:

- **Hourline Calculated Styles**: Dash patterns represent day-of-year information
- **Declination Calculated Styles**: Dot/dash patterns represent time-of-day information

These styles make it easier to interpolate times and dates between the main hour and declination lines.

![Calculated Line Styles Example](images/calculated-styles.png)
*Figure 14: Example showing calculated line styles with encoded information*

### Hemisphere-Specific Defaults

The app automatically adjusts defaults based on your hemisphere:
- **Northern Hemisphere**: North orientation, appropriate gnomon positioning
- **Southern Hemisphere**: South orientation, adjusted calculations

### Real-time Preview

All changes update the preview instantly:
- No need to click "Apply" or "Update"
- See results immediately
- Experiment freely with different settings

### Mobile Responsive

The interface adapts to mobile devices:
- Stacked layout on small screens
- Touch-friendly controls
- Optimized font sizes

---

## Tips and Best Practices

### Choosing the Right Page Size

- **Letter/A4**: Good for standard sundials, easy to print
- **11×17**: Larger format for detailed dials with many hour lines
- **Postcard**: Compact format for simple dials or gifts

### Gnomon Selection

- **Popup Gnomon**: Best for paper dials, allows hands-on experimentation
- **Crosshair**: Clean, minimal appearance
- **Crosshair + Height**: Useful for verifying scale

### Date Range Selection

- **Full Year**: Shows complete analemma, more complex but comprehensive
- **Half Year**: Cleaner appearance, easier to read, less cluttered

### Line Style Strategy

- Use **thicker lines** for main hour marks
- Use **calculated styles** for intermediate intervals
- Use **different colors** to distinguish line types

### Export Quality

- **600 DPI**: Good balance for most printing
- **1200+ DPI**: For very large prints or professional output
- **SVG**: Best for further editing or vector graphics work

### Verifying Accuracy

1. Enable the **popup gnomon**
2. Print your dial
3. Measure the gnomon height on the printed page
4. Compare to the specified height
5. Adjust if needed

### Location Accuracy

- Use precise coordinates for best results
- Verify timezone meridian matches your location
- Consider daylight saving time settings

### Incline Type Selection

- **Horizontal**: Most common, easiest to use
- **Cancer/Capricorn**: For dials tilted toward tropics
- **Polar**: For dials parallel to Earth's axis
- **Vertical**: For wall-mounted sundials
- **Manual**: For custom angles

---

## Troubleshooting

### Hour Lines Not Appearing

- **Check Date Range**: Ensure your selected date range includes the current date
- **Verify Time Range**: Check that start/stop hours include desired times
- **Check Line Styles**: Ensure hour line intervals are activated

### Gnomon Position Incorrect

- **Try Auto Position**: Switch to auto mode for automatic centering
- **Check Page Size**: Verify page dimensions are correct
- **Verify Location**: Ensure latitude/longitude are accurate

### Export Quality Issues

- **Increase DPI**: Try higher DPI settings for better quality
- **Check Browser**: Some browsers handle exports differently
- **Try SVG**: Use SVG format for maximum quality

### Saved Configurations Not Loading

- **Check Browser Storage**: Ensure localStorage is enabled
- **Clear and Re-save**: Delete and recreate the configuration
- **Browser Compatibility**: Some browsers have localStorage limitations

### Preview Not Updating

- **Refresh Page**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- **Check Console**: Look for JavaScript errors in browser console
- **Clear Cache**: Clear browser cache and reload

### Location Not Found

- **Use Coordinates**: Enter latitude/longitude directly
- **Check Spelling**: Verify city name spelling in dropdown
- **Use Map**: Use the interactive map picker as alternative

### Print Size Incorrect

- **Match Settings**: Ensure print dialog paper size matches page size setting
- **Check Scale**: Set print scale to 100%
- **Verify Orientation**: Match print orientation to setting

### Incline Type Not Available

- **Check Declination**: Cancer, Polar, and Capricorn require default declination (North/South by hemisphere)
- **Use Manual**: Switch to Manual incline type for custom angles with non-default declination

---

## Proposed Enhancements

The following enhancements are proposed to expand the Sundial Generator's capabilities and bring it closer to professional sundial design software like Shadows Pro:

### Declined Dials (Vertically Rotated)

**Current State**: The app supports basic declination (North, South, East, West, etc.) but not true declined dials where the dial face is rotated around a vertical axis.

**Proposed Enhancement**: 
- Add support for declined dials where the dial face can be rotated to any angle around a vertical axis
- This would enable sundials mounted on walls that don't face exactly north, south, east, or west
- Combine with existing incline types for fully 3D-oriented dials

### Sun Azimuth and Altitude Lines

**Current State**: The app shows hour lines and declination lines but doesn't display azimuth or altitude information.

**Proposed Enhancement**:
- Add optional azimuth lines showing the sun's compass direction at different times
- Add optional altitude lines showing the sun's elevation angle
- These would help users understand solar geometry and verify dial accuracy

### Horizon Clipping

**Current State**: All hour lines and analemmas are drawn regardless of whether the sun is above the horizon.

**Proposed Enhancement**:
- Add option to clip lines below the horizon
- Show only the portions of hour lines where the sun is actually visible
- This would make dials more accurate and easier to read, especially at high latitudes

### Circular Dial Shape

**Current State**: Supports Rectangle and Oval shapes.

**Proposed Enhancement**:
- Add Circular dial shape option
- Full circle sundials are common and aesthetically pleasing
- Would require adjustments to border and content layout

### Enhanced Gnomon Options

**Current State**: Five gnomon types available.

**Proposed Enhancement**:
- Add more gnomon styles (e.g., nodus-style, style with multiple heights)
- Allow custom gnomon dimensions
- Support for multiple gnomon points on the same dial

### Advanced Time Corrections

**Current State**: Basic DST support and timezone meridian.

**Proposed Enhancement**:
- Equation of Time corrections
- Longitude correction for local solar time
- Custom time offset adjustments
- Display both local time and solar time

### Multiple Date Range Options

**Current State**: Full Year, Winter-Spring, Summer-Fall.

**Proposed Enhancement**:
- Custom date range selection (start and end dates)
- Seasonal ranges (Spring, Summer, Fall, Winter)
- Single date option for specific day dials

### Grid and Measurement Tools

**Current State**: No measurement or grid overlay options.

**Proposed Enhancement**:
- Optional grid overlay for precise measurements
- Measurement tools to verify distances
- Scale indicators on the dial

### Export Enhancements

**Current State**: PNG, SVG, PDF export.

**Proposed Enhancement**:
- Higher DPI options (up to 4800 DPI)
- Batch export multiple configurations
- Export with different color schemes
- Export dial components separately (hour lines, declination lines, etc.)

### 3D Preview

**Current State**: 2D preview only.

**Proposed Enhancement**:
- 3D visualization of the dial surface
- Show how the dial would look when mounted
- Interactive 3D rotation to view from different angles

### Template Library

**Current State**: Users create dials from scratch.

**Proposed Enhancement**:
- Pre-designed templates for common dial types
- Templates for different latitudes
- Seasonal templates
- Historical dial designs

### Detailed Instructions Generator

**Current State**: Basic text block with placeholders.

**Proposed Enhancement**:
- Automatic generation of detailed assembly instructions
- Step-by-step mounting guide
- Gnomon construction instructions
- Calibration and verification procedures

### Multi-Language Support Expansion

**Current State**: Welcome dialog supports multiple languages.

**Proposed Enhancement**:
- Full UI translation to multiple languages
- Localized date/time formats
- Regional measurement units

### Cloud Storage Integration

**Current State**: Configurations stored in browser localStorage.

**Proposed Enhancement**:
- Save configurations to cloud storage
- Share configurations via URL
- Import/export configuration files
- Sync across devices

### Advanced Line Style Options

**Current State**: Basic line styles with calculated patterns.

**Proposed Enhancement**:
- More calculated pattern types
- Custom dash/dot patterns
- Gradient line styles
- Variable width lines

### Solar Calendar Integration

**Current State**: Basic date selection for declination lines.

**Proposed Enhancement**:
- Integration with solar calendars
- Display of solar events (solstices, equinoxes, cross-quarter days)
- Lunar calendar integration
- Religious and cultural calendar markers

### Print Optimization

**Current State**: Basic print functionality.

**Proposed Enhancement**:
- Print preview with crop marks
- Multi-page printing for large dials
- Tiled printing options
- Print optimization for different paper types

### Accessibility Features

**Current State**: Basic responsive design.

**Proposed Enhancement**:
- High contrast mode
- Screen reader optimization
- Keyboard navigation improvements
- Colorblind-friendly color schemes

### Performance Optimizations

**Current State**: Good performance for standard dials.

**Proposed Enhancement**:
- Faster rendering for complex dials
- Progressive loading of preview
- Web Worker support for calculations
- Caching of calculation results

---

## Appendix

### Keyboard Shortcuts

- **Escape**: Close dialogs
- **Enter**: Confirm in dialogs
- **Tab**: Navigate between fields

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Opera**: Full support

### File Formats Explained

- **PNG**: Raster image, good for photos and complex graphics
- **SVG**: Vector image, scalable without quality loss
- **PDF**: Document format, maintains vector quality, print-ready

### Astronomical Accuracy

The Sundial Generator uses the **Hughes, Yallop & Hohenkerk algorithm**, which enables calculations for any epoch within 30 centuries of the present day, to a precision of about 3 seconds of time.

### Support and Feedback

For questions, bug reports, or feature requests:
- **Email**: [sundial@gennetten.com](mailto:sundial@gennetten.com)
- **GitHub**: [View Source Code](https://github.com/dgennetten/sundial-generator)

### License

This application is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

---

## Quick Reference Card

### Essential Settings Checklist

- [ ] Location set (latitude, longitude, timezone)
- [ ] Page size and orientation selected
- [ ] Gnomon type and height configured
- [ ] Hour line intervals activated
- [ ] Date range selected (full year or half year)
- [ ] Declination lines configured
- [ ] Text block content added
- [ ] Preview verified
- [ ] Export format and quality selected

### Recommended Settings for Beginners

1. **Location**: Use city dropdown or map picker
2. **Page Size**: Letter or A4
3. **Orientation**: Landscape
4. **Incline**: Horizontal
5. **Gnomon**: Popup with brace
6. **Date Range**: Winter to Spring (cleaner appearance)
7. **Hour Lines**: Hour and half-hour intervals
8. **Export**: PNG at 600 DPI

---

**Happy Dialing!**

*Last Updated: Version 1.19.8*
