import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PreviewScreen } from './screens/PreviewScreen';
import './index.css';

const isPreviewPath = window.location.pathname === '/preview';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPreviewPath ? <PreviewScreen /> : <App />}
  </StrictMode>
);

