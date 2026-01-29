import { useState } from "react";
import {
  Project,
  Group,
  ProjectStatus,
  WorkspaceSettings,
  GitSummary,
} from "@/../types";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectGroup } from "@/components/ProjectGroup";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DependencyGraph } from "@/components/DependencyGraph";
import {
  Plus,
  FolderKanban,
  Settings as SettingsIcon,
  FolderPlus,
} from "lucide-react";

type ProjectsViewProps = {
  projects: Project[];
  groups: Group[];
  projectState: {
    [id: string]: { status: ProjectStatus; logs: string; url?: string };
  };
  gitSummaries: Record<string, GitSummary>;
  settings: WorkspaceSettings;
  onAddProjectClick: () => void;
  onAddGroupClick: () => void;
  onEditProject: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenWorkspace: (workspacePath: string) => void;
  onToggleWorkspaces: (enabled: boolean) => void;
  onSelectWorkspacePath: () => void;
  onGitSummaryChange: (projectId: string, summary: GitSummary) => void;
};

export function ProjectsView({
  projects,
  groups,
  projectState,
  gitSummaries,
  settings,
  onAddProjectClick,
  onAddGroupClick,
  onEditProject,
  onViewLogs,
  onDeleteGroup,
  onOpenWorkspace,
  onToggleWorkspaces,
  onSelectWorkspacePath,
  onGitSummaryChange,
}: ProjectsViewProps) {
  const [dependencyProject, setDependencyProject] = useState<Project | null>(null);

  // Project Filtering Logic
  const ungroupedProjects = projects.filter((p) => !p.groupId);
  const projectsByGroup = groups.reduce(
    (acc, group) => {
      acc[group.id] = projects.filter((p) => p.groupId === group.id);
      return acc;
    },
    {} as { [groupId: string]: Project[] },
  );

  const handleViewDependencies = (project: Project) => {
    setDependencyProject(project);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-end pb-6 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground text-glow">
            Projects
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">
            Manage your local development environment
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Settings Area */}
          <div className="flex items-center space-x-4 bg-card/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5 shadow-sm">
            <div className="flex items-center space-x-2">
              <Switch
                id="manage-workspaces"
                checked={settings.manageWorkspaces}
                onCheckedChange={onToggleWorkspaces}
              />
              <Label
                htmlFor="manage-workspaces"
                className="text-sm text-foreground/80 cursor-pointer"
              >
                Workspace Sync
              </Label>
            </div>
            {settings.manageWorkspaces && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectWorkspacePath}
                className="h-7 px-2 text-muted-foreground hover:text-primary"
              >
                <SettingsIcon size={14} className="mr-1" /> Path
              </Button>
            )}
          </div>
          
          <div className="h-8 w-px bg-white/10 mx-2" />

          <Button onClick={onAddGroupClick} variant="secondary" className="shadow-lg hover:shadow-xl transition-all">
            <FolderPlus className="mr-2" size={16} /> New Group
          </Button>
          <Button onClick={onAddProjectClick} className="shadow-lg hover:shadow-primary/25 hover:shadow-xl transition-all">
            <Plus className="mr-2" size={20} /> Add Project
          </Button>
        </div>
      </header>

      {/* Render Project Groups */}
      <div className="space-y-10">
        {groups.map((group) => (
          <ProjectGroup
            key={group.id}
            group={group}
            projects={projectsByGroup[group.id] || []}
            projectState={projectState}
            gitSummaries={gitSummaries}
            onEditProject={onEditProject}
            onViewLogs={onViewLogs}
            onDeleteGroup={onDeleteGroup}
            onOpenWorkspace={onOpenWorkspace}
            onGitSummaryChange={onGitSummaryChange}
            onViewDependencies={handleViewDependencies}
          />
        ))}

        {/* Render Ungrouped Projects */}
        {ungroupedProjects.length > 0 && (
          <div className="space-y-4">
            {groups.length > 0 && (
              <div className="flex items-center gap-2 pb-2 border-b border-dashed border-white/10">
                 <h2 className="text-xl font-medium text-muted-foreground">Ungrouped</h2>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {ungroupedProjects.map((project) => (
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
                  onViewDependencies={handleViewDependencies}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {projects.length === 0 && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center opacity-80 hover:opacity-100 transition-opacity">
          <div className="bg-white/5 p-6 rounded-full mb-4 ring-1 ring-white/10">
            <FolderKanban size={48} className="text-primary/80" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">No Projects Yet</h2>
          <p className="mt-2 text-muted-foreground max-w-sm">
            Your dashboard is looking a bit empty. Create a project to get started.
          </p>
          <Button onClick={onAddProjectClick} className="mt-6" size="lg">
            <Plus className="mr-2" size={20} /> Create First Project
          </Button>
        </div>
      )}

      <DependencyGraph 
        project={dependencyProject} 
        open={!!dependencyProject} 
        onOpenChange={(open) => !open && setDependencyProject(null)} 
      />
    </div>
  );
}
