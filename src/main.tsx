import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomePage } from './pages/HomePage'
import { NewMeasurementPage } from './pages/NewMeasurementPage'
import { HistoryPage } from './pages/HistoryPage'
import { MeasurementDetailPage } from './pages/MeasurementDetailPage'
import { StatsPage } from './pages/StatsPage'
import './index.css'

// Strip trailing slash from BASE_URL for React Router compatibility
const rawBase = (import.meta as any).env.BASE_URL as string
const BASE = rawBase.endsWith('/') && rawBase.length > 1
  ? rawBase.slice(0, -1)
  : rawBase

// Apply dark class before first render to prevent flash
if (!document.documentElement.classList.contains('dark')) {
  const stored = localStorage.getItem('theme')
  const prefersDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  if (prefersDark) {
    document.documentElement.classList.add('dark')
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={BASE}>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/novo"          element={<NewMeasurementPage />} />
          <Route path="/historija"     element={<HistoryPage />} />
          <Route path="/statistike"    element={<StatsPage />} />
          <Route path="/mjerenje/:id"  element={<MeasurementDetailPage />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
