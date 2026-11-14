import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';

export const App = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1a202c', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Header />
      <HomePage />
    </div>
  );
};

export default App;
