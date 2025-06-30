import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// PWA Update Detection
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New service worker has taken control
    console.log('🔄 New service worker activated');
  });
}

// PWA Offline Detection
window.addEventListener('online', () => {
  console.log('🌐 Back online');
  // Could trigger sync of offline actions
});

window.addEventListener('offline', () => {
  console.log('📱 Gone offline');
  // Could show offline indicator
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);