import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { NewMeasurementPage } from './pages/NewMeasurementPage'
import { HistoryPage } from './pages/HistoryPage'
import { MeasurementDetailPage } from './pages/MeasurementDetailPage'
import { StatsPage } from './pages/StatsPage'
import './index.css'

const BASE = (import.meta as any).env.BASE_URL

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/"              element={<HomePage />} />
        <Route path="/novo"          element={<NewMeasurementPage />} />
        <Route path="/historija"     element={<HistoryPage />} />
        <Route path="/statistike"    element={<StatsPage />} />
        <Route path="/mjerenje/:id"  element={<MeasurementDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
