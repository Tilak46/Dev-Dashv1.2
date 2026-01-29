import { useState, useEffect } from "react";
import { Workspace } from "@/../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type ModalProps = {
  workspace: Workspace | null;
  onClose: () => void;
  onSave: (workspaceId: string, newDisplayName: string | null) => void;
};

export function EditWorkspaceNameModal({
  workspace,
  onClose,
  onSave,
}: ModalProps) {
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    // Set initial value when modal opens (use displayName if exists, otherwise original name)
    if (workspace) {
      setDisplayName(workspace.displayName || workspace.name);
    }
  }, [workspace]);

  const handleSave = () => {
    if (!workspace) return;
    // Save null if the display name matches the original name (effectively clearing it)
    const nameToSave =
      displayName.trim() === workspace.name ? null : displayName.trim();
    onSave(workspace.id, nameToSave || null); // Ensure null is passed if empty/matches original
    onClose();
  };

  const handleReset = () => {
    if (workspace) {
      setDisplayName(workspace.name); // Reset to original name
    }
  };

  const isOpen = !!workspace;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-bg-card border-border-main">
        <DialogHeader>
          <DialogTitle className="text-white">
            Edit Workspace Display Name
          </DialogTitle>
          <DialogDescription className="text-text-alt">
            Original Name: {workspace?.name}.code-workspace <br />
            This won't rename the actual file. Leave blank to use the original
            name.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-2.5">
            <Label htmlFor="displayName" className="text-text-main">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a custom display name..."
              className="bg-bg border-border-main text-text-main"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleReset} className="mr-auto">
            Reset to Original
          </Button>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Name</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
