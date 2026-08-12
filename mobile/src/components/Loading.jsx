export default function Loading({ label }) {
  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 rounded-full border-[3px] border-primary/25 border-t-primary db-spin" />
      {label && <span className="font-body text-[12px] text-muted">{label}</span>}
    </div>
  );
}
