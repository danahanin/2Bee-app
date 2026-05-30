import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import PairingScreen from './pages/PairingScreen.jsx'
import MainPage from './pages/MainPage.jsx'
import HiveScreen from './pages/HiveScreen.jsx'
import OnboardingWizard from './pages/OnboardingWizard.jsx'
import PersonalDashboard from './pages/PersonalDashboard.jsx'
import SharedDashboard from './pages/SharedDashboard.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
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
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute pairingMode="unpaired">
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/pairing"
        element={
          <ProtectedRoute pairingMode="unpaired">
            <PairingScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute pairingMode="paired">
            <MainPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/hive"
        element={
          <ProtectedRoute pairingMode="paired">
            <HiveScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/dashboard/personal"
        element={
          <ProtectedRoute pairingMode="paired">
            <PersonalDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/profile"
        element={
          <ProtectedRoute pairingMode="paired">
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/dashboard/shared"
        element={
          <ProtectedRoute pairingMode="paired">
            <SharedDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute pairingMode="paired">
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/insights"
        element={
          <ProtectedRoute pairingMode="paired">
            <InsightsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
