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
import {
  Plus,
  FolderKanban,
  Settings as SettingsIcon,
  FolderPlus,
} from "lucide-react"; // Renamed Settings import

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
  // Project Filtering Logic
  const ungroupedProjects = projects.filter((p) => !p.groupId);
  const projectsByGroup = groups.reduce(
    (acc, group) => {
      acc[group.id] = projects.filter((p) => p.groupId === group.id);
      return acc;
    },
    {} as { [groupId: string]: Project[] },
  );

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-400">
            Manage and run your local development servers.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Settings Area */}
          <div className="flex items-center space-x-2 bg-bg-card p-3 rounded-lg border border-border-main">
            <Switch
              id="manage-workspaces"
              checked={settings.manageWorkspaces}
              onCheckedChange={onToggleWorkspaces}
            />
            <Label
              htmlFor="manage-workspaces"
              className="text-sm text-text-alt whitespace-nowrap"
            >
              Link Groups to VS Code Workspaces
            </Label>
            {settings.manageWorkspaces && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectWorkspacePath}
                className="ml-2"
              >
                <SettingsIcon size={14} className="mr-1" /> Path
              </Button>
            )}
          </div>
          <Button onClick={onAddGroupClick} variant="outline">
            <FolderPlus className="mr-2" size={16} /> New Group
          </Button>
          <Button onClick={onAddProjectClick}>
            <Plus className="mr-2" size={20} /> Add Project
          </Button>
        </div>
      </header>

      {/* Render Project Groups */}
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
        />
      ))}

      {/* Render Ungrouped Projects */}
      {ungroupedProjects.length > 0 && (
        <div className="mb-6 mt-10">
          <div className="flex justify-between items-center p-3 bg-bg-card rounded-t-lg border border-border-main">
            <h2 className="text-xl font-semibold text-gray-400">Ungrouped</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 border border-t-0 border-border-main rounded-b-lg">
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State (Only if absolutely NO projects exist) */}
      {projects.length === 0 && groups.length === 0 && (
        <div className="text-center bg-transparent mt-16 flex flex-col items-center col-span-full">
          <FolderKanban size={64} className="text-border-main mb-4" />
          <h2 className="text-2xl font-semibold text-white">No Projects Yet</h2>
          <p className="mt-2 text-gray-400">
            Click "Add Project" to get started.
          </p>
        </div>
      )}
    </div>
  );
}
