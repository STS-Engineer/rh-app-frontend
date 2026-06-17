import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Archives from './pages/Archives';
import Statistics from './pages/Statistics';
import DemandesRH from './pages/DemandesRH'; 
import FicheDePaie from './pages/FicheDePaie';
import EtatDesLieux from './pages/EtatDesLieux'; 
import Settings from './pages/Settings';
import Visa from './pages/Visa';
import FranceOnboarding from './pages/FranceOnboarding';
import FranceCareerDevelopment from './pages/FranceCareerDevelopment';
import FranceOffboarding from './pages/FranceOffboarding';
import { getCurrentUser } from './services/api';
import './styles/App.css';

import Organigramme from './pages/Organigramme';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

const isTunisiaTenantUser = (user) => {
  const tenantText = [
    user?.country,
    user?.plant,
    user?.tenant_schema,
    user?.tenant_id
  ].filter(Boolean).join(' ').toLowerCase();

  return (
    tenantText.includes('tunisia') ||
    tenantText.includes('public') ||
    tenantText.includes('sts') ||
    tenantText.includes('sceet') ||
    tenantText.includes('same service') ||
    tenantText.includes('same-service')
  );
};

const TunisiaOnlyRoute = ({ children }) => {
  const user = getCurrentUser();
  return isTunisiaTenantUser(user) ? children : <Navigate to="/dashboard" replace />;
};

const NonTunisiaOnlyRoute = ({ children }) => {
  const user = getCurrentUser();
  return !isTunisiaTenantUser(user) ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <LanguageProvider>
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
                path="/organigramme" 
                element={
                  <PrivateRoute>
                    <Organigramme />
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
                path="/etat-des-lieux" 
                element={
                  <PrivateRoute>
                    <EtatDesLieux />
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
                    <TunisiaOnlyRoute>
                      <Visa />
                    </TunisiaOnlyRoute>
                  </PrivateRoute>
                } 
              />
              <Route
                path="/onboarding"
                element={
                  <PrivateRoute>
                    <NonTunisiaOnlyRoute>
                      <FranceOnboarding />
                    </NonTunisiaOnlyRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/career-development"
                element={
                  <PrivateRoute>
                    <NonTunisiaOnlyRoute>
                      <FranceCareerDevelopment />
                    </NonTunisiaOnlyRoute>
                  </PrivateRoute>
                }
              />
              <Route
                path="/offboarding"
                element={
                  <PrivateRoute>
                    <NonTunisiaOnlyRoute>
                      <FranceOffboarding />
                    </NonTunisiaOnlyRoute>
                  </PrivateRoute>
                }
              />
              <Route path="/france-onboarding" element={<Navigate to="/onboarding" replace />} />
              <Route path="/france-career-development" element={<Navigate to="/career-development" replace />} />
              <Route path="/france-offboarding" element={<Navigate to="/offboarding" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
