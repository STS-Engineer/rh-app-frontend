import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Archives from './pages/Archives';
import Statistics from './pages/Statistics';
import DemandesRH from './pages/DemandesRH'; // Nouvelle importation
import './styles/App.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Route publique - Login */}
          <Route path="/" element={<Login />} />
          
          {/* Routes privées */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/fiche-de-paie" 
            element={
              <PrivateRoute>
                <FicheDePaie />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/team" 
            element={
              <PrivateRoute>
                <Team />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/demandes-rh"  // Nouvelle route pour les demandes RH
            element={
              <PrivateRoute>
                <DemandesRH />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/archives" 
            element={
              <PrivateRoute>
                <Archives />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/statistics" 
            element={
              <PrivateRoute>
                <Statistics />
              </PrivateRoute>
            } 
          />
          
          {/* Route de fallback - Redirection vers le dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
