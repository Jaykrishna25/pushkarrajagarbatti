import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {loadSiteData} from './data/site';
import './index.css';

// Pinned stages depend on scroll position; start at the top unless a hash is given.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

loadSiteData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
