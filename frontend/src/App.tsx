import { UserProvider } from './context/UserContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';

export const App = () => {
  return (
    <UserProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <HomePage />
      </div>
    </UserProvider>
  );
};

export default App;
