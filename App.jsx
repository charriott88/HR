import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
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

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
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
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
