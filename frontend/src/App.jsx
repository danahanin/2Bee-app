import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import PairingScreen from './pages/PairingScreen.jsx'
import OnboardingWizard from './pages/OnboardingWizard.jsx'
import AppShell from './layouts/AppShell.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import HiveScreen from './pages/HiveScreen.jsx'
import PersonalExpensesPage from './pages/PersonalExpensesPage.jsx'
import AssistantPage from './pages/AssistantPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ReceiptScanPage from './pages/ReceiptScanPage.jsx'
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
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="hive" element={<HiveScreen />} />
        <Route path="expenses" element={<PersonalExpensesPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="receipt-scan" element={<ReceiptScanPage />} />
      </Route>
      <Route path="/app/dashboard/personal" element={<Navigate to="/app/expenses" replace />} />
      <Route path="/app/analytics" element={<Navigate to="/app/expenses?tab=analytics" replace />} />
      <Route path="/app/insights" element={<Navigate to="/app/assistant" replace />} />
      <Route path="/app/settings" element={<Navigate to="/app/profile?section=settings" replace />} />
      <Route path="/app/dashboard/shared" element={<Navigate to="/app/hive?tab=overview" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
