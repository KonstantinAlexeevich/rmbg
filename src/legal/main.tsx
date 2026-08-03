import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AboutPage } from './AboutPage';
import '../studio/styles.css';

document.documentElement.lang = 'en';

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <AboutPage />
  </StrictMode>,
);
