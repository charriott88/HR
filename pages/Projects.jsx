import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Archive } from "lucide-react";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    base44.entities.Project.list("-created_date", 50).then(p => {
      setProjects(p);
      setLoading(false);
    });
  }, []);

  const active = projects.filter(p => p.status !== "archived");
  const archived = projects.filter(p => p.status === "archived");
  const displayed = showArchived ? archived : active;

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-foreground">Projects</h1>
        <Link to="/projects/new" className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px]">
          <Plus size={15} />
          New
        </Link>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowArchived(false)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!showArchived ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Active ({active.length})
        </button>
        <button onClick={() => setShowArchived(true)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${showArchived ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Archived ({archived.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">{showArchived ? "No archived projects." : "No active projects."}</p>
          {!showArchived && <Link to="/projects/new" className="text-sm text-foreground underline mt-2 inline-block">Create your first project</Link>}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block bg-card border border-border rounded-xl px-4 py-4 hover:border-foreground/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.project_type} · {p.context}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.current_phase || "Phase not set"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!p.alignment_complete && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full whitespace-nowrap">Align needed</span>}
                  {p.status === "archived" && <Archive size={13} className="text-muted-foreground" />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}