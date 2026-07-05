// Fournit React et ReactDOM en GLOBALS, comme le faisaient les scripts UMD du
// CDN (window.React / window.ReactDOM). Ce module est importé EN PREMIER par
// src/main.jsx, donc les globals existent avant que le moindre écran ne s'exécute.
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

window.React = React;
// app.jsx n'utilise que ReactDOM.createRoot ; on expose l'équivalent React 18.
window.ReactDOM = { createRoot, hydrateRoot };
