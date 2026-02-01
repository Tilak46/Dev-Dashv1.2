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
  Pencil,
  Code2,
  Terminal,
  Cloud,
  Database,
  Server,
  Smartphone,
  Briefcase,
  Coffee,
  Music,
  Rocket,
  Gamepad2,
  Bug,
  Cpu,
  Zap,
  Palette,
} from "lucide-react";

import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface AppWorkspaceCardProps {
  workspace: AppWorkspace;
  projects: Project[]; // To lookup project names
  onLaunch: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (workspace: AppWorkspace) => void;
  createProjectsLookup?: any;
}

export function AppWorkspaceCard({
  workspace,
  createProjectsLookup,
  onLaunch,
  onDelete,
  onEdit,
}: AppWorkspaceCardProps) {
  const projectCount = workspace.projectIds?.length || 0;
  const workspaceFileCount = workspace.vsCodeWorkspaceIds?.length || 0;
  const browserCount = workspace.browsers?.length || 0;
  const appCount = workspace.apps?.length || 0;

  const launchCount = projectCount + workspaceFileCount + browserCount + appCount;

  // Helper to render icon
  const renderIcon = (iconStr: string) => {
      if (iconStr?.startsWith("lucide:")) {
          const name = iconStr.split(":")[1];
          switch (name) {
              case "code": return <Code2 size={24} className="text-blue-400"/>;
              case "terminal": return <Terminal size={24} className="text-emerald-400"/>;
              case "cloud": return <Cloud size={24} className="text-sky-400"/>;
              case "database": return <Database size={24} className="text-amber-400"/>;
              case "server": return <Server size={24} className="text-violet-400"/>;
              case "smartphone": return <Smartphone size={24} className="text-pink-400"/>;
              case "briefcase": return <Briefcase size={24} className="text-orange-400"/>;
              case "coffee": return <Coffee size={24} className="text-amber-700"/>;
              case "music": return <Music size={24} className="text-fuchsia-400"/>;
              default: return <Code2 size={24}/>;
          }
      }
      return <span className="text-2xl">{iconStr || "🚀"}</span>;
  }

  return (
    <div className="group relative flex flex-col h-full bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-primary/20 hover:-translate-y-1 border-white/5">
      
      {/* Mesh Gradient Background Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute -top-[100px] -right-[100px] w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute -bottom-[100px] -left-[100px] w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative p-5 flex flex-col gap-4 flex-1">
        <div className="flex justify-between items-start">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 shadow-inner group-hover:bg-white/10 transition-colors">
            {renderIcon(workspace.icon)}
          </div>
          <Badge
            variant="outline"
            className="bg-white/5 border-white/10 text-xs font-mono"
          >
            Running
          </Badge>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {workspace.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {workspace.description || "Automated Workflow"}
          </p>
        </div>
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
           onClick={() => onEdit(workspace)}
           variant="ghost"
           size="icon"
           className="text-muted-foreground hover:text-white hover:bg-white/10"
           title="Edit"
        >
            <Pencil size={16} />
        </Button>
        <Button
          onClick={() => onDelete(workspace.id)}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          title="Delete"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
