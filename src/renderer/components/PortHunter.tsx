import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Radar, RefreshCw, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Project } from "@/../types";

interface ProcessInfo {
  projectId: string;
  projectName: string;
  pid: number;
  port: number;
}

interface PortHunterProps {
  projects: Project[];
}

export function PortHunter({ projects }: PortHunterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);

  const fetchPorts = async () => {
    setLoading(true);
    try {
      const rows = await window.api.getRunningProjectPorts();
      const flat: ProcessInfo[] = [];
      rows.forEach((r) => {
        const pid = typeof r.rootPid === "number" ? r.rootPid : 0;
        (r.ports || []).forEach((port: number) => {
          flat.push({
            projectId: r.projectId,
            projectName: r.projectName,
            pid,
            port,
          });
        });
      });
      // Sort by port then name
      flat.sort(
        (a, b) => a.port - b.port || a.projectName.localeCompare(b.projectName),
      );
      setProcesses(flat);
    } catch (error) {
      console.error("Failed to fetch project ports", error);
      toast.error("Scan Failed", {
        description: "Could not detect project ports.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPorts();
      // Poll while open so the list stays accurate.
      const interval = setInterval(fetchPorts, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const stopProject = async (projectId: string, port: number) => {
    try {
      const ok = await window.api.stopRunningProject(projectId);
      if (!ok) throw new Error("stop failed");
      toast.success("Stopped", {
        description: `Stopped DevDash project on port ${port}.`,
      });
      fetchPorts();
    } catch {
      toast.error("Stop Failed", {
        description: "Could not stop that project.",
      });
    }
  };

  const nukeNode = async () => {
    try {
      const ok = await window.api.stopAllRunningProjects();
      if (ok)
        toast.warning("Stopped", {
          description: "Stopped all running DevDash projects.",
        });
      else
        toast.error("Partial Stop", {
          description: "Some projects could not be stopped.",
        });
    } finally {
      fetchPorts();
    }
  };

  const hasConflicts = processes.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative hover:bg-white/5",
            hasConflicts && "text-amber-400",
          )}
          title="Port Hunter"
        >
          <Radar size={18} className={cn(hasConflicts && "animate-pulse")} />
          {hasConflicts && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-[#0A0A0A] border-l border-white/10 text-foreground flex flex-col h-full shadow-2xl p-0">
        <SheetHeader className="px-6 py-5 border-b border-white/5 bg-black/20 flex flex-row items-center justify-between">
          <div>
            <SheetTitle className="flex items-center gap-2 text-xl font-medium tracking-tight text-white/90">
              <Radar className="text-emerald-500" size={20} />
              Port Hunter
            </SheetTitle>
            <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-wider">
              Active Conflicts Monitor
            </p>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {loading && processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/50 gap-3 animate-pulse">
              <Radar size={32} className="opacity-50" />
              <span className="text-sm">Scanning frequencies...</span>
            </div>
          ) : processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground/40 gap-4 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
              <ShieldAlert size={40} className="text-emerald-500/50" />
              <div className="text-center">
                <p className="text-sm font-medium text-white/60">
                  No Active Project Ports
                </p>
                <p className="text-xs mt-1">
                  Start a project server and rescan.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {processes.map((proc) => (
                <div
                  key={`${proc.pid}-${proc.port}`}
                  className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
                      {proc.port}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white/90 text-sm">
                          {proc.projectName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1 py-0 border-white/10 bg-white/5 text-muted-foreground"
                        >
                          PID: {proc.pid}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => stopProject(proc.projectId, proc.port)}
                    title="Stop Project"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-muted-foreground"
            onClick={fetchPorts}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={cn("mr-2", loading && "animate-spin")}
            />
            Rescan
          </Button>
          <Button
            variant="destructive"
            className="flex-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/30 text-rose-200"
            onClick={nukeNode}
          >
            <Trash2 size={14} className="mr-2" />
            Nuke Node.js
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
