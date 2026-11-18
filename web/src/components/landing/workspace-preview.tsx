import { AsterismMark } from "@/components/shell/wordmark";

/* A still of the workspace, built from the same tokens as the real one, so it
   can never drift from the product. It arrives tilted back in depth and lies
   flat as it scrolls into view; the cited phrases are then marked in order,
   and last of all the passage on the page they came from.

   The example is a made-up report, and says so in its file name. */

const LINES = [96, 100, 88];
const LINES_AFTER = [100, 92, 70];
const BARS = [40, 48, 86, 60, 52, 44];

export function WorkspacePreview() {
  return (
    <div className="tilt-in overflow-hidden rounded-lg border border-n-3 bg-n-0 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.6)]">
      <div className="flex h-11 items-center gap-2.5 border-b border-n-3 px-4 text-sm">
        <AsterismMark size={15} className="text-n-12" />
        <span className="font-semibold tracking-tight text-n-12">Asterism</span>
        <span className="text-n-6">/</span>
        <span className="min-w-0 truncate text-n-9">example-energy-report.pdf</span>
        <span className="ml-auto hidden font-mono text-2xs text-n-7 sm:block">page 12 of 48</span>
      </div>

      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        {/* The page. Paper stays paper in either theme, as it does in the viewer. */}
        <div className="hidden justify-center border-r border-n-3 bg-n-1 p-8 md:flex">
          <div className="flex aspect-[1/1.32] w-full max-w-[320px] flex-col gap-[7px] rounded-[2px] bg-[#f4f3ef] p-7 font-serif text-[9.5px] leading-[1.55] text-[#1a1a1c] shadow-[0_8px_30px_-12px_rgb(0_0_0/0.5)]">
            <span className="mb-1.5 font-sans text-[11px] font-semibold">4. Generation against forecast</span>
            {LINES.map((w, i) => (
              <span key={i} className="h-[5px] rounded-[1px] bg-[#e2e0da]" style={{ width: `${w}%` }} />
            ))}
            <p className="my-1">
              <span className="hl [--hl:#ecdcb4] [--r:cover_55%_cover_62%]">
                Solar generation exceeded the 380 GWh forecast for the quarter, closing at 412 GWh.
              </span>{" "}
              The variance is concentrated in August.
            </p>
            {LINES_AFTER.map((w, i) => (
              <span key={i} className="h-[5px] rounded-[1px] bg-[#e2e0da]" style={{ width: `${w}%` }} />
            ))}
            <div className="my-2 flex h-[76px] items-end gap-1.5 rounded-[2px] border border-[#e2e0da] p-2">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className={i === 2 ? "flex-1 rounded-[1px] bg-[#1a1a1c]" : "flex-1 rounded-[1px] bg-[#cfcdc6]"}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <span className="h-[5px] w-full rounded-[1px] bg-[#e2e0da]" />
            <span className="mt-auto self-center font-mono text-[9px] text-[#8f8d87]">12</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5 bg-n-1 p-6 sm:p-8 md:bg-n-0">
          <div className="flex flex-col gap-1">
            <span className="text-2xs text-n-7">You asked</span>
            <span className="text-base font-medium text-n-12">Did solar output beat the forecast in Q3?</span>
          </div>
          <div className="prose-answer max-w-[58ch]">
            <p>
              Yes.{" "}
              <span className="hl [--r:cover_38%_cover_46%]">Output reached 412 GWh against a 380 GWh forecast</span>
              <Ref n={1} />, about 8% ahead.
            </p>
            <p>
              The monthly chart shows{" "}
              <span className="hl [--r:cover_44%_cover_50%]">the gap opening in August</span>
              <Ref n={2} />, and the regional table puts{" "}
              <span className="hl [--r:cover_48%_cover_55%]">most of the surplus in the south</span>
              <Ref n={3} />.
            </p>
          </div>
          <div className="border-t border-n-3 pt-3">
            <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-n-7">Sources</p>
            <ol className="flex flex-col gap-px text-xs">
              {[
                ["p.12", "Solar generation exceeded the 380 GWh forecast…", "text"],
                ["fig.4", "Monthly solar output against forecast", "figure"],
                ["tbl.2", "Output by region, GWh", "table"],
              ].map(([loc, text, kind], i) => (
                <li
                  key={loc}
                  className={`flex min-w-0 items-baseline gap-2.5 rounded px-1.5 py-1.5 ${i === 0 ? "bg-accent-soft" : ""}`}
                >
                  <span className="w-3 shrink-0 font-mono text-2xs text-accent">{i + 1}</span>
                  <span className="w-10 shrink-0 font-mono text-2xs text-n-7">{loc}</span>
                  <span className="min-w-0 flex-1 truncate text-n-9">{text}</span>
                  <span className="hidden shrink-0 text-2xs text-n-7 sm:block">{kind}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ref({ n }: { n: number }) {
  return (
    <sup className="ml-px font-mono text-[0.6em] font-medium text-accent">{n}</sup>
  );
}
