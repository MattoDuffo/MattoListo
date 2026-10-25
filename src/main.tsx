import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// We got this far, so clear the one-shot recovery latch set in index.html:
// a future failure is allowed to try clearing the worker and caches again.
try {
  sessionStorage.removeItem('mattolisto.recovering');
} catch {
  /* storage blocked; the latch simply never set either */
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
