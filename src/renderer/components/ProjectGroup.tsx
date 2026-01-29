import React, { useState } from "react";
import { Group, Project, ProjectStatus, GitSummary } from "@/../types";
import { ProjectCard } from "./ProjectCard";
import { ChevronDown, ChevronRight, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Removed dnd-kit imports

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
}: ProjectGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Removed droppable hooks and styles

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
    <div className="mb-6">
      {/* Header - Removed dnd-kit props */}
      <div
        className="flex justify-between items-center p-3 bg-bg-card rounded-t-lg border border-border-main cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          <h2 className="text-xl font-semibold text-white">{group.name}</h2>
          <span className="text-sm text-gray-400">({projects.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {group.workspacePath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenWorkspaceClick}
                >
                  <FolderOpen
                    size={18}
                    className="text-accent hover:text-accent-hover"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Workspace in VS Code</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
                <Trash2 size={18} className="text-text-alt hover:text-red" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete Group</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {!isCollapsed && (
        // Content Area - Removed SortableContext
        <div
          className={`border border-t-0 border-border-main rounded-b-lg ${
            projects.length === 0
              ? "min-h-[100px] flex items-center justify-center p-4"
              : "p-4"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length > 0 ? (
              projects.map((project) => (
                <ProjectCard
                  key={project.id} // Key remains important
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
                />
              ))
            ) : (
              <p className="text-gray-500 italic text-center col-span-full">
                No projects in this group yet. Use the 'Organize' button in the
                sidebar to move projects here.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
