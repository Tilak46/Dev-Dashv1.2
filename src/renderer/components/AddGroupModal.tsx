import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (groupName: string) => void;
};

export function AddGroupModal({ isOpen, onClose, onSave }: ModalProps) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName(""); // Reset input
      onClose(); // Close modal on save
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-bg-card p-6 rounded-xl w-full max-w-sm border border-border-main shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-6">
          Create New Group
        </h2>

        <div className="grid w-full items-center gap-2.5">
          <Label htmlFor="groupName" className="text-text-main">
            Group Name
          </Label>
          <Input
            id="groupName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Work Projects"
            className="bg-bg border-border-main text-text-main"
            autoFocus // Focus input on open
          />
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Plus className="mr-2" size={18} />
            Create Group
          </Button>
        </div>
      </div>
    </div>
  );
}
