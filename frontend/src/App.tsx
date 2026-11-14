import { UserProvider } from './context/UserContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ClinicAssistant } from './components/ClinicAssistant';

export const App = () => {
  return (
    <UserProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <HomePage />
        <ClinicAssistant />
      </div>
    </UserProvider>
  );
};

export default App;
