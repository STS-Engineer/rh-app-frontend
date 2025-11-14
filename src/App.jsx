import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Archives from './pages/Archives';
import Statistics from './pages/Statistics';
import DemandesRH from './pages/DemandesRH';
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
          {/* Route publique */}
          <Route path="/" element={<Login />} />
          
          {/* Routes protégées */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
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
            path="/demandes" 
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
          
          {/* Route par défaut - redirige vers dashboard si connecté */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
