import { useHealthCheck } from '../hooks/useHealthCheck';

export const HomePage = () => {
  const { status, timestamp, error, apiUrl, recheck } = useHealthCheck();

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.5rem', color: '#2d3748' }}>
          Clinic Frontend Foundation
        </h2>
        <p style={{ color: '#4a5568', lineHeight: 1.6 }}>
          The React + TypeScript application has been successfully initialized using Vite.
          The backend API client and architecture foundation are configured and ready.
        </p>

        <section style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f7fafc',
          borderRadius: '0.375rem',
          border: '1px solid #edf2f7',
        }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#2d3748' }}>
            Environment Configuration
          </h3>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '0.5rem' }}>
            <dt style={{ fontWeight: 600, color: '#4a5568', fontSize: '0.875rem' }}>API Base URL:</dt>
            <dd style={{ margin: 0, color: '#2b6cb0', fontFamily: 'monospace', fontSize: '0.875rem' }}>{apiUrl}</dd>

            <dt style={{ fontWeight: 600, color: '#4a5568', fontSize: '0.875rem' }}>Backend Link:</dt>
            <dd style={{ margin: 0, fontSize: '0.875rem' }}>
              {status === 'loading' && (
                <span style={{ color: '#d69e2e', fontWeight: 500 }}>Connecting to backend...</span>
              )}
              {status === 'online' && (
                <span style={{ color: '#38a169', fontWeight: 600 }}>
                  Online (Verified at {timestamp})
                </span>
              )}
              {status === 'offline' && (
                <span style={{ color: '#e53e3e', fontWeight: 500 }}>
                  Offline or Not Started ({error})
                </span>
              )}
            </dd>
          </dl>
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={recheck}
              style={{
                backgroundColor: '#3182ce',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.25rem',
                padding: '0.4rem 0.8rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Test Backend Connection
            </button>
          </div>
        </section>

        <section style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#2d3748', marginBottom: '0.5rem' }}>
            Project Structure
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4a5568', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><code>src/components</code> — Shared reusable UI components</li>
            <li><code>src/pages</code> — Top-level views and screen containers</li>
            <li><code>src/services</code> — Reusable API client foundation with <code>X-User-Id</code> support</li>
            <li><code>src/types</code> — Shared TypeScript domain interfaces and responses</li>
            <li><code>src/hooks</code> — Reusable React hooks</li>
          </ul>
        </section>
      </div>
    </main>
  );
};
