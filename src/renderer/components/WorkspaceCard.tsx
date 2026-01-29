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
  // DropdownMenuSeparator, // Removed as not needed now
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import apiClient from "@/lib/apiClient"; // Still using apiClient here

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
      className={`group bg-bg-card p-4 rounded-lg border flex items-center gap-4 transition-all duration-300 hover:border-accent ${
        workspace.isPinned ? "border-yellow-500/50" : "border-border-main"
      }`}
    >
      {/* Pin Indicator */}
      {workspace.isPinned && (
        <Tooltip>
          <TooltipTrigger>
            {" "}
            {/* Removed asChild for simple indicator */}
            <Pin size={14} className="absolute top-2 right-2 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Pinned</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Icon */}
      <div className="bg-bg p-3 rounded-lg flex-shrink-0">
        <Briefcase className="text-accent" size={24} />
      </div>

      {/* Info */}
      <div className="flex-grow overflow-hidden mr-4">
        {/* Display Name + Edit Button on Hover */}
        <div className="flex items-center gap-2 group/name">
          {" "}
          {/* Added group/name */}
          <h2 className="text-lg font-bold text-text-main truncate">
            {displayName}
          </h2>
          {/* Edit Name Button - Visible on Name Hover */}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Use group-hover/name to show on hover */}
              <button
                onClick={() => onEditName(workspace)}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity"
              >
                <Pencil size={14} className="text-text-alt hover:text-accent" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit Display Name</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {/* Folder Count */}
        <p className="text-xs text-gray-500 mt-0.5">
          {workspace.folderCount}{" "}
          {workspace.folderCount === 1 ? "folder" : "folders"}
        </p>
        {/* Path Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-text-alt font-mono select-none truncate cursor-default mt-1">
              {workspace.path}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            <p className="max-w-xs break-words">{workspace.path}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* --- Visible Buttons --- */}
        {/* Remove Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRemove}>
              <Trash2 size={18} className="text-text-alt hover:text-red" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove from list</p>
          </TooltipContent>
        </Tooltip>

        {/* --- Three Dot Menu (Pin, Reveal ONLY) --- */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal size={18} className="text-text-alt" />
                  <span className="sr-only">More Actions</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>More Actions</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            {/* Pin/Unpin Item */}
            <DropdownMenuItem onClick={() => onTogglePin(workspace)}>
              {workspace.isPinned ? (
                <PinOff className="mr-2 h-4 w-4" />
              ) : (
                <Pin className="mr-2 h-4 w-4" />
              )}
              <span>{workspace.isPinned ? "Unpin" : "Pin to top"}</span>
            </DropdownMenuItem>
            {/* Reveal File Item */}
            <DropdownMenuItem onClick={() => onRevealFile(workspace.path)}>
              <FileSearch className="mr-2 h-4 w-4" />
              <span>File Location</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* --- END THREE DOT MENU --- */}

        {/* Primary Action: Open Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleOpen}>
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
