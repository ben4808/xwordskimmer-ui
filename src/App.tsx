import { BrowserRouter, Outlet, Route, Routes, useParams, useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import Header from './components/Header/Header'
import CollectionQuiz from './components/CollectionQuiz/CollectionQuiz';
import CollectionList from './components/CollectionList/CollectionList';
import Collection from './components/Collection/Collection';
import { useEffect, useState } from 'react';
import { ClueCollection } from './models/ClueCollection';
import { parseDateFromURL } from './lib/utils';
import CruziApi from './api/CruziApi';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CollectionProvider, useCollection } from './contexts/CollectionContext';

// Component to handle collection route with dynamic collection loading
function CollectionRoute({ collections, loading }: { collections: ClueCollection[], loading: boolean }) {
  const { id } = useParams();
  
  if (loading) {
    return <div>Loading collection...</div>;
  }
  
  const collection = collections.find(c => c.id === id);
  
  if (!collection) {
    return <div>Collection not found</div>;
  }
  
  return (
    <Collection 
      collection={collection} 
      onBack={() => window.history.back()} 
      onStartQuiz={(id) => window.location.href = `/quiz/${id}`} 
    />
  );
}

// Component to handle quiz route with dynamic collection loading
function QuizRoute({ collections, loading }: { collections: ClueCollection[], loading: boolean }) {
  const { id } = useParams();
  
  if (loading) {
    return <div>Loading collection...</div>;
  }
  
  const collection = collections.find(c => c.id === id);
  
  if (!collection) {
    return <div>Collection not found</div>;
  }
  
  return <CollectionQuiz clueCollection={collection} />;
}

// Layout component (combines Header and Outlet for content)
function Layout() {
  const { user, login, logout } = useAuth();
  const { currentCollection } = useCollection();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine header type based on current route
  const getHeaderType = () => {
    if (location.pathname.startsWith('/quiz/')) {
      return 'quiz';
    } else if (location.pathname.startsWith('/collection/')) {
      return 'collection';
    }
    return 'main';
  };
  
  // Get collection name for collection/quiz headers
  const getCollectionName = () => {
    return currentCollection?.title || 'Collection';
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (location.pathname.startsWith('/quiz/')) {
      // Go back to collection page
      const collectionId = location.pathname.split('/')[2];
      navigate(`/collection/${collectionId}`);
    } else if (location.pathname.startsWith('/collection/')) {
      // Go back to collections list
      navigate('/collections');
    }
  };
  
  return (
    <div>
      <Header 
        onLogin={login} 
        onLogout={logout}
        headerType={getHeaderType()}
        collectionName={getCollectionName()}
        onBack={handleBack}
      />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
}

// Component that uses auth context
function AppContent() {
  const { user } = useAuth();
  const [collections, setCollections] = useState([] as ClueCollection[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null as any);
  let api = CruziApi;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getCollectionList();
        setCollections(response);
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
        <Route path="/collection/:id" element={<CollectionRoute collections={collections} loading={loading} />} />
        <Route path="/quiz/:id" element={<QuizRoute collections={collections} loading={loading} />} />
        <Route path="*" element={<CollectionList />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CollectionProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CollectionProvider>
    </AuthProvider>
  );
};

export default App;
