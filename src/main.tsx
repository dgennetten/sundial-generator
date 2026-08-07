// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
// Eagerly bundled into the main CSS (not the lazy gallery chunk) on purpose:
// when this lived in PhotoGallery.tsx, Vite made it a dependency of the lazy
// chunk and the dynamic import waited on the stylesheet <link>'s load event.
// If that event never fires on a device, the import hangs forever — the gallery
// opens to a bare, endless spinner. Loading it up front (≈1.5 KB) avoids that.
import 'yet-another-react-lightbox/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);