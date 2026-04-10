import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PromptCall.list("-created_date", 50).then(p => {
      setPrompts(p);
      setLoading(false);
    });
  }, []);

  const active = prompts.filter(p => p.status === "active");
  const others = prompts.filter(p => p.status !== "active");

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Prompts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Lightweight creative exploration mode</p>
        </div>
        <Link to="/prompts/new" className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px]">
          <Plus size={15} /> New
        </Link>
      </div>

      <div className="bg-secondary/50 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">Prompts are lighter than projects — for exploration, research, or responding to a brief. Sessions can be converted into a full project later.</p>
      </div>

      {active.length === 0 && others.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">No prompts yet.</p>
          <Link to="/prompts/new" className="text-sm text-foreground underline">Start your first prompt</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Active</p>
              <div className="space-y-2">
                {active.map(p => (
                  <Link key={p.id} to={`/prompts/${p.id}`} className="block bg-card border border-border rounded-xl px-4 py-4 hover:border-foreground/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.intent}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.created_date), "d MMM yyyy")}</p>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground mt-1 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Archived / Converted</p>
              <div className="space-y-2 opacity-60">
                {others.map(p => (
                  <Link key={p.id} to={`/prompts/${p.id}`} className="block bg-card border border-border rounded-xl px-4 py-3 hover:border-foreground/30 transition-colors">
                    <p className="text-sm text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.status}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}