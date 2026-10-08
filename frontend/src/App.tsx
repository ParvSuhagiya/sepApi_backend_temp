import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/router';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-surface text-ink">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
