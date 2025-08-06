import { BrowserRouter, Outlet, Route, Routes, useParams } from 'react-router-dom';
import './App.css'
import CrosswordList from './components/CrosswordList/CrosswordList'
import Header from './components/Header/Header'
import Solver from './components/Solver/Solver';
import { useEffect, useState } from 'react';
import { ClueCollection } from './models/ClueCollection';
import { parseDateFromURL } from './lib/utils';
import { MockCruziApi } from './api/MockCruziApi';

// Layout component (combines Header and Outlet for content)
function Layout() {
  return (
    <div>
      <Header />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
}

function App() {
  const [clueCollection, setClueCollection] = useState(null as ClueCollection | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null as any);
  let api = new MockCruziApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getCrossword("Lists", new Date());
        setClueCollection(response)
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
