import { useEffect, useState } from "react";
import { Project, ProjectStatus } from "@/../types";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { Square, GripHorizontal, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SystemStats } from "@/../types";

export default function GhostApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectState, setProjectState] = useState<
    Record<string, { status: ProjectStatus }>
  >({});

  useEffect(() => {
    // Initial load
    apiClient.onProjectsLoaded(setProjects);
    apiClient.onServerStatusChanged(({ projectId, status }) => {
      setProjectState((prev) => ({
        ...prev,
        [projectId]: { ...prev[projectId], status },
      }));
    });

    // Pull snapshots to avoid race conditions (ghost window may miss initial events)
    (async () => {
      try {
        const [proj, running] = await Promise.all([
          apiClient.getProjects(),
          apiClient.getRunningServersSnapshot(),
        ]);
        setProjects((prev) => (prev.length ? prev : proj));
        setProjectState((prev) => {
          const next = { ...prev };
          Object.entries(running || {}).forEach(([projectId, status]) => {
            next[projectId] = { ...(next[projectId] ?? { status }), status };
          });
          return next;
        });
      } catch {
        // ignore
      }
    })();

    // Trigger initial fetch
    // We assume the main window already loaded them, but we might need to request them if this window opens fresh
    // Actually, ipcRenderer.on 'projects-loaded' triggers when main sends it.
    // We should ask main to send it.
    // For now, let's rely on standard events if we can trigger them.
    // Ideally, we add `apiClient.getProjects()` or similar, but our architecture relies on push from main.
    // Let's add a "ready" event from this window to main?
    // Or just `apiClient.gitSettings()` acts as a ping?
    apiClient.getSettings(); // Just to trigger something if needed, or we add a "ghost:ready" event.
    // But wait, the main process sends 'projects-loaded' on 'did-finish-load'.
    // So it should receive it automatically when the window loads.
  }, []);

  const runningCount = projects.filter(
    (p) => projectState[p.id]?.status === "running",
  ).length;

  const [stats, setStats] = useState<SystemStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await apiClient.getSystemStats();
        if (!cancelled) setStats(next);
      } catch {
        // ignore
      }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const toNumber = (v: any): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (v: number | null | undefined, digits: number) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "—";

  const cpuLoad = toNumber(stats?.cpu?.load) ?? 0;
  const cpuTemp = toNumber(stats?.cpu?.tempC);
  const ramPct = toNumber(stats?.memory?.usedPercent) ?? 0;
  const gpuLoad = toNumber(stats?.gpu?.load);
  const gpuTemp = toNumber(stats?.gpu?.tempC);
  const fanRpm =
    Array.isArray(stats?.fans?.rpm) && stats!.fans!.rpm.length
      ? Math.max(
          ...stats!
            .fans!.rpm.map((x) => toNumber(x))
            .filter(
              (x): x is number => typeof x === "number" && Number.isFinite(x),
            ),
        )
      : null;

  const fanEstimate = (() => {
    // Many Windows devices do not expose fan RPM via WMI/ACPI.
    // If we have temps, we can still provide a useful "fan demand" estimate.
    if (cpuTemp === null && gpuTemp === null) return null;
    const tempMax = Math.max(cpuTemp ?? -Infinity, gpuTemp ?? -Infinity);
    if (!Number.isFinite(tempMax)) return null;
    if (tempMax >= 85) return "HIGH" as const;
    if (tempMax >= 70) return "MED" as const;
    return "LOW" as const;
  })();

  const warnings: string[] = [];
  if (cpuLoad >= 90) warnings.push(`CPU load ${fmt(cpuLoad, 0)}%`);
  if (cpuTemp !== null && cpuTemp >= 90)
    warnings.push(`CPU temp ${fmt(cpuTemp, 0)}°C`);
  if (gpuLoad !== null && gpuLoad >= 90)
    warnings.push(`GPU load ${fmt(gpuLoad, 0)}%`);
  if (gpuTemp !== null && gpuTemp >= 90)
    warnings.push(`GPU temp ${fmt(gpuTemp, 0)}°C`);
  if (ramPct >= 90) warnings.push(`RAM ${fmt(ramPct, 1)}%`);
  if (fanRpm !== null && fanRpm >= 4500)
    warnings.push(`Fan ${fmt(fanRpm, 0)} RPM`);

  const topProc = stats?.topProcess;
  const topCpu = toNumber((topProc as any)?.cpu);
  const topMem = toNumber((topProc as any)?.mem);

  const sensorNote = stats?.sensors?.message;
  const fanNote =
    fanRpm === null && fanEstimate
      ? `Fan est: ${fanEstimate} (RPM not exposed)`
      : "";
  const titleLines = [
    warnings.length ? `Warnings: ${warnings.join(", ")}` : "System OK",
    topProc?.name
      ? `Top: ${topProc.name} (CPU ${fmt(topCpu, 0)}%, MEM ${fmt(topMem, 0)}%)`
      : "",
    fanNote,
    sensorNote ? `Sensors: ${sensorNote}` : "",
  ].filter(Boolean);

  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <div
        className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex items-center gap-3 px-4 py-2 text-white drag select-none"
        title={titleLines.join("\n")}
      >
        {/* Drag Handle */}
        <div className="text-white/20 hover:text-white/50 transition-colors cursor-grab active:cursor-grabbing">
          <GripHorizontal size={16} />
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                warnings.length
                  ? "bg-rose-500 animate-pulse"
                  : runningCount > 0
                    ? "bg-green-500 animate-pulse"
                    : "bg-white/20",
              )}
            />
            <span className="text-xs font-mono font-medium">
              {runningCount} active
            </span>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-tight">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">CPU</span>
              <span
                className={cn(
                  cpuLoad < 40
                    ? "text-emerald-400"
                    : cpuLoad < 75
                      ? "text-yellow-400"
                      : "text-rose-500 animate-pulse",
                )}
              >
                {fmt(cpuLoad, 0)}%
                {cpuTemp !== null ? ` ${fmt(cpuTemp, 0)}°C` : ""}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">GPU</span>
              <span
                className={cn(
                  gpuLoad === null
                    ? "text-white/40"
                    : gpuLoad < 40
                      ? "text-emerald-400"
                      : gpuLoad < 75
                        ? "text-yellow-400"
                        : "text-rose-500 animate-pulse",
                )}
              >
                {gpuLoad === null ? "N/A" : `${fmt(gpuLoad, 0)}%`}
                {gpuTemp !== null ? ` ${fmt(gpuTemp, 0)}°C` : ""}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">RAM</span>
              <span
                className={cn(
                  ramPct < 70
                    ? "text-emerald-400"
                    : ramPct < 90
                      ? "text-yellow-400"
                      : "text-rose-500 animate-pulse",
                )}
              >
                {fmt(ramPct, 1)}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">FAN</span>
              <span
                className={cn(
                  fanRpm !== null
                    ? fanRpm < 3000
                      ? "text-emerald-400"
                      : fanRpm < 4500
                        ? "text-yellow-400"
                        : "text-rose-500 animate-pulse"
                    : fanEstimate === "LOW"
                      ? "text-emerald-400"
                      : fanEstimate === "MED"
                        ? "text-yellow-400"
                        : fanEstimate === "HIGH"
                          ? "text-rose-500 animate-pulse"
                          : "text-white/40",
                )}
              >
                {fanRpm !== null
                  ? `${fmt(fanRpm, 0)} RPM`
                  : fanEstimate
                    ? `${fanEstimate}*`
                    : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Controls */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-white/10 hover:text-red-400 no-drag"
          title="Panic Button (Force Kill Node)"
          onClick={async () => {
            toast.info("Stopping all running servers...");
            try {
              const ok = await apiClient.forceKillNode();
              if (ok) toast.success("Stopped running servers");
              else toast.error("Could not stop all processes");
            } catch (e: any) {
              toast.error(
                String(e?.message ?? e ?? "Failed to stop processes"),
              );
            }
          }}
        >
          <Square size={12} fill="currentColor" />
        </Button>

        <div className="w-px h-4 bg-white/10" />

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-white/10 no-drag"
          onClick={() => apiClient.toggleGhostMode()}
          title="Expand"
        >
          <Maximize2 size={12} />
        </Button>
      </div>
    </div>
  );
}
