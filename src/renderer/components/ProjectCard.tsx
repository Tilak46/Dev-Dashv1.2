import { useMemo, useState } from "react";
import { Project, ProjectStatus } from "../../types";
import {
  Folder,
  Play,
  Square,
  Trash2,
  Terminal,
  ExternalLink,
  RotateCw,
  Pencil,
  Code,
  Loader2,
} from "lucide-react";
import type { GitSummary } from "@/../types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { GitActionSheet } from "@/components/GitActionSheet";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";

type ProjectCardProps = {
  project: Project & { status: ProjectStatus };
  url?: string;
  logs: string;
  gitSummary?: GitSummary;
  onGitSummaryChange?: (projectId: string, summary: GitSummary) => void;
  onEdit: (project: Project) => void;
  onViewLogs: (project: Project) => void;
};

export function ProjectCard({
  project,
  url,
  logs: _logs,
  gitSummary,
  onGitSummaryChange,
  onEdit,
  onViewLogs,
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
  const handleOpenFolder = () => {
    apiClient.openPath(project.path);
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
    return `${branch} ${count > 0 ? `[+${count}]` : "[0]"}`;
  }, [gitSummary]);

  // Note: Removed dnd-kit related props and styles

  return (
    <div
      className={`group bg-bg-card rounded-lg border border-border-main transition-all duration-300 hover:border-accent flex flex-col h-64`}
      // Add cursor: grab for visual cue, even without dnd-kit on this component
      style={{ cursor: "pointer" }}
    >
      {/* Card Header */}
      <div className="p-4 flex items-center gap-4">
        <div className="bg-bg p-3 rounded-lg">
          <Folder className="text-accent" size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-main">{project.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isRunning
                  ? "bg-green animate-pulse"
                  : isTransitioning
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-gray-500"
              }`}
            />
            <span className="text-xs text-text-alt font-mono select-none truncate capitalize">
              {project.status}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsGitSheetOpen(true);
              }}
              className="ml-2"
              aria-label="Open Git actions"
            >
              <Badge
                variant={gitSummary?.isRepo ? "secondary" : "outline"}
                className="font-mono text-[11px] px-2 py-0.5 border-border-main bg-bg hover:bg-bg-hover text-text-main"
              >
                {gitBadgeText}
              </Badge>
            </button>
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
      <div className="px-4 pb-4 flex-grow">
        <p className="text-xs text-text-alt font-mono select-none break-all">
          {project.path}
        </p>
        {isRunning && url && (
          <div className="mt-2">
            <a
              href={url}
              onClick={handleLinkClick}
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <ExternalLink size={14} /> <span>{url}</span>
            </a>
          </div>
        )}
      </div>

      {/* Card Footer (Action Buttons with Tooltips) */}
      <div className="flex flex-col">
        {/* LogViewer component is removed from here */}
        <div className="p-2 bg-bg-darker rounded-b-lg border-t border-border-main flex items-center justify-between gap-1">
          {/* Quick Actions (visible on hover) */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenFolder}
                  className="p-2 rounded-md text-text-main bg-border-main hover:bg-bg-hover"
                >
                  <Folder size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Folder</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenVSCode}
                  className="p-2 rounded-md text-text-main bg-border-main hover:bg-bg-hover"
                >
                  <Code size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open in VS Code</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onEdit(project)}
                  className="p-2 rounded-md text-text-main bg-border-main hover:bg-bg-hover"
                >
                  <Pencil size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Project</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Main Controls (always visible) */}
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onViewLogs(project)}
                  className="p-2 rounded-md text-text-main bg-border-main hover:bg-bg-hover"
                >
                  <Terminal size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Logs</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-md text-text-main bg-border-main hover:bg-red hover:text-white transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Project</p>
              </TooltipContent>
            </Tooltip>

            {(isRunning || isTransitioning) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRestart}
                    disabled={isTransitioning}
                    className="p-2 rounded-md text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isTransitioning ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RotateCw size={16} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restart Server</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleServer}
                  disabled={isTransitioning}
                  className={`p-2 rounded-md text-white transition-colors disabled:opacity-50 ${
                    isRunning
                      ? "bg-red hover:bg-opacity-80"
                      : "bg-green hover:bg-opacity-80"
                  }`}
                >
                  {isTransitioning ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isRunning ? (
                    <Square size={16} />
                  ) : (
                    <Play size={16} />
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
    </div>
  );
}
