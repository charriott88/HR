import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Sparkles, Pencil, Save, RefreshCw, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";
import PptxGenJS from "pptxgenjs";
import OrientationBadge from "../components/OrientationBadge";

const STRUCTURED_SECTIONS = [
  { key: "concept_overview", label: "Concept Overview", hint: "What this is doing" },
  { key: "movement_direction", label: "Movement Direction", hint: "How bodies behave" },
  { key: "visual_language", label: "Visual Language", hint: "What is seen and how it composes" },
  { key: "camera_logic", label: "Camera Logic", hint: "How the camera reads the movement" },
  { key: "tone_performance", label: "Tone and Performance", hint: "How it should feel" },
  { key: "execution_notes", label: "Execution Notes", hint: "What must remain consistent" },
];

const OPEN_SECTIONS = [
  { key: "core_intention", label: "Core Intention", hint: "What is being explored" },
  { key: "movement_investigation", label: "Movement Investigation", hint: "What is being tested" },
  { key: "visual_atmosphere", label: "Visual Atmosphere", hint: "How it might feel" },
  { key: "spatial_relational", label: "Spatial / Relational Ideas", hint: "How bodies relate" },
  { key: "open_questions", label: "Open Questions", hint: "What is unresolved" },
  { key: "process_direction", label: "Process Direction", hint: "Where to push next" },
];

