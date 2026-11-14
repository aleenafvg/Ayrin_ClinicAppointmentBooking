import { UserProvider } from './context/UserContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';

export const App = () => {
  return (
    <UserProvider>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#1a202c',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <Header />
        <HomePage />
      </div>
    </UserProvider>
  );
};

export default App;
