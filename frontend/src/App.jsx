import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import TaskClassificationsPage from './pages/TaskClassificationsPage';
import ParametersPage from './pages/ParametersPage';

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <div className="nav-content">
          <NavLink to="/" className="nav-brand">Effort Estimator</NavLink>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Projects
            </NavLink>
            <NavLink to="/task-classifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Task Classifications
            </NavLink>
            <NavLink to="/parameters" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Parameters
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/task-classifications" element={<TaskClassificationsPage />} />
          <Route path="/parameters" element={<ParametersPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
