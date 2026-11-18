/* One page, pulled apart in depth into the three things Asterism reads from
   it: the text, the figures and the tables. Pure CSS 3D. The layers drift on
   a slow breath and spread further on hover; under reduced motion they hold
   still, already apart. */

const LAYERS = [
  { name: "Page", z: 0, kind: "page" },
  { name: "Text", z: 64, kind: "text" },
  { name: "Figures", z: 128, kind: "figure" },
  { name: "Tables", z: 192, kind: "table" },
] as const;

export function ExplodedDocument() {
  return (
    <div className="stack-host relative mx-auto flex h-[380px] w-full max-w-[440px] items-center justify-center [perspective:1400px] sm:h-[440px]">
      <div className="stack relative h-[220px] w-[170px] sm:h-[250px] sm:w-[190px]">
        {LAYERS.map((l, i) => (
          <div
            key={l.name}
            className="absolute inset-0"
            style={{ "--z": `${l.z}px`, "--d": `${i * -400}ms` } as React.CSSProperties}
          >
            {/* Unlabelled on purpose: a label in the stack is hidden by the
                sheet above it, and the list beside this names each layer. */}
            <Layer kind={l.kind} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Layer({ kind }: { kind: (typeof LAYERS)[number]["kind"] }) {
  if (kind === "page") {
    return <div className="h-full w-full rounded-[3px] border border-n-4 bg-n-2" />;
  }
  if (kind === "text") {
    return (
      <div className="flex h-full w-full flex-col gap-2 rounded-[3px] border border-n-5 bg-n-1/85 p-4">
        {[90, 100, 76, 100, 94, 60, 100, 82].map((w, i) => (
          <span key={i} className="h-[3px] rounded-full bg-n-10/70" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  if (kind === "figure") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[3px] border border-accent-line bg-n-1/85 p-4">
        <div className="flex h-20 w-full items-end gap-1.5">
          {[38, 52, 90, 64, 48].map((h, i) => (
            <span
              key={i}
              className={i === 2 ? "flex-1 rounded-[1px] bg-accent" : "flex-1 rounded-[1px] bg-accent/35"}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-end rounded-[3px] border border-n-5 bg-n-1/85 p-4">
      <div className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-[2px] bg-n-6/60">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={i < 3 ? "h-4 bg-n-5" : "h-4 bg-n-1"} />
        ))}
      </div>
    </div>
  );
}
