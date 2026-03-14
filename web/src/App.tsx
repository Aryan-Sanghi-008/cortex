import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';

// Pages
import LandingPage from './pages/LandingPage';
import OrchestratorDashboard from './pages/OrchestratorDashboard';
import BotArchitectureDetail from './pages/BotArchitectureDetail';
import FinalProjectOutput from './pages/FinalProjectOutput';

function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/orchestrator" element={<OrchestratorDashboard />} />
          <Route path="/bot-architecture" element={<BotArchitectureDetail />} />
          <Route path="/output" element={<FinalProjectOutput />} />
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
