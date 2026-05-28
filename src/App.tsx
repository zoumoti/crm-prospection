import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Spinner } from '@/components/ui/Spinner'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ActiveClientsPage } from '@/pages/clients/ActiveClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { InvoicesPage } from '@/pages/clients/InvoicesPage'
import { ContractsPage } from '@/pages/clients/ContractsPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { PipelinePage } from '@/pages/crm/PipelinePage'
import { FollowupsPage } from '@/pages/crm/FollowupsPage'
import { RevenuePage } from '@/pages/finance/RevenuePage'
import { CotisationsPage } from '@/pages/finance/CotisationsPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const InvoiceCreatePage = lazy(() => import('@/pages/clients/InvoiceCreatePage'))
const InvoiceDetailPage = lazy(() => import('@/pages/clients/InvoiceDetailPage'))
const InvoiceEditPage = lazy(() => import('@/pages/clients/InvoiceEditPage'))

function FullScreenSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" className="text-accent" />
    </div>
  )
}

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
          <Route path="/clients" element={<ActiveClientsPage />} />
          <Route path="/clients/new" element={<ActiveClientsPage />} />
          <Route path="/clients/:id/edit" element={<ActiveClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductsPage />} />
          <Route path="/products/:id/edit" element={<ProductsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route
            path="/invoices/new"
            element={
              <Suspense fallback={<FullScreenSpinner />}>
                <InvoiceCreatePage />
              </Suspense>
            }
          />
          <Route
            path="/invoices/:id/edit"
            element={
              <Suspense fallback={<FullScreenSpinner />}>
                <InvoiceEditPage />
              </Suspense>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <Suspense fallback={<FullScreenSpinner />}>
                <InvoiceDetailPage />
              </Suspense>
            }
          />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/new" element={<ContractsPage />} />
          <Route path="/contracts/:id/edit" element={<ContractsPage />} />
          <Route path="/crm/pipeline" element={<PipelinePage />} />
          <Route path="/crm/contacts/new" element={<PipelinePage />} />
          <Route path="/crm/contacts/:id" element={<PipelinePage />} />
          <Route path="/crm/contacts/:id/edit" element={<PipelinePage />} />
          <Route path="/crm/followups" element={<FollowupsPage />} />
          <Route path="/finance/revenue" element={<RevenuePage />} />
          <Route path="/finance/revenue/expense/new" element={<RevenuePage />} />
          <Route path="/finance/revenue/expense/:id/edit" element={<RevenuePage />} />
          <Route path="/finance/cotisations" element={<CotisationsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/new" element={<TasksPage />} />
          <Route path="/tasks/:id/edit" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
