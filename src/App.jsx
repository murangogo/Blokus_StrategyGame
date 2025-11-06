// 路径：src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Room from './pages/Room';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import { getToken } from './utils/auth';

// 路由守卫组件
function PrivateRoute({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/home" 
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/room/:roomId" 
          element={
            <PrivateRoute>
              <Room />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/history/:id" 
          element={
            <PrivateRoute>
              <HistoryDetail />
            </PrivateRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;