export default function TreatmentView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [alignment, setAlignment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [treatment, setTreatment] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shotImages, setShotImages] = useState({}); // key: `${sectionKey}-${index}` => [url, url, url]
  const [selectedImages, setSelectedImages] = useState({}); // key => selected url
  const [generatingImages, setGeneratingImages] = useState(new Set()); // set of imgKeys currently generating
  const [editingMoodShot, setEditingMoodShot] = useState(null);
  const [editMoodShotText, setEditMoodShotText] = useState("");
  const [loading, setLoading] = useState(true);
  const [presentMode, setPresentMode] = useState(false);
  const [outputs, setOutputs] = useState([]);

  const exportPDF = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 56;
    const contentW = pageW - margin * 2;
    let y = margin;

    const checkPage = (needed = 30) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };

    const addText = (text, fontSize, isBold, color = [30, 30, 30]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text), contentW);
      lines.forEach(line => {
        checkPage(fontSize * 1.6);
        doc.text(line, margin, y);
        y += fontSize * 1.45;
      });
    };

    const addDivider = () => {
      checkPage(20);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 16;
    };

    const addSectionLabel = (label) => {
      y += 10;
      checkPage(24);
      addText(label.toUpperCase(), 8, true, [100, 120, 100]);
      y += 2;
    };

    // ── Title block ──────────────────────────────────────────
    addText(project?.title || "Treatment", 26, true);
    y += 4;
    addText(`${orientation === "structured" ? "Structured" : "Open"} Treatment  ·  Version ${treatment.version}`, 10, false, [120, 120, 120]);
    if (project?.project_type) addText(`${project.project_type}  ·  ${project.current_phase || ""}`, 10, false, [120, 120, 120]);
    y += 16;
    addDivider();

    // ── Project context ──────────────────────────────────────
    addSectionLabel("Project Context");
    if (project?.context) addText(`Context: ${project.context}`, 10, false);
    if (project?.intended_outcome) addText(`Intended Outcome: ${project.intended_outcome}`, 10, false);
    y += 12;

    // ── Alignment ────────────────────────────────────────────
    if (alignment) {
      addDivider();
      addSectionLabel("Alignment");
      if (alignment.core_intent) addText(`Core Intent: ${alignment.core_intent}`, 10, false);
      const principles = [alignment.movement_principle_1, alignment.movement_principle_2, alignment.movement_principle_3].filter(Boolean);
      if (principles.length) addText(`Movement Principles: ${principles.join(" · ")}`, 10, false);
      if (alignment.camera_rule) addText(`Camera: ${alignment.camera_rule}`, 10, false);
      if (alignment.direction_rule) addText(`Direction: ${alignment.direction_rule}`, 10, false);
      if (alignment.styling_rule) addText(`Styling: ${alignment.styling_rule}`, 10, false);
      y += 12;
    }

    // ── Collaborators ─────────────────────────────────────────
    if (collaborators.length > 0) {
      addDivider();
      addSectionLabel("Collaborators");
      collaborators.forEach(c => {
        addText(`${c.user_name || c.user_email || "—"}  ·  ${c.assigned_role}  ·  ${c.permission_level}`, 10, false);
      });
      y += 12;
    }

    // ── Treatment sections ────────────────────────────────────
    addDivider();
    addSectionLabel("Treatment");
    y += 4;
    sections.forEach(s => {
      if (!treatment[s.key]) return;
      checkPage(40);
      addText(s.label.toUpperCase(), 8, true, [100, 120, 100]);
      y += 2;
      addText(treatment[s.key], 10.5, false);
      y += 18;
    });

    // ── Mood shots ────────────────────────────────────────────
    const moodShotsData = treatment?.mood_shots_json ? (() => { try { return JSON.parse(treatment.mood_shots_json); } catch { return {}; } })() : {};
    const hasMoodShots = sections.some(s => moodShotsData[s.key]?.length > 0);
    if (hasMoodShots) {
      addDivider();
      addSectionLabel("Mood Shot References");
      y += 4;
      for (const s of sections) {
        const shots = moodShotsData[s.key];
        if (!shots?.length) continue;
        checkPage(24);
        addText(s.label, 9, true, [60, 80, 60]);
        for (let i = 0; i < shots.length; i++) {
          const shot = shots[i];
          const shotText = typeof shot === "string" ? shot : (shot?.description || JSON.stringify(shot));
          addText(`${i + 1}. ${shotText}`, 9.5, false, [50, 50, 50]);
          y += 2;
          const imgKey = `${s.key}-${i}`;
          const imgUrl = selectedImages[imgKey];
          if (imgUrl) {
            try {
              const resp = await fetch(imgUrl);
              const blob = await resp.blob();
              const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
              const imgW = contentW * 0.45;
              const imgH = imgW * 0.65;
              checkPage(imgH + 12);
              doc.addImage(dataUrl, "JPEG", margin, y, imgW, imgH);
              y += imgH + 10;
            } catch {}
          }
          y += 4;
        }
        y += 8;
      }
    }

    // ── Outputs ───────────────────────────────────────────────
    if (outputs.length > 0) {
      addDivider();
      addSectionLabel("Generated Outputs");
      y += 4;
      outputs.forEach(o => {
        checkPage(40);
        addText(o.output_type.toUpperCase(), 8, true, [100, 120, 100]);
        y += 2;
        addText(o.generated_text, 10.5, false);
        y += 18;
      });
    }

    // ── Footer ────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`${project?.title || "Treatment"} — AM Mvmt Space`, margin, pageH - 28);
      doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 28, { align: "right" });
    }

    doc.save(`${(project?.title || "treatment").replace(/\s+/g, "-").toLowerCase()}-treatment.pdf`);
  };

  const exportWord = async () => {
    const slug = (project?.title || "treatment").replace(/\s+/g, "-").toLowerCase();
    const children = [];
    const h = (text, lvl = HeadingLevel.HEADING_1) => new Paragraph({ heading: lvl, children: [new TextRun({ text, bold: true })] });
    const p = (text) => new Paragraph({ children: [new TextRun({ text: String(text || ""), size: 22 })] });
    const spacer = () => new Paragraph({ text: "" });

    children.push(h(project?.title || "Treatment"));
    children.push(p(`${orientation === "structured" ? "Structured" : "Open"} Treatment · Version ${treatment.version}`));
    if (project?.project_type) children.push(p(`${project.project_type} · ${project.current_phase || ""}`));
    children.push(spacer());
    children.push(h("Project Context", HeadingLevel.HEADING_2));
    if (project?.context) children.push(p(`Context: ${project.context}`));
    if (project?.intended_outcome) children.push(p(`Intended Outcome: ${project.intended_outcome}`));
    children.push(spacer());
    if (alignment) {
      children.push(h("Alignment", HeadingLevel.HEADING_2));
      if (alignment.core_intent) children.push(p(`Core Intent: ${alignment.core_intent}`));
      const principles = [alignment.movement_principle_1, alignment.movement_principle_2, alignment.movement_principle_3].filter(Boolean);
      if (principles.length) children.push(p(`Movement Principles: ${principles.join(" · ")}`));
      if (alignment.camera_rule) children.push(p(`Camera: ${alignment.camera_rule}`));
      if (alignment.direction_rule) children.push(p(`Direction: ${alignment.direction_rule}`));
      if (alignment.styling_rule) children.push(p(`Styling: ${alignment.styling_rule}`));
      children.push(spacer());
    }
    if (collaborators.length > 0) {
      children.push(h("Collaborators", HeadingLevel.HEADING_2));
      collaborators.forEach(c => children.push(p(`${c.user_name || c.user_email || "—"} · ${c.assigned_role} · ${c.permission_level}`)));
      children.push(spacer());
    }
    children.push(h("Treatment", HeadingLevel.HEADING_2));
    const moodShotsData = treatment?.mood_shots_json ? (() => { try { return JSON.parse(treatment.mood_shots_json); } catch { return {}; } })() : {};
    for (const s of sections) {
      if (!treatment[s.key]) continue;
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: s.label, bold: true })] }));
      children.push(p(treatment[s.key]));
      children.push(spacer());
      const shots = moodShotsData[s.key];
      if (shots?.length) {
        children.push(p("Mood Shot References:"));
        for (let i = 0; i < shots.length; i++) {
          const shot = shots[i];
          const shotText = typeof shot === "string" ? shot : (shot?.description || JSON.stringify(shot));
          children.push(p(`${i + 1}. ${shotText}`));
          const imgKey = `${s.key}-${i}`;
          const imgUrl = selectedImages[imgKey];
          if (imgUrl) {
            try {
              const resp = await fetch(imgUrl);
              const blob = await resp.blob();
              const arrayBuffer = await blob.arrayBuffer();
              children.push(new Paragraph({
                children: [new ImageRun({ data: arrayBuffer, transformation: { width: 300, height: 200 }, type: "jpg" })]
              }));
            } catch {}
          }
        }
        children.push(spacer());
      }
    }
    if (outputs.length > 0) {
      children.push(h("Generated Outputs", HeadingLevel.HEADING_2));
      outputs.forEach(o => {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: o.output_type, bold: true })] }));
        children.push(p(o.generated_text));
        children.push(spacer());
      });
    }
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${slug}-treatment.docx`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPPT = async () => {
    const slug = (project?.title || "treatment").replace(/\s+/g, "-").toLowerCase();
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const BG = "F7F5EE"; const FG = "1a2e1a"; const ACCENT = "4a7a4a";
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: BG };
    titleSlide.addText(project?.title || "Treatment", { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 40, bold: true, color: FG, fontFace: "Georgia" });
    titleSlide.addText(`${orientation === "structured" ? "Structured" : "Open"} Treatment · Version ${treatment.version}\n${project?.project_type || ""} · ${project?.current_phase || ""}`, { x: 0.5, y: 2.9, w: 12, h: 0.8, fontSize: 16, color: "888888", fontFace: "Arial" });
    titleSlide.addText("AM Mvmt Space", { x: 0.5, y: 4.5, w: 12, h: 0.4, fontSize: 11, color: "aaaaaa" });

    if (alignment) {
      const s = pptx.addSlide(); s.background = { color: BG };
      s.addText("ALIGNMENT", { x: 0.5, y: 0.4, w: 12, h: 0.4, fontSize: 10, bold: true, color: ACCENT });
      const lines = [
        alignment.core_intent && `Core Intent: ${alignment.core_intent}`,
        ...[alignment.movement_principle_1, alignment.movement_principle_2, alignment.movement_principle_3].filter(Boolean).map(p => `· ${p}`),
        alignment.camera_rule && `Camera: ${alignment.camera_rule}`,
        alignment.direction_rule && `Direction: ${alignment.direction_rule}`,
        alignment.styling_rule && `Styling: ${alignment.styling_rule}`,
      ].filter(Boolean);
      s.addText(lines.join("\n"), { x: 0.5, y: 1.0, w: 12, h: 4, fontSize: 14, color: FG, valign: "top" });
    }

    const moodShotsData = treatment?.mood_shots_json ? (() => { try { return JSON.parse(treatment.mood_shots_json); } catch { return {}; } })() : {};

    for (const sec of sections) {
      if (!treatment[sec.key]) continue;
      const s = pptx.addSlide(); s.background = { color: BG };
      s.addText(sec.label.toUpperCase(), { x: 0.5, y: 0.4, w: 12, h: 0.4, fontSize: 10, bold: true, color: ACCENT });
      s.addText(treatment[sec.key], { x: 0.5, y: 1.0, w: 12, h: 4, fontSize: 15, color: FG, valign: "top", wrap: true });

      // Mood shots slide for this section
      const shots = moodShotsData[sec.key];
      if (shots?.length) {
        const moodSlide = pptx.addSlide(); moodSlide.background = { color: BG };
        moodSlide.addText(`${sec.label.toUpperCase()} — MOOD SHOTS`, { x: 0.5, y: 0.3, w: 12, h: 0.4, fontSize: 9, bold: true, color: ACCENT });
        let xPos = 0.4;
        let captionLines = [];
        for (let i = 0; i < shots.length; i++) {
          const shot = shots[i];
          const shotText = typeof shot === "string" ? shot : (shot?.description || JSON.stringify(shot));
          const imgKey = `${sec.key}-${i}`;
          const imgUrl = selectedImages[imgKey];
          if (imgUrl) {
            try {
              const resp = await fetch(imgUrl);
              const blob = await resp.blob();
              const base64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(blob); });
              moodSlide.addImage({ data: `image/jpeg;base64,${base64}`, x: xPos, y: 0.9, w: 4, h: 2.8 });
            } catch {}
          }
          captionLines.push(`${i + 1}. ${shotText}`);
          xPos += 4.2;
        }
        moodSlide.addText(captionLines.join("  |  "), { x: 0.4, y: 3.85, w: 12, h: 0.8, fontSize: 9, color: "666666", wrap: true });
      }
    }

    if (outputs.length > 0) {
      outputs.forEach(o => {
        const s = pptx.addSlide(); s.background = { color: BG };
        s.addText(o.output_type.toUpperCase(), { x: 0.5, y: 0.4, w: 12, h: 0.4, fontSize: 10, bold: true, color: ACCENT });
        s.addText(o.generated_text, { x: 0.5, y: 1.0, w: 12, h: 4, fontSize: 14, color: FG, valign: "top", wrap: true });
      });
    }

    await pptx.writeFile({ fileName: `${slug}-treatment.pptx` });
  };

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    const [projs, alignments, allLogs, treatments, collabs, outs] = await Promise.all([
      base44.entities.Project.filter({ id: projectId }),
      base44.entities.AlignmentRecord.filter({ project_id: projectId }, "-version", 1),
      base44.entities.SessionLog.filter({ project_id: projectId }, "-created_date", 10),
      base44.entities.Treatment.filter({ project_id: projectId }, "-version", 1),
      base44.entities.ProjectCollaborator.filter({ project_id: projectId }),
      base44.entities.GeneratedOutput.filter({ project_id: projectId }, "-created_date"),
    ]);
    setProject(projs[0]);
    setAlignment(alignments[0]);
    setLogs(allLogs);
    setCollaborators(collabs);
    setOutputs(outs);
    const t = treatments[0] || null;
    setTreatment(t);
    if (t?.selected_images_json) {
      try { setSelectedImages(JSON.parse(t.selected_images_json)); } catch {}
    }
    setLoading(false);
  }

  const orientation = project?.orientation || "structured";
  const sections = orientation === "structured" ? STRUCTURED_SECTIONS : OPEN_SECTIONS;

  const buildPrompt = () => {
    const a = alignment;
    const logsSample = logs.slice(0, 8).map(l => `"${l.text_entry}"`).join("; ");
    const principles = a ? [a.movement_principle_1, a.movement_principle_2, a.movement_principle_3].filter(Boolean).join("; ") : "";

    const langRules = `
