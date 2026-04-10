import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Plus, Edit3, Calendar, Users, MessageSquare, GitBranch, FileText, Archive, Camera, Layers } from "lucide-react";
import OrientationBadge from "../components/OrientationBadge";
import { format } from "date-fns";

export default function ProjectHome() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [upcomingDates, setUpcomingDates] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [projs, alignments, logs, timeline, collabs] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }),
        base44.entities.AlignmentRecord.filter({ project_id: projectId }, "-version", 1),
        base44.entities.SessionLog.filter({ project_id: projectId }, "-created_date", 5),
        base44.entities.TimelineItem.filter({ project_id: projectId }, "date", 20),
        base44.entities.ProjectCollaborator.filter({ project_id: projectId }),
      ]);
      setProject(projs[0]);
      setAlignment(alignments[0]);
      setRecentLogs(logs);
      const now = new Date().toISOString().split("T")[0];
      setUpcomingDates(timeline.filter(t => t.date >= now).slice(0, 4));
      setCollaborators(collabs);
      setLoading(false);
    }
    load();
  }, [projectId]);

  const switchOrientation = async (o) => {
    await base44.entities.Project.update(projectId, { orientation: o });
    setProject(p => ({ ...p, orientation: o }));
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;
  if (!project) return <div className="text-muted-foreground text-sm">Project not found.</div>;

  const energyDots = (score) => score ? Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${i < score ? "bg-foreground" : "bg-border"}`} />
  )) : null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <Link to="/projects" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"><ChevronLeft size={13} /> Projects</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-foreground leading-tight">{project.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">{project.project_type} · {project.context}</p>
          </div>
          <Link to={`/projects/${projectId}/log`} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] shrink-0">
            <Plus size={14} />
            Log
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {project.current_phase && (
            <div className="inline-flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-xs font-medium">{project.current_phase}</span>
            </div>
          )}
          <OrientationBadge orientation={project.orientation || "structured"} onChange={switchOrientation} />
        </div>
      </div>

      {/* Alignment snapshot */}
      <div className={`border rounded-xl px-4 py-4 ${alignment ? "border-border bg-card" : "border-dashed border-border"}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alignment</p>
          <Link to={`/projects/${projectId}/alignment`} className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Edit3 size={13} className="text-muted-foreground" /></Link>
        </div>
        {alignment ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Core intent</p>
              <p className="text-sm text-foreground leading-relaxed">{alignment.core_intent}</p>
            </div>
            {[alignment.movement_principle_1, alignment.movement_principle_2, alignment.movement_principle_3].filter(Boolean).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Movement principles</p>
                <div className="space-y-1">
                  {[alignment.movement_principle_1, alignment.movement_principle_2, alignment.movement_principle_3].filter(Boolean).map((p, i) => (
                    <p key={i} className="text-xs text-foreground bg-secondary rounded-lg px-3 py-1.5">— {p}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No alignment set yet.</p>
            <Link to={`/projects/${projectId}/alignment`} className="text-sm text-foreground underline">Set alignment →</Link>
          </div>
        )}
      </div>

      {/* Nav grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { to: `/projects/${projectId}/feed`, icon: MessageSquare, label: "Session feed" },
          { to: `/projects/${projectId}/threads`, icon: GitBranch, label: "Threads" },
          { to: `/projects/${projectId}/timeline`, icon: Calendar, label: "Timeline" },
          { to: `/projects/${projectId}/collaborators`, icon: Users, label: "Collaborators" },
          { to: `/projects/${projectId}/treatment`, icon: Layers, label: "Treatment" },
          { to: `/projects/${projectId}/shots`, icon: Camera, label: (project.orientation || "structured") === "open" ? "Moments" : "Shot list" },
          { to: `/projects/${projectId}/outputs`, icon: FileText, label: "Outputs" },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-3.5 text-sm text-foreground hover:border-foreground/30 transition-colors min-h-[44px]">
            <Icon size={15} className="text-muted-foreground" />
            {label}
          </Link>
        ))}
      </div>

      {/* Upcoming dates */}
      {upcomingDates.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Upcoming</p>
          <div className="space-y-2">
            {upcomingDates.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <div className="text-center min-w-[36px]">
                  <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM")}</p>
                  <p className="text-base font-medium text-foreground leading-none">{format(new Date(item.date), "d")}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.type} · {item.phase}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent logs</p>
            <Link to={`/projects/${projectId}/feed`} className="text-xs text-muted-foreground hover:text-foreground">See all</Link>
          </div>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2">{log.text_entry}</p>
                  {log.energy_clarity_score && (
                    <div className="flex gap-0.5 mt-1 shrink-0">{energyDots(log.energy_clarity_score)}</div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{log.author_name} · {log.phase} · {format(new Date(log.created_date), "d MMM")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Archive */}
      <div className="pt-2">
        <button
          onClick={async () => { await base44.entities.Project.update(projectId, { status: project.status === "archived" ? "active" : "archived" }); setProject(p => ({ ...p, status: p.status === "archived" ? "active" : "archived" })); }}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Archive size={13} />
          {project.status === "archived" ? "Unarchive project" : "Archive project"}
        </button>
      </div>
    </div>
  );
}