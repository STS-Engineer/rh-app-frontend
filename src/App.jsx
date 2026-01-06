import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext'; // <-- Ajoutez cette importation
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Archives from './pages/Archives';
import Statistics from './pages/Statistics';
import DemandesRH from './pages/DemandesRH'; 
import FicheDePaie from './pages/FicheDePaie';
import Settings from './pages/Settings';
import Visa from './pages/Visa';
import './styles/App.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <LanguageProvider>
      <NotificationProvider> {/* <-- Ajoutez ce wrapper */}
        <Router>
          <div className="App">
            <div className="zoom-80">
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
                  path="/demandes-rh"
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
                <Route 
                  path="/settings" 
                  element={
                    <PrivateRoute>
                      <Settings />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/visa" 
                  element={
                    <PrivateRoute>
                      <Visa />
                    </PrivateRoute>
                  } 
                />
              </Routes>
            </div>
          </div>
        </Router>
      </NotificationProvider> {/* <-- Fermez le wrapper */}
    </LanguageProvider>
  );
}

export default App;
