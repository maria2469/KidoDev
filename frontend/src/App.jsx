import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Levels from './pages/Levels';
import MagicStudio from './pages/MagicStudio/index';
import Auth from './pages/Auth/index';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ParentDashboard from './pages/Auth/ParentDashboard/ParentDashboard';
import SchoolDashboard from './pages/Auth/SchoolDashboard/SchoolDashboard';
import PaymentRegistration from './pages/PaymentRegistration';
import GamesHub from './pages/Games/GamesHub';
import AudioProvider from './pages/Games/AudioProvider';
// Info Pages
import AboutUs from './pages/Info/AboutUs';
import HowToUse from './pages/Info/HowToUse';
import Pricing from './pages/Info/Pricing';
import PrivacyPolicy from './pages/Info/PrivacyPolicy';
import PersonalizedPath from './pages/PersonalizedPath';


import { ThemeProvider } from './utils/ThemeContext';


function App() {
  return (
    <ThemeProvider>
      <Router>
      <ScrollToTop />
      <Routes>
        {/* Studio is full-screen – no Navbar/Footer – wrapped in ErrorBoundary */}
        <Route path="/studio/:lessonId" element={
          <ProtectedRoute>
            <ErrorBoundary>
              <MagicStudio />
            </ErrorBoundary>
          </ProtectedRoute>
        } />

        {/* Normal pages with Navbar + Footer */}
        <Route path="/*" element={
          <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <div className="main-content-wrapper" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/register" element={<PaymentRegistration />} />
                  <Route path="/about-us" element={<AboutUs />} />
                  <Route path="/how-to-use" element={<HowToUse />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                  <Route path="/levels" element={
                    <ProtectedRoute>
                      <AudioProvider>
                        <Levels />
                      </AudioProvider>
                    </ProtectedRoute>
                  } />
                  <Route path="/games" element={
                    <ProtectedRoute>
                      <AudioProvider>
                        <GamesHub />
                      </AudioProvider>
                    </ProtectedRoute>
                  } />
                  <Route path="/parent-dashboard" element={
                    <ProtectedRoute>
                      <ParentDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/school-dashboard" element={
                    <ProtectedRoute>
                      <SchoolDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/my-path" element={
                    <ProtectedRoute>
                      <PersonalizedPath />
                    </ProtectedRoute>
                  } />
                </Routes>
              </ErrorBoundary>
            </div>
            <Footer />
          </div>
        } />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
