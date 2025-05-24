import { BrowserRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import './App.css'
import CrosswordList from './components/CrosswordList/CrosswordList'
import Header from './components/Header/Header'
import Solver from './components/Solver/Solver';
import { getCrossword } from './api/mockApi';
import { useEffect, useState } from 'react';
import { ClueCollection } from './models/ClueCollection';
import { parseDateFromURL } from './lib/utils';

// Layout component (combines Header and Outlet for content)
function Layout() {
  const location = useLocation();
  return (
    <div>
      <Header showDashboardButton={location.pathname.includes("crossword") || location.pathname.includes("clue")} />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
}

function App() {
  const [clueCollection, setClueCollection] = useState(null as ClueCollection | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null as any);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getCrossword("NYT", new Date(2025, 5, 5));
        setClueCollection(response)
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  let paramDate = useParams().date ? parseDateFromURL(useParams().date!) : new Date(2025, 5, 5);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/list/:date" element={<CrosswordList date={paramDate} />} />
          <Route path="/crossword/:source/:date" element={<Solver clueCollection={clueCollection!} />} />
          <Route path="/clue/:id" element={<Solver clueCollection={clueCollection!} />} />
          <Route path="*" element={<CrosswordList date={paramDate} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
