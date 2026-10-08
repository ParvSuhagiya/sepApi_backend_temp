import { Link } from 'react-router-dom';

/** Shown for unknown routes. Rebuilt with the design system in step 1.4. */
export function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you asked for does not exist.</p>
      <Link to="/">Back to EarnRadar home</Link>
    </main>
  );
}
