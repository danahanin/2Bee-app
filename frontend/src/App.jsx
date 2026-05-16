import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import MainPage from './pages/MainPage.jsx'
import HiveScreen from './pages/HiveScreen.jsx'
import OnboardingWizard from './pages/OnboardingWizard.jsx'
import PersonalDashboard from './pages/PersonalDashboard.jsx'
import SharedDashboard from './pages/SharedDashboard.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import PublicRoute from './routes/PublicRoute.jsx'
import OnboardingGate from './routes/OnboardingGate.jsx'

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
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingGate allowIncomplete>
              <OnboardingWizard />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <MainPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/hive"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <HiveScreen />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
       path="/app/dashboard/personal"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <PersonalDashboard />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/profile"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ProfilePage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/dashboard/shared"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <SharedDashboard />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <SettingsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
