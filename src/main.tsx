import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import DropGuard from './DropGuard.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DropGuard>
      <App />
    </DropGuard>
  </React.StrictMode>
);
