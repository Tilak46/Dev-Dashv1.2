import React, { useState, useMemo } from "react";
import { Workspace } from "@/../types";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Briefcase, Search } from "lucide-react";

type WorkspacesViewProps = {
  workspaces: Workspace[];
  onAddWorkspace: () => void;
  onEditWorkspaceName: (workspace: Workspace) => void;
  onTogglePin: (workspace: Workspace) => void;
  onRevealFile: (workspacePath: string) => void;
  onRemoveWorkspace: (workspaceId: string) => void;
};

export function WorkspacesView({
  workspaces,
  onAddWorkspace,
  onEditWorkspaceName,
  onTogglePin,
  onRevealFile,
  onRemoveWorkspace,
}: WorkspacesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAndSortedWorkspaces = useMemo(() => {
    const filtered = workspaces.filter(
      (ws) =>
        (ws.displayName || ws.name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        ws.path.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground text-glow">
            Workspaces
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light">
             Organize your VS Code workspace collections
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-grow md:flex-grow-0 w-full md:w-72 group">
            <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                size={16}
            />
            <Input
                type="text"
                placeholder="Search workspaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-white/10 focus:border-primary/50 focus:bg-card/80 transition-all rounded-full" 
            />
            </div>
            
            <Button onClick={onAddWorkspace} className="shadow-lg hover:shadow-primary/25 hover:shadow-xl transition-all whitespace-nowrap">
            <Plus className="mr-2" size={18} /> Add File
            </Button>
        </div>
      </header>

      <div className="space-y-4">
        {filteredAndSortedWorkspaces.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredAndSortedWorkspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onEditName={onEditWorkspaceName}
                onTogglePin={onTogglePin}
                onRevealFile={onRevealFile}
                onRemove={onRemoveWorkspace}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center opacity-80 hover:opacity-100 transition-opacity">
            <div className="bg-white/5 p-6 rounded-full mb-4 ring-1 ring-white/10">
              <Briefcase size={48} className="text-primary/70" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {searchTerm ? "No Workspaces Found" : "No Workspaces Added"}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-sm">
              {searchTerm
                ? "Try adjusting your search term."
                : 'Keep your project collections organized. Click "Add File" to import a .code-workspace file.'}
            </p>
            {!searchTerm && (
                <Button onClick={onAddWorkspace} variant="secondary" className="mt-6">
                    Browse Files
                </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
