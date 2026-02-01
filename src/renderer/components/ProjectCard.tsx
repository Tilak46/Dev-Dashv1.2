import { useMemo, useState } from "react";
import { Project, ProjectStatus } from "../../types";
import {
  Folder,
  Play,
  Square,
  Terminal,
  ExternalLink,
  RotateCw,
  Pencil,
  Code,
  Loader2,
  GitBranch,
  Trash2,
  Package,
} from "lucide-react";
import type { GitSummary } from "@/../types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitActionSheet } from "@/components/GitActionSheet";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project & { status: ProjectStatus };
  url?: string;
  logs: string;
  gitSummary?: GitSummary;
  onGitSummaryChange?: (projectId: string, summary: GitSummary) => void;
  onEdit: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onViewDependencies?: (project: Project) => void; // Added prop
};

export function ProjectCard({
  project,
  url,
  logs: _logs,
  gitSummary,
  onGitSummaryChange,
  onEdit,
  onViewLogs,
  onViewDependencies, // Destructure
}: ProjectCardProps) {
  const [isGitSheetOpen, setIsGitSheetOpen] = useState(false);

  // --- Handlers ---
  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (url) {
      apiClient.openExternal(url);
      toast.message("Opened URL", { description: url });
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove "${project.name}"?`)) {
      apiClient.removeProject(project.id);
      toast.success("Project removed", { description: project.name });
    }
  };

  const handleToggleServer = () => {
    apiClient.toggleServer(project);
    const nextAction = project.status === "running" ? "Stopping" : "Starting";
    toast.message(`${nextAction} server`, { description: project.name });
  };
  const handleRestart = () => {
    apiClient.restartProject(project);
    toast.message("Restarting", { description: project.name });
  };

  const handleOpenVSCode = () => {
    apiClient.openVSCode(project.path);
    toast.message("Opened VS Code", { description: project.name });
  };

  const isRunning = project.status === "running";
  const isTransitioning =
    project.status === "starting" || project.status === "stopping";

  const gitBadgeText = useMemo(() => {
    const branch = gitSummary?.isRepo
      ? gitSummary.branch || "(unknown)"
      : "Git";
    const count = gitSummary?.changeCount ?? 0;
    return `${branch} ${count > 0 ? `+${count}` : ""}`;
  }, [gitSummary]);

  return (
    <div
      className={cn(
        "group relative flex flex-col h-64 rounded-xl transition-all duration-300",
        "bg-card/40 backdrop-blur-md border border-white/5 shadow-lg",
        "hover:shadow-[0_0_30px_rgba(192,132,252,0.1)] hover:border-primary/30 hover:-translate-y-1",
        isRunning && "ring-1 ring-primary/20 bg-card/60"
      )}
    >
      {/* Visual Status Indicator Line */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-xl transition-all duration-500",
          isRunning ? "bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_var(--primary)]" : "bg-transparent"
        )} 
      />

      {/* Card Header */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl transition-colors duration-300",
            isRunning ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground"
          )}>
            <Folder size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              {project.name}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-500",
                  isRunning ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" : 
                  isTransitioning ? "bg-amber-400 animate-pulse" : "bg-slate-600"
                )}
              />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {project.status}
              </span>

              {/* Git Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGitSheetOpen(true);
                }}
                className={cn(
                  "ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono transition-colors",
                   gitSummary?.isRepo 
                    ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10" 
                    : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
                aria-label="Open Git actions"
              >
                <GitBranch size={10} />
                {gitBadgeText}
              </button>
            </div>
          </div>
        </div>
      </div>

      <GitActionSheet
        open={isGitSheetOpen}
        onOpenChange={setIsGitSheetOpen}
        project={project}
        summary={gitSummary}
        onSummaryChange={onGitSummaryChange}
      />

      {/* Card Body */}
      <div className="px-5 pb-4 flex-grow">
        <p className="text-xs text-muted-foreground/60 font-mono select-none break-all line-clamp-2 hover:line-clamp-none transition-all">
          {project.path}
        </p>
        
        {isRunning && url && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <a
              href={url}
              onClick={handleLinkClick}
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-foreground transition-colors group/link"
            >
              <ExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" /> 
              <span className="font-medium underline decoration-accent/30 underline-offset-4 group-hover/link:decoration-accent/100 transition-all">{url}</span>
            </a>
          </div>
        )}
      </div>

      {/* Card Footer (Action Buttons) */}
      <div className="p-2 mx-2 mb-2 bg-black/20 backdrop-blur-sm rounded-lg border border-white/5 flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
        {/* Quick Actions */}
        <div className="flex gap-1">
           <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpenVSCode}
                className="p-2 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <Code size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Open in VS Code</p></TooltipContent>
          </Tooltip>
          
           <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewLogs(project)}
                className="p-2 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <Terminal size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>View Logs</p></TooltipContent>
          </Tooltip>
          
           <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewDependencies?.(project)}
                className="p-2 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <Package size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Dependencies</p></TooltipContent>
          </Tooltip>
        </div>

        {/* Main Controls */}        <div className="flex gap-2">
           <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onEdit(project)}
                className="p-2 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                aria-label="Edit project"
              >
                <Pencil size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Edit Project</p></TooltipContent>
          </Tooltip>

           <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDelete}
                className="p-2 rounded-md text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                aria-label="Delete project"
              >
                <Trash2 size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Delete Project</p></TooltipContent>
          </Tooltip>

          {(isRunning || isTransitioning) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRestart}
                  disabled={isTransitioning}
                  className="p-2 rounded-md text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 disabled:opacity-50 transition-colors"
                >
                  <RotateCw size={16} className={isTransitioning ? "animate-spin" : ""} />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Restart</p></TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleToggleServer}
                disabled={isTransitioning}
                className={cn(
                  "p-2 rounded-md text-white transition-all shadow-lg active:scale-95 disabled:opacity-50",
                  isRunning 
                    ? "bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/20" 
                    : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20"
                )}
              >
                {isTransitioning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isRunning ? (
                  <Square size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRunning ? "Stop Server" : "Start Server"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
