import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import ProductHub from './components/ProductHub';
import DiscoveryPage from './pages/DiscoveryPage';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={
            <MainLayout>
              <ProductHub />
            </MainLayout>
          } />
          <Route path="/discover" element={
            <MainLayout>
              <DiscoveryPage />
            </MainLayout>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;