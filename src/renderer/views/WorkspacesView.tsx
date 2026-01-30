import { useState, useMemo } from "react"; // Add useState
import { AppWorkspace, Project, Workspace } from "@/../types"; // Import new types
import { AppWorkspaceCard } from "@/components/AppWorkspaceCard";
import { WorkspaceCard } from "@/components/WorkspaceCard"; // Missing import added
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Briefcase, Search, Layers, FileCode } from "lucide-react"; // Added Icons
import { cn } from "@/lib/utils";

type WorkspacesViewProps = {
  workspaces: Workspace[];
  appWorkspaces: AppWorkspace[]; // New prop
  projects: Project[]; // To pass to cards
  onAddWorkspace: () => void;
  onNewAutomation: () => void;
  onLaunchAppWorkspace: (id: string) => void;
  onDeleteAppWorkspace: (id: string) => void;
  onEditWorkspaceName: (workspace: Workspace) => void;
  onTogglePin: (workspace: Workspace) => void;
  onRevealFile: (workspacePath: string) => void;
  onRemoveWorkspace: (workspaceId: string) => void;
};

export function WorkspacesView({
  workspaces,
  appWorkspaces, // Destructure
  projects,
  onAddWorkspace,
  onNewAutomation,
  onLaunchAppWorkspace,
  onDeleteAppWorkspace,
  onEditWorkspaceName,
  onTogglePin,
  onRevealFile,
  onRemoveWorkspace,
}: WorkspacesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"automation" | "files">(
    "automation",
  );

  const filteredAndSortedWorkspaces = useMemo(() => {
    const filtered = workspaces.filter(
      (ws) =>
        (ws.displayName || ws.name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        ws.path.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      const nameA = (a.displayName || a.name).toLowerCase();
      const nameB = (b.displayName || b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [workspaces, searchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground text-glow">
            Workspaces
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">
            Launch your entire stack in one click
          </p>
        </div>
        <div>
          {/* TODO: Add Wizard Button */}
          <Button
            onClick={onNewAutomation}
            variant="default"
            className="shadow-lg hover:shadow-primary/25"
          >
            <Plus className="mr-2" size={18} /> New Automation
          </Button>
        </div>
      </header>

      <div className="flex space-x-1 rounded-lg bg-white/5 p-1 border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("automation")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === "automation"
              ? "bg-primary/20 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
          )}
        >
          <Layers size={14} />
          Automation (God Mode)
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === "files"
              ? "bg-primary/20 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
          )}
        >
          <FileCode size={14} />
          VS Code Files
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "automation" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {appWorkspaces && appWorkspaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appWorkspaces.map((ws) => (
                  <AppWorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    projects={projects}
                    onLaunch={onLaunchAppWorkspace}
                    onDelete={onDeleteAppWorkspace}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Layers size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-medium">No Automations Yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  Create a "God Mode" workspace to launch VS Code, Browsers, and
                  Apps instantly.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-4 mb-4 justify-end">
              <div className="relative w-72">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <Input
                  type="text"
                  placeholder="Search workspace files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-card/50 border-white/10 rounded-full text-sm"
                />
              </div>
              <Button
                onClick={onAddWorkspace}
                variant="secondary"
                size="sm"
                className="h-9"
              >
                <Plus className="mr-2" size={14} /> Import File
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredAndSortedWorkspaces.length > 0 ? (
                filteredAndSortedWorkspaces.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    onEditName={onEditWorkspaceName}
                    onTogglePin={onTogglePin}
                    onRevealFile={onRevealFile}
                    onRemove={onRemoveWorkspace}
                  />
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No file workspaces found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
