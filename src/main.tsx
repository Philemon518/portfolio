import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AI_SITE_MANIFEST } from './data/aiSiteManifest';
import { preloadHandLandmarkerAssets } from './hand/preloadHandLandmarker';
import { preloadPortfolioModels } from './lib/preloadPortfolioModels';
import './styles.css';
import './styles-jimbo-demo.css';

console.info('[portfolio-ai-manifest]', AI_SITE_MANIFEST);

preloadPortfolioModels();
preloadHandLandmarkerAssets();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
