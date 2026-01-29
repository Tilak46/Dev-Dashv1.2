import { Workspace } from "@/../types";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Trash2,
  ExternalLink,
  Pencil,
  Pin,
  PinOff,
  FileSearch,
  MoreHorizontal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type WorkspaceCardProps = {
  workspace: Workspace;
  onEditName: (workspace: Workspace) => void;
  onTogglePin: (workspace: Workspace) => void;
  onRevealFile: (workspacePath: string) => void;
  onRemove: (workspaceId: string) => void;
};

export function WorkspaceCard({
  workspace,
  onEditName,
  onTogglePin,
  onRevealFile,
  onRemove,
}: WorkspaceCardProps) {
  const handleOpen = () => {
    apiClient.openWorkspace(workspace.path);
  };

  const handleRemove = () => {
    onRemove(workspace.id);
  };

  const displayName = workspace.displayName || workspace.name;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
        "bg-card/40 backdrop-blur-md border border-white/5 shadow-md",
        "hover:shadow-[0_0_20px_rgba(192,132,252,0.1)] hover:border-primary/30 hover:-translate-y-0.5",
        workspace.isPinned && "border-primary/30 bg-card/60 ring-1 ring-primary/10"
      )}
    >
      {/* Pin Indicator */}
      {workspace.isPinned && (
        <Tooltip>
          <TooltipTrigger>
            <Pin size={14} className="absolute top-2 right-2 text-primary rotate-45" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Pinned</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Icon */}
      <div className={cn(
          "p-3 rounded-xl transition-colors duration-300",
          workspace.isPinned ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground"
      )}>
        <Briefcase size={24} />
      </div>

      {/* Info */}
      <div className="flex-grow overflow-hidden mr-4">
        {/* Display Name + Edit Button on Hover */}
        <div className="flex items-center gap-2 group/name">
          <h2 className="text-lg font-bold text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
            {displayName}
          </h2>
          {/* Edit Name Button - Visible on Name Hover */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onEditName(workspace)}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-md"
              >
                <Pencil size={12} className="text-muted-foreground hover:text-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit Display Name</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {/* Folder Count */}
        <p className="text-xs text-muted-foreground mt-0.5">
          {workspace.folderCount}{" "}
          {workspace.folderCount === 1 ? "folder" : "folders"}
        </p>
        
        {/* Path Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground/50 font-mono select-none truncate cursor-default mt-1 max-w-[300px]">
              {workspace.path}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            <p className="max-w-xs break-words">{workspace.path}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        {/* Remove Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRemove}
                className="h-9 w-9 hover:bg-destructive/20 hover:text-destructive transition-colors"
            >
              <Trash2 size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove from list</p>
          </TooltipContent>
        </Tooltip>

        {/* More Menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10">
                  <MoreHorizontal size={18} />
                  <span className="sr-only">More Actions</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>More Actions</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur border-white/10">
            <DropdownMenuItem onClick={() => onTogglePin(workspace)}>
              {workspace.isPinned ? (
                <PinOff className="mr-2 h-4 w-4" />
              ) : (
                <Pin className="mr-2 h-4 w-4" />
              )}
              <span>{workspace.isPinned ? "Unpin" : "Pin to top"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRevealFile(workspace.path)}>
              <FileSearch className="mr-2 h-4 w-4" />
              <span>File Location</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary Action: Open Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleOpen} className="shadow-lg hover:shadow-primary/25 transition-all">
              <ExternalLink size={16} className="mr-2" /> Open
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open in VS Code</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
