import { BrowserRouter, Outlet, Route, Routes, useParams } from 'react-router-dom';
import './App.css'
import Header from './components/Header/Header'
import CollectionQuiz from './components/CollectionQuiz/CollectionQuiz';
import CollectionList from './components/CollectionList/CollectionList';
import Collection from './components/Collection/Collection';
import { useEffect, useState } from 'react';
import { ClueCollection } from './models/ClueCollection';
import { parseDateFromURL } from './lib/utils';
import { MockCruziApi } from './api/MockCruziApi';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout component (combines Header and Outlet for content)
function Layout() {
  const { user, login, logout } = useAuth();
  
  return (
    <div>
      <Header onLogin={login} onLogout={logout} />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
}

// Component that uses auth context
function AppContent() {
  const { user } = useAuth();
  const [clueCollection, setClueCollection] = useState(null as ClueCollection | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null as any);
  let api = new MockCruziApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getCollectionList();
        setClueCollection(response[0])
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  let paramDate = useParams().date ? parseDateFromURL(useParams().date!) : new Date();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/collections" element={<CollectionList />} />
        <Route path="/collection/:id" element={<Collection collection={clueCollection!} onBack={() => window.history.back()} onStartQuiz={(id) => window.location.href = `/quiz/${id}`} />} />
        <Route path="/quiz/:id" element={<CollectionQuiz clueCollection={clueCollection!} />} />
        <Route path="*" element={<CollectionList />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
