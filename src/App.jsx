import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Archives from './components/Archives';
import Demandes from './components/Demandes';
import DossierRH from './components/DossierRH';
import FichePaie from './components/FichePaie';

// Composant de protection de route
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        
        <Route path="/employees" element={
          <PrivateRoute>
            <Employees />
          </PrivateRoute>
        } />
        
        <Route path="/archives" element={
          <PrivateRoute>
            <Archives />
          </PrivateRoute>
        } />
        
        <Route path="/demandes" element={
          <PrivateRoute>
            <Demandes />
          </PrivateRoute>
        } />
        
        <Route path="/dossier-rh" element={
          <PrivateRoute>
            <DossierRH />
          </PrivateRoute>
        } />
        
        <Route path="/fiche-paie" element={
          <PrivateRoute>
            <FichePaie />
          </PrivateRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
