import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Plus, X } from "lucide-react";

const ROLES = ["Movement Director / Choreographer", "Film Director", "Dancer / Performer", "DOP / Cinematographer", "Stylist / Creative Director", "Producer"];
const PERMISSIONS = ["owner", "editor", "contributor", "viewer"];

const ROLE_PERMISSIONS = {
  "Movement Director / Choreographer": "owner",
  "Film Director": "editor",
  "Dancer / Performer": "contributor",
  "DOP / Cinematographer": "contributor",
  "Stylist / Creative Director": "contributor",
  "Producer": "viewer",
};

export default function CollaboratorsView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ user_name: "", user_email: "", assigned_role: "", permission_level: "contributor" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    const [projs, collabs] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.ProjectCollaborator.filter({ project_id: projectId }),
    ]);
    setProject(projs[0]);
    setCollaborators(collabs);
    setLoading(false);
  }

  const handleCreate = async () => {
    if (!form.assigned_role) return;
    setSaving(true);
    await base44.entities.ProjectCollaborator.create({ ...form, project_id: projectId });
    setForm({ user_name: "", user_email: "", assigned_role: "", permission_level: "contributor" });
    setShowNew(false);
    setSaving(false);
    load();
  };

  const removeCollaborator = async (id) => {
    await base44.entities.ProjectCollaborator.delete(id);
    setCollaborators(prev => prev.filter(c => c.id !== id));
  };

  const setRole = (role) => setForm(f => ({ ...f, assigned_role: role, permission_level: ROLE_PERMISSIONS[role] || "contributor" }));

  const permissionLabel = (level) => ({
    owner: "Full access",
    editor: "Edit alignment + logs",
    contributor: "Add logs + respond",
    viewer: "View only",
  }[level] || level);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Collaborators</h1>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="ml-auto flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]">
          <Plus size={14} /> Add
        </button>
      </div>

      {showNew && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input value={form.user_name} onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} placeholder="Name" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <input value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} placeholder="Email (optional)" type="email" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm" />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Role *</p>
            <div className="flex flex-col gap-1.5">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)} className={`px-3 py-2.5 rounded-lg text-sm border text-left transition-colors min-h-[44px] ${form.assigned_role === r ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>{r}</button>
              ))}
            </div>
          </div>
          {form.assigned_role && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Permission level</p>
              <div className="flex flex-wrap gap-1.5">
                {PERMISSIONS.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, permission_level: p }))} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.permission_level === p ? "border-foreground bg-foreground text-primary-foreground" : "border-border bg-card text-foreground"}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !form.assigned_role} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 min-h-[44px]">Add collaborator</button>
            <button onClick={() => setShowNew(false)} className="p-2.5 border border-border rounded-xl hover:bg-secondary min-h-[44px]"><X size={16} /></button>
          </div>
        </div>
      )}

      {collaborators.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No collaborators added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{c.user_name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.assigned_role}</p>
                {c.user_email && <p className="text-xs text-muted-foreground">{c.user_email}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{permissionLabel(c.permission_level)}</span>
                <button onClick={() => removeCollaborator(c.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-secondary/50 rounded-xl px-4 py-3 mt-4">
        <p className="text-xs text-muted-foreground font-medium mb-1">Permission levels</p>
        <div className="space-y-1">
          {PERMISSIONS.map(p => <p key={p} className="text-xs text-muted-foreground"><span className="text-foreground">{p}</span> — {permissionLabel(p)}</p>)}
        </div>
      </div>
    </div>
  );
}