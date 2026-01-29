import React, { useState, useMemo } from "react"; // Import useState, useMemo
import { Workspace } from "@/../types";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import { Plus, Briefcase, Search } from "lucide-react"; // Import Search

type WorkspacesViewProps = {
  workspaces: Workspace[];
  onAddWorkspace: () => void;
  // Add handlers needed by WorkspaceCard
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

  // Filter and sort workspaces
  const filteredAndSortedWorkspaces = useMemo(() => {
    const filtered = workspaces.filter(
      (ws) =>
        (ws.displayName || ws.name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        ws.path.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort: Pinned first (alphabetically), then unpinned (alphabetically)
    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1; // Pinned items come first
      }
      // If pinning status is the same, sort alphabetically by display name or name
      const nameA = (a.displayName || a.name).toLowerCase();
      const nameB = (b.displayName || b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [workspaces, searchTerm]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">VS Code Workspaces</h1>
          <p className="text-sm text-gray-400">
            Manage your saved workspace files.
          </p>
        </div>
        {/* Search Bar */}
        <div className="relative flex-grow max-w-md">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            type="text"
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-bg border-border-main text-text-main" // Adjusted padding
          />
        </div>
        <Button onClick={onAddWorkspace}>
          <Plus className="mr-2" size={20} /> Add Workspace File
        </Button>
      </header>
      <div className="grid grid-cols-1 gap-4">
        {filteredAndSortedWorkspaces.length > 0 ? (
          filteredAndSortedWorkspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onEditName={onEditWorkspaceName} // Pass handler
              onTogglePin={onTogglePin} // Pass handler
              onRevealFile={onRevealFile} // Pass handler
              onRemove={onRemoveWorkspace} // Pass handler
            />
          ))
        ) : (
          <div className="text-center bg-transparent mt-16 flex flex-col items-center col-span-full">
            <Briefcase size={64} className="text-border-main mb-4" />
            <h2 className="text-2xl font-semibold text-white">
              {searchTerm ? "No Workspaces Found" : "No Workspaces Added"}
            </h2>
            <p className="mt-2 text-gray-400">
              {searchTerm
                ? "Try adjusting your search term."
                : 'Click "Add Workspace File" to select a `.code-workspace` file.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
