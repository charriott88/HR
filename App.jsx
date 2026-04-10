import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Home from './pages/Home';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import AlignmentSetup from './pages/AlignmentSetup';
import ProjectHome from './pages/ProjectHome';
import SessionLogEntry from './pages/SessionLogEntry';
import SessionFeed from './pages/SessionFeed';
import ThreadsView from './pages/ThreadsView';
import TimelineView from './pages/TimelineView';
import CollaboratorsView from './pages/CollaboratorsView';
import OutputsView from './pages/OutputsView';
import TreatmentView from './pages/TreatmentView';
import ShotListView from './pages/ShotListView';
import ShootMode from './pages/ShootMode';
import Prompts from './pages/Prompts';
import NewPrompt from './pages/NewPrompt';
import PromptDetail from './pages/PromptDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:projectId" element={<ProjectHome />} />
        <Route path="/projects/:projectId/alignment" element={<AlignmentSetup />} />
        <Route path="/projects/:projectId/log" element={<SessionLogEntry />} />
        <Route path="/projects/:projectId/feed" element={<SessionFeed />} />
        <Route path="/projects/:projectId/threads" element={<ThreadsView />} />
        <Route path="/projects/:projectId/timeline" element={<TimelineView />} />
        <Route path="/projects/:projectId/collaborators" element={<CollaboratorsView />} />
        <Route path="/projects/:projectId/outputs" element={<OutputsView />} />
        <Route path="/projects/:projectId/treatment" element={<TreatmentView />} />
        <Route path="/projects/:projectId/shots" element={<ShotListView />} />
        <Route path="/projects/:projectId/shoot" element={<ShootMode />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/prompts/new" element={<NewPrompt />} />
        <Route path="/prompts/:promptId" element={<PromptDetail />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App