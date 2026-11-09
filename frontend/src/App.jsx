import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScanControl from './pages/ScanControl';
import VulnRegistry from './pages/VulnRegistry';
import AttackLineage from './pages/AttackLineage';
import DefenseMonitor from './pages/DefenseMonitor';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="scan" element={<ScanControl />} />
            <Route path="vulnerabilities" element={<VulnRegistry />} />
            <Route path="lineage" element={<AttackLineage />} />
            <Route path="defense" element={<DefenseMonitor />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