LANGUAGE RULES:
- Prioritise perception over description. Focus on how the work reads, not abstract ideas.
- Use directive, decision-based phrasing: "This needs to…", "This should read as…", "This holds when…", "This loses clarity when…"
- Avoid vague terms: explore, investigate, dynamic, beautiful — unless clearly defined.
- Keep statements short, clear, usable.
- Anchor every statement to: "What will the audience or camera perceive?"
- Example transformation: "fragmented movement" → "movement breaks before completion — phrases do not resolve"
`;

    if (orientation === "structured") {
      return `You are generating a directorial treatment document for a ${project?.project_type} project titled "${project?.title}".
Context: ${project?.context}. Intended outcome: ${project?.intended_outcome}. Phase: ${project?.current_phase}.
Core intent: "${a?.core_intent}". Movement principles: ${principles}.
Camera rule: ${a?.camera_rule}. Direction rule: ${a?.direction_rule}. Styling rule: ${a?.styling_rule}.
Early session observations: ${logsSample}.

${langRules}

Generate a treatment with exactly these 6 sections. Return as JSON with keys matching exactly: concept_overview, movement_direction, visual_language, camera_logic, tone_performance, execution_notes.
Each section: 2–4 short directive statements. No headers in the text itself. Be concise and decision-based.

Also return a "mood_shots" object with 3 reference image descriptions per section key. Each description is a specific, visual, concrete image — not abstract. e.g. "A single arm extending into harsh side-light, palm open, shadow sharp against white wall." Keys must match the 6 section keys exactly.`;
    } else {
      return `You are generating an exploratory treatment document for a movement-led project titled "${project?.title}".
