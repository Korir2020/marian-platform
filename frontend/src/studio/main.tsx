import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import AuthGate from './AuthGate';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <HashRouter><AuthGate><App /></AuthGate></HashRouter>
);
