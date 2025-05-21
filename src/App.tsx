import { BrowserRouter } from 'react-router';
import './App.css'
import CrosswordList from './components/CrosswordList/CrosswordList'
import Header from './components/Header/Header'

function App() {
  return (
    <BrowserRouter>
      <Header isInSolver={false}></Header>
      <CrosswordList date={new Date()}></CrosswordList>
    </BrowserRouter>
  );
};

export default App;
