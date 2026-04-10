import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, ArrowRight, Zap, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      setUser(me);
      const [projs, prpts, logs] = await Promise.all([
        base44.entities.Project.filter({ status: "active" }, "-created_date", 5),
        base44.entities.PromptCall.filter({ status: "active" }, "-created_date", 3),
        base44.entities.SessionLog.list("-created_date", 5),
      ]);
      setProjects(projs);
      setPrompts(prpts);
      setRecentLogs(logs);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  const greeting = user ? `Hello, Alice ${user.full_name?.split(" ")[0] || "there"}` : "Hello";

  return (
    <div className="animate-fade-in space-y-8">
      <div className="pt-2">
        <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="font-serif text-3xl text-foreground mt-1">{greeting}</h1>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/projects/new" className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-4 text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px]">
          <Plus size={16} />
          New project
        </Link>
        <Link to="/prompts/new" className="flex items-center gap-2 bg-secondary text-secondary-foreground rounded-xl px-4 py-4 text-sm font-medium hover:bg-muted transition-colors min-h-[44px]">
          <Zap size={16} />
          New prompt
        </Link>
      </div>

      {/* Active projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active projects</h2>
          <Link to="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">All <ArrowRight size={12} /></Link>
        </div>
        {projects.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No active projects yet.</p>
            <Link to="/projects/new" className="text-sm text-foreground underline mt-2 inline-block">Create your first project</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block bg-card border border-border rounded-xl px-4 py-4 hover:border-foreground/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.project_type} · {p.current_phase || "No phase set"}</p>
                  </div>
                  {!p.alignment_complete && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">Needs alignment</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent logs</h2>
          </div>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-xl px-4 py-3">
                <p className="text-sm text-foreground line-clamp-2">{log.text_entry}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={11} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{format(new Date(log.created_date), "d MMM, HH:mm")} · {log.author_name || "You"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active prompts */}
      {prompts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Open prompts</h2>
            <Link to="/prompts" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">All <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            {prompts.map(p => (
              <Link key={p.id} to={`/prompts/${p.id}`} className="block bg-card border border-border rounded-xl px-4 py-3 hover:border-foreground/30 transition-colors">
                <p className="text-sm font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.intent}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}