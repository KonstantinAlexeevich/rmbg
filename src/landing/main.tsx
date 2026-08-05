import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from './LandingPage';
import '../studio/styles.css';

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>,
);
