import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PipelinePage } from '@/pages/crm/PipelinePage'
import { FollowupsPage } from '@/pages/crm/FollowupsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/crm/pipeline" element={<PipelinePage />} />
          <Route path="/crm/contacts/new" element={<PipelinePage />} />
          <Route path="/crm/contacts/:id" element={<PipelinePage />} />
          <Route path="/crm/contacts/:id/edit" element={<PipelinePage />} />
          <Route path="/crm/followups" element={<FollowupsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
