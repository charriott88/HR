import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function ShootMode() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [shots, setShots] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [projs, allShots] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }),
        base44.entities.Shot.filter({ project_id: projectId }, "order", 100),
      ]);
      setProject(projs[0]);
      setShots(allShots);
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) return <div className="fixed inset-0 bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  if (shots.length === 0) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm">No shots in the list yet.</p>
      <Link to={`/projects/${projectId}/shots`} className="text-sm text-foreground underline">Go to shot list →</Link>
    </div>
  );

  const shot = shots[index];
  const orientation = project?.orientation || "structured";
  const isOpen = orientation === "open";

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(shots.length - 1, i + 1));

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/projects/${projectId}/shots`} className="p-2 rounded-lg hover:bg-secondary"><X size={16} /></Link>
          <div>
            <p className="text-xs text-muted-foreground">{project?.title}</p>
            <p className="text-xs text-muted-foreground font-mono">{shot.shot_id} / {shots.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {shots.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-foreground" : "bg-border hover:bg-muted-foreground"}`} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-2">{shot.shot_id}</p>
          <p className="font-serif text-xl text-foreground leading-snug">{shot.what_happens}</p>
        </div>

        {!isOpen && shot.movement_intention && (
          <div className="border-l-2 border-foreground/20 pl-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Movement</p>
            <p className="text-sm text-foreground leading-relaxed">{shot.movement_intention}</p>
          </div>
        )}

        {isOpen && shot.what_exploring && (
          <div className="border-l-2 border-foreground/20 pl-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Exploring</p>
            <p className="text-sm text-foreground leading-relaxed">{shot.what_exploring}</p>
          </div>
        )}

        {!isOpen && shot.camera_action && (
          <div className="border-l-2 border-border pl-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Camera</p>
            <p className="text-sm text-foreground leading-relaxed">{shot.camera_action}</p>
          </div>
        )}

        {isOpen && shot.body_relationship && (
          <div className="border-l-2 border-border pl-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Body relationship</p>
            <p className="text-sm text-foreground leading-relaxed">{shot.body_relationship}</p>
          </div>
        )}

        {shot.roles && (
          <div className="bg-secondary/50 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Roles</p>
            <p className="text-sm text-foreground">{shot.roles}</p>
          </div>
        )}

        {shot.protagonists?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Protagonists</p>
            <div className="flex flex-wrap gap-2">
              {shot.protagonists.map(p => (
                <span key={p} className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground">{p}</span>
              ))}
            </div>
          </div>
        )}

        {!isOpen && shot.framing && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Framing</p>
            <p className="text-sm text-foreground">{shot.framing}</p>
          </div>
        )}

        {!isOpen && shot.spatial_logic && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Spatial logic</p>
            <p className="text-sm text-foreground">{shot.spatial_logic}</p>
          </div>
        )}

        {shot.notes && (
          <div className="bg-accent/10 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-foreground">{shot.notes}</p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm text-foreground disabled:opacity-30 hover:bg-secondary transition-colors min-h-[44px]"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <p className="text-xs text-muted-foreground">{index + 1} / {shots.length}</p>
        <button
          onClick={next}
          disabled={index === shots.length - 1}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm text-foreground disabled:opacity-30 hover:bg-secondary transition-colors min-h-[44px]"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}