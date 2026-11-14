import { UserSelector } from './UserSelector';

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
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#1a202c', fontWeight: 600 }}>{title}</h1>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#718096' }}>{subtitle}</p>
      </div>

      <UserSelector />
    </header>
  );
};
