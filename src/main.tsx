import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  let currentFetch = window.fetch;
  const desc =
    Object.getOwnPropertyDescriptor(window, 'fetch') ||
    Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
  if (!desc || (!desc.set && desc.configurable !== false)) {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return currentFetch;
      },
      set(fn) {
        if (typeof fn === 'function') {
          currentFetch = fn;
        }
      },
    });
  }
} catch {
  // Ignore if property is locked by host environment
}

createRoot(document.getElementById('root')!).render(<App />);
