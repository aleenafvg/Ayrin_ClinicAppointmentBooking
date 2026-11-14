export interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header = ({
  title = 'Ayrin Clinic',
  subtitle = 'Appointment Booking System',
}: HeaderProps) => {
  return (
    <header style={{
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 2rem',
      backgroundColor: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#1a202c', fontWeight: 600 }}>{title}</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#718096' }}>{subtitle}</p>
      </div>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: '#ebf8ff',
        color: '#2b6cb0',
      }}>
        Frontend Ready
      </div>
    </header>
  );
};
