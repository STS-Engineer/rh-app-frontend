import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import './styles/App.css';
import Archives from './pages/Archives'; // Import ajouté
import Statistics from './pages/Statistics';
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
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
            path="/team" 
            element={
              <PrivateRoute>
                <Team />
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
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;