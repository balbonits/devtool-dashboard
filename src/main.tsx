import 'ember-ui/styles.css';
import './styles/kinetic-shim.css'; // TEMPORARY until Ember v0.3.1 ships kinetic
import './styles/fonts.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './app.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
