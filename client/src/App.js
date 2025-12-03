import { SpeedInsights } from "@vercel/speed-insights/react"
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster as SonnerToaster } from './components/ui/shadcn';
import { HelmetProvider, Helmet } from 'react-helmet-async';

// Components
import ScrollToTop from './components/common/ScrollToTop';
import ProtectedRoute from './components/common/ProtectedRoute';
import ChatWidget from './components/common/ChatWidget';
import ContactButtons from './components/common/ContactButtons';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

// Import frequently used pages directly for faster navigation
import Home from './pages/Home';
import Properties from './pages/Properties';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import LeadForm from './pages/LeadForm';
import Legal from './pages/Legal';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/DashboardDemo';

// Lazily load less frequently used pages with preloading
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Developers = lazy(() => import('./pages/Developers'));
const DeveloperDetail = lazy(() => import('./pages/DeveloperDetail'));
const Launches = lazy(() => import('./pages/Launches'));
const LaunchDetail = lazy(() => import('./pages/LaunchDetail'));
const Compounds = lazy(() => import('./pages/Compounds'));
const CompoundDetail = lazy(() => import('./pages/CompoundDetail'));
const Careers = lazy(() => import('./pages/Careers'));
const AdminProperties = lazy(() => import('./pages/admin/AdminProperties'));
const PendingProperties = lazy(() => import('./pages/admin/PendingProperties'));
const AdminDevelopers = lazy(() => import('./pages/admin/AdminDevelopers'));
const AdminCompounds = lazy(() => import('./pages/admin/AdminCompounds'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AddJob = lazy(() => import('./pages/admin/AddJob'));
const EditJob = lazy(() => import('./pages/admin/EditJob'));
const AdminJobApplications = lazy(() => import('./pages/admin/AdminJobApplications'));
const AdminCities = lazy(() => import('./pages/admin/AdminCities'));
const AdminGovernorates = lazy(() => import('./pages/admin/AdminGovernorates'));
const AdminAreas = lazy(() => import('./pages/admin/AdminAreas'));
const AdminInquiries = lazy(() => import('./pages/admin/AdminInquiries'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'));
const AdminNewsletterSubscriptions = lazy(() => import('./pages/admin/AdminNewsletterSubscriptions'));
const AdminVideos = lazy(() => import('./pages/admin/AdminVideos'));
const AddVideo = lazy(() => import('./pages/admin/AddVideo'));
const EditVideo = lazy(() => import('./pages/admin/EditVideo'));
const ViewLead = lazy(() => import('./pages/admin/ViewLead'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const Videos = lazy(() => import('./pages/Videos'));
const VideoDetail = lazy(() => import('./pages/VideoDetail'));
const VideoPlaylist = lazy(() => import('./pages/VideoPlaylist'));
const AdminLaunches = lazy(() => import('./pages/admin/AdminLaunches'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const AddBlog = lazy(() => import('./pages/admin/AddBlog'));
const EditBlog = lazy(() => import('./pages/admin/EditBlog'));
const Settings = lazy(() => import('./pages/admin/Settings'));

// Preload critical components on hover
const _preloadComponent = (component) => {
  if (typeof component === 'function' && component._payload) {
    component._payload._result = component._payload._result || component();
  }
};
const AddProperty = lazy(() => import('./pages/admin/AddProperty'));
const EditProperty = lazy(() => import('./pages/admin/EditProperty'));
const AddDeveloper = lazy(() => import('./pages/admin/AddDeveloper'));
const EditDeveloper = lazy(() => import('./pages/admin/EditDeveloper'));
const AddCompound = lazy(() => import('./pages/admin/AddCompound'));
const EditCompound = lazy(() => import('./pages/admin/EditCompound'));
const AddCity = lazy(() => import('./pages/admin/AddCity'));
const EditCity = lazy(() => import('./pages/admin/EditCity'));
const AddGovernorate = lazy(() => import('./pages/admin/AddGovernorate'));
const EditGovernorate = lazy(() => import('./pages/admin/EditGovernorate'));
const AddArea = lazy(() => import('./pages/admin/AddArea'));
const EditArea = lazy(() => import('./pages/admin/EditArea'));
const AddUser = lazy(() => import('./pages/admin/AddUser'));
const EditUser = lazy(() => import('./pages/admin/EditUser'));
const AddLaunch = lazy(() => import('./pages/admin/AddLaunch'));
const EditLaunch = lazy(() => import('./pages/admin/EditLaunch'));
const ViewLaunch = lazy(() => import('./pages/admin/ViewLaunch'));
const EditInquiry = lazy(() => import('./pages/admin/EditInquiry'));
const ViewInquiry = lazy(() => import('./pages/admin/ViewInquiry'));
const ViewUser = lazy(() => import('./pages/admin/ViewUser'));
const ViewProperty = lazy(() => import('./pages/admin/ViewProperty'));
const Profile = lazy(() => import('./pages/user/Profile'));
const SubmitProperty = lazy(() => import('./pages/user/SubmitProperty'));
const MySubmissions = lazy(() => import('./pages/user/MySubmissions'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ROICalculator = lazy(() => import('./pages/ROICalculator'));

// Conditional Navbar Component - Currently commented out
// const ConditionalNavbar = () => {
//   const location = useLocation();
//   const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
//   
//   if (isAdminRoute) {
//     return null; // Don't render navbar for admin routes
//   }
//   
//   return (
//     <>
//       <WebsiteNavbar />
//     </>
//   );
// };

// Conditional Chat Widget Component - Show only on public pages
const ConditionalChatWidget = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Don't show chat widget on admin routes or login pages
  if (isAdminRoute || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }
  
  return <ChatWidget />;
};

// Conditional Contact Buttons Component - Show only on public pages
const ConditionalContactButtons = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Don't show contact buttons on admin routes or login pages
  if (isAdminRoute || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }
  
  return <ContactButtons />;
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Navigation Loading Component - Disabled
const NavigationLoader = () => {
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        
        {/* Default SEO Meta Tags */}
        <meta property="og:site_name" content="Basera Real Estate" />
        <meta property="og:image" content="https://www.basera-consultancy.com/logos/basiralogo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="ar_EG" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@BaseraRealEstate" />
        <meta name="twitter:image" content="https://www.basera-consultancy.com/logos/basiralogo.png" />
        
        {/* Google Search Console Verification - Add your verification code */}
        {process.env.REACT_APP_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.REACT_APP_GOOGLE_SITE_VERIFICATION} />
        )}
        
        <style>{`
          html {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          body {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          input, textarea, select {
            font-size: 16px !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          button, .btn {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }
        `}</style>
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChatProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <div className="min-h-screen bg-gray-50">
                <ScrollToTop />
                <NavigationLoader />
                
                <main className="min-h-screen">
                  {/* <ConditionalNavbar /> */}
                <Suspense
                  fallback={null}
                >
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/properties" element={<Properties />} />
                    <Route path="/properties/:id" element={<PropertyDetail />} />
                    <Route path="/developers" element={<Developers />} />
                    <Route path="/developers/:slug" element={<DeveloperDetail />} />
                    <Route path="/launches" element={<Launches />} />
                    <Route path="/launches/:id" element={<LaunchDetail />} />
                    <Route path="/compounds" element={<Compounds />} />
                    <Route path="/compounds/:id" element={<CompoundDetail />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogDetail />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/lead-form" element={<LeadForm />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/roi-calculator" element={<ROICalculator />} />
                    <Route path="/videos" element={<Videos />} />
                    <Route path="/videos/:id" element={<VideoDetail />} />
                    <Route path="/videos/playlist/:id" element={<VideoPlaylist />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* User Routes */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/submit-property" element={<ProtectedRoute><SubmitProperty /></ProtectedRoute>} />
                    <Route path="/my-submissions" element={<ProtectedRoute><MySubmissions /></ProtectedRoute>} />
                    
                    {/* Admin Login - Must come before /admin route */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    
                    {/* Admin Routes - Only accessible by admin users */}
                    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
                    <Route path="/admin/properties" element={<ProtectedRoute requiredRole="admin"><AdminProperties /></ProtectedRoute>} />
                    <Route path="/admin/pending-properties" element={<ProtectedRoute requiredRole="admin"><PendingProperties /></ProtectedRoute>} />
                    <Route path="/admin/properties/new" element={<ProtectedRoute requiredRole="admin"><AddProperty /></ProtectedRoute>} />
                    <Route path="/admin/properties/:id" element={<ProtectedRoute requiredRole="admin"><ViewProperty /></ProtectedRoute>} />
                    <Route path="/admin/properties/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditProperty /></ProtectedRoute>} />
                    <Route path="/admin/developers" element={<ProtectedRoute requiredRole="admin"><AdminDevelopers /></ProtectedRoute>} />
                    <Route path="/admin/developers/new" element={<ProtectedRoute requiredRole="admin"><AddDeveloper /></ProtectedRoute>} />
                    <Route path="/admin/developers/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditDeveloper /></ProtectedRoute>} />
                    <Route path="/admin/compounds" element={<ProtectedRoute requiredRole="admin"><AdminCompounds /></ProtectedRoute>} />
                    <Route path="/admin/compounds/new" element={<ProtectedRoute requiredRole="admin"><AddCompound /></ProtectedRoute>} />
                    <Route path="/admin/compounds/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditCompound /></ProtectedRoute>} />
                    <Route path="/admin/governorates" element={<ProtectedRoute requiredRole="admin"><AdminGovernorates /></ProtectedRoute>} />
                    <Route path="/admin/governorates/new" element={<ProtectedRoute requiredRole="admin"><AddGovernorate /></ProtectedRoute>} />
                    <Route path="/admin/governorates/edit/:id" element={<ProtectedRoute requiredRole="admin"><EditGovernorate /></ProtectedRoute>} />
                    <Route path="/admin/cities" element={<ProtectedRoute requiredRole="admin"><AdminCities /></ProtectedRoute>} />
                    <Route path="/admin/cities/new" element={<ProtectedRoute requiredRole="admin"><AddCity /></ProtectedRoute>} />
                    <Route path="/admin/cities/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditCity /></ProtectedRoute>} />
                    <Route path="/admin/areas" element={<ProtectedRoute requiredRole="admin"><AdminAreas /></ProtectedRoute>} />
                    <Route path="/admin/areas/new" element={<ProtectedRoute requiredRole="admin"><AddArea /></ProtectedRoute>} />
                    <Route path="/admin/areas/edit/:id" element={<ProtectedRoute requiredRole="admin"><EditArea /></ProtectedRoute>} />
                    <Route path="/admin/inquiries" element={<ProtectedRoute requiredRole="admin"><AdminInquiries /></ProtectedRoute>} />
                    <Route path="/admin/inquiries/:id" element={<ProtectedRoute requiredRole="admin"><ViewInquiry /></ProtectedRoute>} />
                    <Route path="/admin/inquiries/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditInquiry /></ProtectedRoute>} />
                    <Route path="/admin/leads" element={<ProtectedRoute requiredRole="admin"><AdminLeads /></ProtectedRoute>} />
                    <Route path="/admin/leads/:id" element={<ProtectedRoute requiredRole="admin"><ViewLead /></ProtectedRoute>} />
                    <Route path="/admin/newsletter-subscriptions" element={<ProtectedRoute requiredRole="admin"><AdminNewsletterSubscriptions /></ProtectedRoute>} />
                    <Route path="/admin/videos" element={<ProtectedRoute requiredRole="admin"><AdminVideos /></ProtectedRoute>} />
                    <Route path="/admin/videos/new" element={<ProtectedRoute requiredRole="admin"><AddVideo /></ProtectedRoute>} />
                    <Route path="/admin/videos/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditVideo /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
                    <Route path="/admin/users/:id" element={<ProtectedRoute requiredRole="admin"><ViewUser /></ProtectedRoute>} />
                    <Route path="/admin/users/new" element={<ProtectedRoute requiredRole="admin"><AddUser /></ProtectedRoute>} />
                    <Route path="/admin/users/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditUser /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
                    <Route path="/admin/launches" element={<ProtectedRoute requiredRole="admin"><AdminLaunches /></ProtectedRoute>} />
                    <Route path="/admin/launches/add" element={<ProtectedRoute requiredRole="admin"><AddLaunch /></ProtectedRoute>} />
                    <Route path="/admin/launches/:id" element={<ProtectedRoute requiredRole="admin"><ViewLaunch /></ProtectedRoute>} />
                    <Route path="/admin/launches/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditLaunch /></ProtectedRoute>} />
                    <Route path="/admin/blogs" element={<ProtectedRoute requiredRole="admin"><AdminBlogs /></ProtectedRoute>} />
                    <Route path="/admin/blogs/new" element={<ProtectedRoute requiredRole="admin"><AddBlog /></ProtectedRoute>} />
                    <Route path="/admin/blogs/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditBlog /></ProtectedRoute>} />
                    <Route path="/admin/jobs" element={<ProtectedRoute requiredRole="admin"><AdminJobs /></ProtectedRoute>} />
                    <Route path="/admin/jobs/new" element={<ProtectedRoute requiredRole="admin"><AddJob /></ProtectedRoute>} />
                    <Route path="/admin/jobs/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditJob /></ProtectedRoute>} />
                    <Route path="/admin/job-applications" element={<ProtectedRoute requiredRole="admin"><AdminJobApplications /></ProtectedRoute>} />
                    
                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              
             
              
              {/* Contact Buttons - Shows on public pages only */}
              <ConditionalContactButtons />
              
              {/* AI Chat Widget - Shows on public pages only */}
              <ConditionalChatWidget />
              
              {/* Sonner Toast Notifications */}
              <SonnerToaster position="top-right" richColors />

              {/* Vercel Speed Insights */}
              <SpeedInsights />
            </div>
          </Router>
          </ChatProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
