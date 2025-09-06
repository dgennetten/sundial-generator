# Sundial Generator

A web-based application for generating and customizing sundials. Create beautiful, accurate sundials for any location on Earth with customizable styles and export options.

## Features

- **Interactive Design**: Design sundials with real-time preview
- **Location-Based**: Accurate solar calculations for any latitude/longitude
- **Multiple Export Formats**: PNG, SVG, PDF, and Print-ready output
- **Customizable Styles**: Various line styles, gnomon types, and text options
- **Historical Accuracy**: Proper astronomical calculations for declination and hour lines

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A web browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sundial-generator.git
   cd sundial-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional):
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

1. Set your location using the location input or map picker
2. Customize your sundial design using the various options
3. Preview your design in real-time
4. Export your sundial in your preferred format

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # React components
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── tests/              # Test files
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

### What this means:

- **Attribution**: You must give appropriate credit when using this work
- **NonCommercial**: You may not use this work for commercial purposes
- **ShareAlike**: If you modify or build upon this work, you must distribute your contributions under the same license

For the full license text, see the [LICENSE](LICENSE) file.

### Permissions:

✅ **Allowed**:
- Personal use
- Educational use
- Sharing and redistribution (with attribution)
- Modification and derivative works (must use same license)

❌ **Not Allowed**:
- Commercial use without permission
- Using without attribution
- Distributing derivative works under different licenses

## Acknowledgments

- Solar calculations based on astronomical algorithms
- Built with React, TypeScript, and Vite
- Uses Google Maps API for location services
- PDF generation powered by jsPDF and svg2pdf.js

## Support

For questions or feedback, please contact: [sundial@gennetten.com](mailto:sundial@gennetten.com)