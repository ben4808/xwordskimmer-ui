import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/Header/Header';
import CollectionQuiz from './components/CollectionQuiz/CollectionQuiz';
import CollectionList from './components/CollectionList/CollectionList';
import CrosswordList from './components/CrosswordList/CrosswordList';
import Collection from './components/Collection/Collection';
import CrosswordSolver from './components/CrosswordSolver/CrosswordSolver';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CollectionProvider } from './contexts/CollectionContext';

function isListPagePath(pathname: string): boolean {
  return pathname === '/collections' || pathname === '/crosswords';
}

function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const showHeader = isListPagePath(location.pathname);

  return (
    <div>
      {showHeader && <Header onLogout={logout} />}
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CollectionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/crosswords" replace />} />
              <Route path="/crosswords" element={<CrosswordList />} />
              <Route path="/collections" element={<CollectionList />} />
              <Route path="/collection/:id" element={<Collection />} />
              <Route path="/quiz/:id" element={<CollectionQuiz />} />
              <Route path="/crossword/:publicationOrId" element={<CrosswordSolver />} />
              <Route path="*" element={<Navigate to="/crosswords" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CollectionProvider>
    </AuthProvider>
  );
}

export default App;
