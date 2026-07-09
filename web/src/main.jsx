import './setup-globals.js';

// styles
import './styles/colors_and_type.css';
import './styles/kit.css';
import './styles/app.css';

// food database + barcode scanner (expose window.searchFoods/lookupBarcode/startBarcodeScan)
import './food.js';
import './scanner.js';
import './planner.js'; // Tagesplaner-Engine (window.planner)

// ported prototype modules (order matters: later defs override earlier ones)
import './store.jsx';
import './components.jsx';
import './screens-main.jsx';
import './screens-dashboard.jsx';
import './screens-log.jsx';
import './screens-more.jsx';
import './screens-misc.jsx';
import './screens-detail.jsx';
import './screens-onboarding.jsx';
import './screens-planner.jsx';
import './app.jsx'; // defines window.App

import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth, LoginScreen, Splash, signOut } from './auth.jsx';

window.mfSignOut = signOut;
const App = window.App;

function Root() {
  const { session } = useAuth();
  const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo');
  if (demo) return <App />;

  if (session === undefined) return <Splash />;
  if (session === null) return <LoginScreen />;
  return <App />;
}

const rootEl = document.getElementById('root');
const root = window.__mfRoot || createRoot(rootEl);
window.__mfRoot = root;

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
