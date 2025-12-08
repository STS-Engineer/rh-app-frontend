import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Archives from './pages/Archives';
import Statistics from './pages/Statistics';
import DemandesRH from './pages/DemandesRH'; 
import FicheDePaie from './pages/FicheDePaie';
import ChangePassword from './pages/ChangePassword'; // Nouveau composant
import './styles/App.css';

// Composant de protection de route
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

// Composant pour vérifier si le mot de passe est temporaire
const CheckPasswordStatus = ({ children }) => {
  const [isTemporary, setIsTemporary] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkPasswordStatus = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Décoder le token JWT pour vérifier si le mot de passe est temporaire
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsTemporary(payload.passwordIsTemporary === true);
        } catch (e) {
          console.error('Erreur décodage token:', e);
          setIsTemporary(false);
        }
      } else {
        setIsTemporary(false);
      }
      setLoading(false);
    };

    checkPasswordStatus();
  }, [location.pathname]); // Re-vérifier quand la route change

  // Si on est en train de charger, afficher un loader
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Vérification de sécurité...</p>
      </div>
    );
  }

  // Si le mot de passe est temporaire ET qu'on n'est pas déjà sur la page de changement
  // Rediriger vers la page de changement de mot de passe
  if (isTemporary && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" state={{ from: location.pathname }} />;
  }

  return children;
};

// Composant pour les routes qui nécessitent un mot de passe non temporaire
const SecureRoute = ({ children }) => {
  return (
    <PrivateRoute>
      <CheckPasswordStatus>
        {children}
      </CheckPasswordStatus>
    </PrivateRoute>
  );
};

// Composant pour rediriger les utilisateurs déjà connectés
const RedirectIfAuthenticated = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.passwordIsTemporary) {
        return <Navigate to="/change-password" />;
      }
      return <Navigate to="/dashboard" />;
    } catch (e) {
      console.error('Erreur décodage token:', e);
      return children;
    }
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Route publique - Login avec redirection si déjà connecté */}
          <Route 
            path="/" 
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            } 
          />
          
          {/* Route pour changer le mot de passe (accessible seulement si connecté) */}
          <Route 
            path="/change-password" 
            element={
              <PrivateRoute>
                <ChangePassword />
              </PrivateRoute>
            } 
          />
          
          {/* Routes sécurisées (nécessitent un mot de passe non temporaire) */}
          <Route 
            path="/dashboard" 
            element={
              <SecureRoute>
                <Dashboard />
              </SecureRoute>
            } 
          />
          
          <Route 
            path="/team" 
            element={
              <SecureRoute>
                <Team />
              </SecureRoute>
            } 
          />
          
          <Route 
            path="/demandes-rh" 
            element={
              <SecureRoute>
                <DemandesRH />
              </SecureRoute>
            } 
          />
          
          <Route 
            path="/archives" 
            element={
              <SecureRoute>
                <Archives />
              </SecureRoute>
            } 
          />
          
          <Route 
            path="/statistics" 
            element={
              <SecureRoute>
                <Statistics />
              </SecureRoute>
            } 
          />
          
          <Route 
            path="/fiche-de-paie" 
            element={
              <SecureRoute>
                <FicheDePaie />
              </SecureRoute>
            } 
          />
          
          {/* Route de fallback */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
