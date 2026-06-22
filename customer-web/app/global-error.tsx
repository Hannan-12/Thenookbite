'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <html>
      <body style={{ background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', fontFamily: 'monospace', color: '#fff', padding: '2rem' }}>
          <p style={{ color: '#E4002B', fontSize: '0.75rem', letterSpacing: '0.4em', marginBottom: '0.5rem' }}>SYSTEM ERROR</p>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>SOMETHING WENT WRONG</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            {error.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{ background: '#E4002B', color: '#fff', border: 'none', padding: '0.75rem 2rem', fontSize: '0.875rem', letterSpacing: '0.2em', cursor: 'pointer' }}
          >
            TRY AGAIN
          </button>
        </div>
      </body>
    </html>
  );
}