Context: ${project?.context}. Phase: ${project?.current_phase}.
Core intent: "${a?.core_intent}". Movement principles: ${principles}.
Early session observations: ${logsSample}.

${langRules}

This is an OPEN / ARTIST-LED treatment. Maintain openness, suggest possibilities, preserve ambiguity while clarifying direction.
Generate a treatment with exactly these 6 sections. Return as JSON with keys matching exactly: core_intention, movement_investigation, visual_atmosphere, spatial_relational, open_questions, process_direction.
Each section: 2–4 short statements. Keep language open but not vague. Be usable on set or in studio.

Also return a "mood_shots" object with 3 reference image descriptions per section key. Each is evocative and specific — texture, light quality, body position, spatial quality. e.g. "Two figures at opposite ends of a fog-filled corridor, neither moving toward the other." Keys must match the 6 section keys exactly.`;
    }
  };

  const generate = async () => {
    setGenerating(true);
    const me = await base44.auth.me();
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(),
      response_json_schema: {
        type: "object",
        properties: orientation === "structured"
          ? {
              concept_overview: { type: "string" },
              movement_direction: { type: "string" },
              visual_language: { type: "string" },
              camera_logic: { type: "string" },
              tone_performance: { type: "string" },
              execution_notes: { type: "string" },
              mood_shots: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
            }
          : {
              core_intention: { type: "string" },
              movement_investigation: { type: "string" },
              visual_atmosphere: { type: "string" },
              spatial_relational: { type: "string" },
              open_questions: { type: "string" },
              process_direction: { type: "string" },
              mood_shots: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
            },
      },
    });

    const version = treatment ? (treatment.version || 1) + 1 : 1;
    const { mood_shots, ...textFields } = result;
    const data = { ...textFields, project_id: projectId, orientation, version, created_by: me.id, mood_shots_json: mood_shots ? JSON.stringify(mood_shots) : "" };
    const saved = await base44.entities.Treatment.create(data);
    setTreatment(saved);
    setGenerating(false);
  };

  const generateShotImage = async (sectionKey, index, description) => {
    const imgKey = `${sectionKey}-${index}`;
    setGeneratingImages(prev => new Set([...prev, imgKey]));
    const projectContext = `${project?.project_type || ''} project titled "${project?.title || ''}". Context: ${project?.context || ''}. Core intent: "${alignment?.core_intent || ''}".`;
    const prompt = `Cinematic mood reference image for a ${projectContext} Visual reference for: ${description}. Photographic, evocative, movement-led.`;
    const [r1, r2, r3] = await Promise.all([
      base44.integrations.Core.GenerateImage({ prompt }),
      base44.integrations.Core.GenerateImage({ prompt }),
      base44.integrations.Core.GenerateImage({ prompt }),
    ]);
    setShotImages(prev => ({ ...prev, [imgKey]: [r1.url, r2.url, r3.url] }));
    setGeneratingImages(prev => { const n = new Set(prev); n.delete(imgKey); return n; });
  };

  const moodShots = treatment?.mood_shots_json ? (() => { try { return JSON.parse(treatment.mood_shots_json); } catch { return {}; } })() : {};

  const saveMoodShotEdit = async (sectionKey, index) => {
    const updated = { ...moodShots };
    if (!updated[sectionKey]) return;
    updated[sectionKey] = updated[sectionKey].map((s, i) => i === index ? editMoodShotText : s);
    await base44.entities.Treatment.update(treatment.id, { mood_shots_json: JSON.stringify(updated) });
    setTreatment(t => ({ ...t, mood_shots_json: JSON.stringify(updated) }));
    setEditingMoodShot(null);
  };

  const startEdit = (key, value) => { setEditingKey(key); setEditText(value || ""); };

  const saveEdit = async () => {
    if (!treatment) return;
    setSaving(true);
    await base44.entities.Treatment.update(treatment.id, { [editingKey]: editText });
    setTreatment(t => ({ ...t, [editingKey]: editText }));
    setEditingKey(null);
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;

  if (presentMode && treatment) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <div className="max-w-xl mx-auto px-6 py-10 space-y-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{project?.title}</p>
              <h1 className="font-serif text-3xl text-foreground">Treatment</h1>
            </div>
            <button onClick={() => setPresentMode(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 border border-border rounded-lg">Exit</button>
          </div>
          <div className="space-y-8">
            {sections.map(s => treatment[s.key] && (
              <div key={s.key} className="border-t border-border pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{s.label}</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{treatment[s.key]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={18} /></Link>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{project?.title}</p>
          <h1 className="font-serif text-2xl text-foreground">Treatment</h1>
        </div>
        <OrientationBadge orientation={orientation} />
      </div>

      <div className="bg-secondary/50 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {orientation === "structured"
            ? "A decision document — what this is doing, how bodies behave, what must hold under pressure."
            : "An exploratory document — what is being investigated, how it might feel, where to push next."}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px]"
        >
          {generating ? (
            <><div className="w-3 h-3 border border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" /> Generating…</>
          ) : treatment ? (
            <><RefreshCw size={13} /> Regenerate</>
          ) : (
            <><Sparkles size={13} /> Generate treatment</>
          )}
        </button>
        {treatment && (
          <div className="flex items-center gap-1.5">
            <button onClick={exportPDF} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-2.5 rounded-xl text-xs font-medium hover:bg-muted min-h-[44px]"><Download size={12} /> PDF</button>
            <button onClick={exportWord} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-2.5 rounded-xl text-xs font-medium hover:bg-muted min-h-[44px]"><Download size={12} /> Word</button>
            <button onClick={exportPPT} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-2.5 rounded-xl text-xs font-medium hover:bg-muted min-h-[44px]"><Download size={12} /> PPT</button>
          </div>
        )}
        {treatment && (
          <button onClick={() => setPresentMode(true)} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted min-h-[44px]">
            Present
          </button>
        )}
      </div>

      {treatment && (
        <div className="space-y-3">
          {sections.map(s => (
            <div key={s.key} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
                {editingKey === s.key ? (
                  <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 text-xs text-foreground font-medium hover:opacity-70 min-h-[44px] px-2">
                    <Save size={12} /> {saving ? "Saving…" : "Save"}
                  </button>
                ) : (
                  <button onClick={() => startEdit(s.key, treatment[s.key])} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground min-h-[44px]">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              <div className="px-4 py-4">
                {editingKey === s.key ? (
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={5}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm resize-y focus:outline-none focus:border-foreground/50"
                    autoFocus
                  />
                ) : (
                  <>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {treatment[s.key] || <span className="text-muted-foreground italic">Not yet generated.</span>}
                    </p>
                    {moodShots[s.key]?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Mood shot references</p>
                        <div className="grid grid-cols-1 gap-2">
                          {moodShots[s.key].map((shot, i) => {
                            const shotText = typeof shot === 'string' ? shot : (shot?.description || shot?.text || JSON.stringify(shot));
                            const imgKey = `${s.key}-${i}`;
                            return (
                              <div key={i} className="bg-secondary/60 rounded-lg px-3 py-2.5">
                                <div className="flex items-start gap-2.5">
                                  <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">{i + 1}</span>
                                  <div className="flex-1">
                                   {editingMoodShot === imgKey ? (
                                    <div className="flex flex-col gap-1.5">
                                      <textarea
                                        value={editMoodShotText}
                                        onChange={e => setEditMoodShotText(e.target.value)}
                                        rows={3}
                                        autoFocus
                                        className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-foreground/50"
                                      />
                                      <div className="flex gap-2">
                                        <button onClick={() => saveMoodShotEdit(s.key, i)} className="text-xs text-foreground font-medium hover:opacity-70">Save</button>
                                        <button onClick={() => setEditingMoodShot(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                                      </div>
                                    </div>
                                   ) : (
                                    <>
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs text-foreground leading-relaxed">{shotText}</p>
                                        <button onClick={() => { setEditingMoodShot(imgKey); setEditMoodShotText(shotText); }} className="shrink-0 text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                                      </div>
                                      {shotImages[imgKey] ? (
                                        <div className="mt-2 space-y-2">
                                          <p className="text-xs text-muted-foreground">Select the most aligned:</p>
                                          <div className="grid grid-cols-3 gap-1.5">
                                            {shotImages[imgKey].map((url, imgIdx) => {
                                              const isSelected = selectedImages[imgKey] === url;
                                              return (
                                                <button key={imgIdx} onClick={async () => { const updated = { ...selectedImages, [imgKey]: url }; setSelectedImages(updated); await base44.entities.Treatment.update(treatment.id, { selected_images_json: JSON.stringify(updated) }); }} className={`relative rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-primary' : 'border-transparent hover:border-border'}`}>
                                                  <img src={url} alt={`Option ${imgIdx + 1}`} className="w-full object-cover" style={{height: 90}} />
                                                  {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><span className="text-xs font-medium text-primary bg-background/90 rounded px-1.5 py-0.5">✓</span></div>}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          <button onClick={() => generateShotImage(s.key, i, shotText)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Regenerate options</button>
                                        </div>
                                      ) : selectedImages[imgKey] ? (
                                        <div className="mt-2 space-y-1.5">
                                          <img src={selectedImages[imgKey]} alt="Selected" className="w-full rounded-lg object-cover" style={{maxHeight: 160}} />
                                          <button onClick={() => generateShotImage(s.key, i, shotText)} disabled={generatingImages.has(imgKey)} className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">{generatingImages.has(imgKey) ? "Generating…" : "Regenerate options"}</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => generateShotImage(s.key, i, shotText)} disabled={generatingImages.has(imgKey)} className="mt-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                                          {generatingImages.has(imgKey) ? "Generating…" : "Generate image"}
                                        </button>
                                      )}
                                    </>
                                   )}
                                  </div>
                                  </div>
                                  </div>
                                  );
                                  })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground px-1">Version {treatment.version}</p>
        </div>
      )}

      {!treatment && !generating && (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground mb-1">No treatment generated yet.</p>
          <p className="text-xs text-muted-foreground">Generate a first draft from your project alignment and session logs.</p>
        </div>
      )}
    </div>
  );
}