import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerServiceWorker} from './lib/registerServiceWorker';
import {retryStoredAudioDeletions} from './lib/audioStorage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
void retryStoredAudioDeletions().catch((error) => console.error('Audio cleanup retry failed:', error));
