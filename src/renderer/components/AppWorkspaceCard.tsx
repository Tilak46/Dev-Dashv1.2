import { AppWorkspace, Project } from "@/../types";
import { Button } from "./ui/button";
import {
  Play,
  Globe,
  Settings2,
  Trash2,
  Layers,
  Monitor,
  FileCode,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface AppWorkspaceCardProps {
  workspace: AppWorkspace;
  projects: Project[]; // To lookup project names
  onLaunch: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AppWorkspaceCard({
  workspace,
  createProjectsLookup,
  onLaunch,
  onDelete,
}: AppWorkspaceCardProps & { createProjectsLookup?: any }) {
  // Note: projects passed might be all projects, we filter relevant ones
  // But for now let's just use the IDs to count

  // Fallback icons logic
  const projectCount = workspace.projectIds ? workspace.projectIds.length : 0;
  const workspaceFileCount = workspace.vsCodeWorkspaceIds
    ? workspace.vsCodeWorkspaceIds.length
    : 0;
  const browserCount = workspace.browsers ? workspace.browsers.length : 0;
  const appCount = workspace.apps ? workspace.apps.length : 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.1)] flex flex-col">
      {/* Decorative Background Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative p-5 flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {workspace.icon ? (
              <span className="text-2xl">{workspace.icon}</span>
            ) : (
              <Layers className="text-primary" />
            )}
            {workspace.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {workspace.description || "Automated Workflow"}
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-white/5 border-white/10 text-xs font-mono"
        >
          Running
        </Badge>
      </div>

      <div className="relative px-5 py-2 space-y-4 flex-grow">
        {/* The Stack Visualization */}
        <div className="flex gap-2 items-center text-sm font-medium">
          {/* VS Code Projects */}
          {projectCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5"
              title="Projects"
            >
              <Monitor size={14} className="text-blue-400" />
              <span className="text-white/80">{projectCount}</span>
            </div>
          )}
          {/* VS Code Workspace Files */}
          {workspaceFileCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5"
              title="Workspace Files"
            >
              <FileCode size={14} className="text-violet-300" />
              <span className="text-white/80">{workspaceFileCount}</span>
            </div>
          )}
          {/* Browsers */}
          {browserCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5"
              title="Browser Tabs"
            >
              <Globe size={14} className="text-orange-400" />
              <span className="text-white/80">{browserCount}</span>
            </div>
          )}
          {/* Apps */}
          {appCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5"
              title="Apps"
            >
              <Settings2 size={14} className="text-emerald-400" />
              <span className="text-white/80">{appCount}</span>
            </div>
          )}
          {projectCount === 0 &&
            workspaceFileCount === 0 &&
            browserCount === 0 &&
            appCount === 0 && (
              <span className="text-muted-foreground text-xs italic">
                Empty workspace
              </span>
            )}
        </div>
      </div>

      <div className="relative p-4 gap-2 flex items-center mt-auto border-t border-white/5 bg-white/5">
        <Button
          onClick={() => onLaunch(workspace.id)}
          className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold tracking-wide shadow-none border border-white/5"
        >
          <Play className="mr-2 fill-current" size={14} />
          LAUNCH
        </Button>
        <Button
          onClick={() => onDelete(workspace.id)}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
