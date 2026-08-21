import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AI_SITE_MANIFEST } from './data/aiSiteManifest';
import './styles.css';
import './styles-jimbo-demo.css';

console.info('[portfolio-ai-manifest]', AI_SITE_MANIFEST);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
