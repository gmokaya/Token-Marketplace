import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import '../../wrs-marketplace/src/components/onboarding-workspace.css';

createRoot(document.getElementById('root')!).render(<App />);
