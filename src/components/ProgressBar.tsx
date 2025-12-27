type Props = { current: number; total: number };

export default function ProgressBar({ current, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div style={{ margin: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, opacity: 0.8 }}>
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#22c55e" }} />
      </div>
    </div>
  );
}
