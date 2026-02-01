import React, { useState } from "react";
import { Group, Project, ProjectStatus, GitSummary } from "@/../types";
import { ProjectCard } from "./ProjectCard";
import { ChevronDown, ChevronRight, FolderOpen, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ProjectGroupProps = {
  group: Group;
  projects: Project[];
  projectState: {
    [id: string]: { status: ProjectStatus; logs: string; url?: string };
  };
  gitSummaries: Record<string, GitSummary>;
  onGitSummaryChange: (projectId: string, summary: GitSummary) => void;
  onEditProject: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenWorkspace: (workspacePath: string) => void;
  onViewDependencies?: (project: Project) => void;
};

export function ProjectGroup({
  group,
  projects,
  projectState,
  gitSummaries,
  onGitSummaryChange,
  onEditProject,
  onViewLogs,
  onDeleteGroup,
  onOpenWorkspace,
  onViewDependencies,
}: ProjectGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete the group "${group.name}"? Projects within will become ungrouped.`,
      )
    ) {
      onDeleteGroup(group.id);
    }
  };

  const handleOpenWorkspaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (group.workspacePath) {
      onOpenWorkspace(group.workspacePath);
    }
  };

  return (
    <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div
        className={cn(
           "group/header flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all duration-300",
           "bg-card/30 backdrop-blur-md border border-white/5",
           "hover:bg-card/50 hover:border-primary/20 hover:shadow-lg",
           !isCollapsed && "rounded-b-none border-b-0"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary transition-transform group-hover/header:rotate-90 duration-300">
             {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent group-hover/header:text-foreground transition-all">
                {group.name}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-muted-foreground border border-white/5 group-hover/header:bg-primary/20 group-hover/header:text-primary transition-colors">
                {projects.length}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-60 group-hover/header:opacity-100 transition-opacity">
          {group.workspacePath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors"
                  onClick={handleOpenWorkspaceClick}
                >
                  <FolderOpen size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Workspace</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive transition-colors"
                onClick={handleDeleteClick}
              >
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete Group</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {/* Content Area */}
      <div
        className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"
        )}
      >
        <div
          className={cn(
             "p-6 border border-t-0 border-white/5 bg-card/10 backdrop-blur-sm rounded-b-xl",
             projects.length === 0 && "py-12 flex flex-col items-center justify-center text-center"
          )}
        >
          {projects.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={{
                    ...project,
                    status: projectState[project.id]?.status || "stopped",
                  }}
                  url={projectState[project.id]?.url}
                  logs={projectState[project.id]?.logs || ""}
                  gitSummary={gitSummaries[project.id]}
                  onGitSummaryChange={onGitSummaryChange}
                  onEdit={onEditProject}
                  onViewLogs={onViewLogs}
                  onViewDependencies={onViewDependencies}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground animate-in fade-in zoom-in-95">
                <div className="p-4 rounded-full bg-white/5 mb-3">
                    <Folder size={32} className="opacity-50" />
                </div>
              <p className="italic">
                No projects in this group.
              </p>
              <p className="text-sm mt-1 opacity-70">
                  Drag & drop or use 'Organize' to move projects here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
