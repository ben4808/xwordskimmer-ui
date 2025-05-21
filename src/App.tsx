import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import './App.css'
import CrosswordList from './components/CrosswordList/CrosswordList'
import Header from './components/Header/Header'
import Solver from './components/Solver/Solver';

// Layout component (combines Header and Outlet for content)
function Layout() {
  const location = useLocation();
  return (
    <div>
      <Header isInSolver={location.pathname.includes("crossword") || location.pathname.includes("clue")} />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/list/:date" element={<CrosswordList date={undefined} />} />
          <Route path="/crossword/:source/:date" element={<Solver />} />
          <Route path="/clue/:id" element={<Solver />} />
          <Route path="*" element={<CrosswordList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
