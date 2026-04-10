import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";

export default function NewPrompt() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", intent: "", description: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.intent) return;
    setSaving(true);
    const me = await base44.auth.me();
    const prompt = await base44.entities.PromptCall.create({ ...form, creator_id: me.id, status: "active" });
    navigate(`/prompts/${prompt.id}`);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/prompts" className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <h1 className="font-serif text-2xl text-foreground">New prompt</h1>
      </div>

      <div className="bg-secondary/50 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">Lighter than a project. A single prompt or question to explore through movement sessions.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prompt title *</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. What happens when we refuse to be still?"
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">1-line intent *</label>
          <input
            value={form.intent}
            onChange={e => setForm(f => ({ ...f, intent: e.target.value }))}
            placeholder="What are you trying to find out or make?"
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Any additional context or framing…"
            rows={4}
            className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || !form.title || !form.intent}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 min-h-[44px]"
      >
        {saving ? "Creating…" : "Create prompt"}
      </button>
    </div>
  );
}