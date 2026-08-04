import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { bootstrap } from './state/orchestrator';
import { startExtBridge } from './ext-bridge';
import { registerStudioServiceWorker } from './register-sw';
import './styles.css';

const container = document.getElementById('root');
if (container === null) throw new Error('Нет элемента #root');

registerStudioServiceWorker();
startExtBridge();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void bootstrap();
