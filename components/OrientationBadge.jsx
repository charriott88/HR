export default function OrientationBadge({ orientation, onChange }) {
  const isStructured = orientation === "structured";
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
      <button
        onClick={() => onChange && onChange("structured")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${isStructured ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        A — Structured
      </button>
      <button
        onClick={() => onChange && onChange("open")}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${!isStructured ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        B — Open
      </button>
    </div>
  );
}