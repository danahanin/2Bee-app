import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import MainPage from './pages/MainPage.jsx'
import HiveScreen from './pages/HiveScreen.jsx'
import PersonalDashboard from './pages/PersonalDashboard.jsx'
import SharedDashboard from './pages/SharedDashboard.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import PublicRoute from './routes/PublicRoute.jsx'

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/hive"
        element={
          <ProtectedRoute>
            <HiveScreen />
          </ProtectedRoute>
        }
      />
      <Route
       path="/app/dashboard/personal"
        element={
          <ProtectedRoute>
            <PersonalDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/dashboard/shared"
        element={
          <ProtectedRoute>
            <SharedDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
