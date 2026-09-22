import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import BandeauDemoWeb from './components/BandeauDemoWeb';
import { installerApiWeb } from './lib/apiWeb';
import './styles/global.css';

// Dans l'application de bureau, `window.olmix` est deja pose par le preload
// Electron et l'appel ci-dessous ne fait rien. Ouverte dans un navigateur, la
// meme interface est servie par l'adaptateur de demonstration.
const versionWeb = installerApiWeb();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {versionWeb && <BandeauDemoWeb />}
  </React.StrictMode>,
);
