import { UserSelector } from './UserSelector';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header = ({
  title = 'Ayrin Clinic',
  subtitle = 'Appointment Booking & Schedule Management',
}: HeaderProps) => {
  return (
    <header className="site-header">
      <div className="site-header-content">
        <div className="brand-wrapper">
          <div>
            <h1 className="brand-title">{title}</h1>
            <p className="brand-subtitle">{subtitle}</p>
          </div>
        </div>

        <UserSelector />
      </div>
    </header>
  );
};
