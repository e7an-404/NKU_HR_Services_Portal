import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './lib/toast';
import './index.css';

// Prevent benign media abort/interrupted rejections from bubbling as uncaught errors
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.name === 'AbortError' ||
    event.reason?.message?.includes('The play() request was interrupted') ||
    event.reason?.message?.includes('interrupted because the media was removed')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);

