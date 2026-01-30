import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AppWorkspace, Project } from "../../types";
import { Plus, X, Monitor, Globe, Settings2, Trash2, FolderOpen } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CreateAppWorkspaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspace: AppWorkspace) => void; // Pass the constructed workspace back
  projects: Project[];
};

export function CreateAppWorkspaceModal({ isOpen, onClose, onSave, projects }: CreateAppWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🚀");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [apps, setApps] = useState<{ id: string; name: string; path: string }[]>([]);

  const handleSave = () => {
    if (!name.trim()) {
        toast.error("Please enter a workspace name");
        return;
    }

    const newWorkspace: AppWorkspace = {
        id: `aws_${Date.now()}`,
        name,
        icon,
        projectIds: selectedProjectIds,
        vsCodeWorkspaceIds: [], // Future: Support this too
        browsers: urls.length > 0 ? [{
            id: `br_${Date.now()}`,
            type: 'chrome', // Default
            urls: urls,
            usePrivateWindow: false
        }] : [],
        apps: apps,
        createdAt: Date.now()
    };
    
    onSave(newWorkspace);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setIcon("🚀");
    setSelectedProjectIds([]);
    setUrls([]);
    setApps([]);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => 
        prev.includes(projectId) 
            ? prev.filter(id => id !== projectId)
            : [...prev, projectId]
    );
  };

  const addUrl = () => {
      if (newUrl.trim()) {
          setUrls([...urls, newUrl.trim()]);
          setNewUrl("");
      }
  };

  const addApp = async () => {
      try {
          const path = await apiClient.selectAppFile();
          if (path) {
              const fileName = path.split('\\').pop() || "App";
              setApps([...apps, {
                  id: `app_${Date.now()}`,
                  name: fileName,
                  path: path
              }]);
          }
      } catch (err) {
          console.error(err);
          toast.error("Failed to select app");
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-white/10 text-foreground max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b border-white/5 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="bg-primary/20 p-1 rounded text-2xl">{icon}</span> New Automation Workspace
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 space-y-8 overflow-y-auto">
             {/* 1. Basic Info */}
             <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="e.g. Morning Workflow" 
                            className="bg-zinc-900 border-white/10"
                        />
                    </div>
                    <div className="w-20 space-y-2">
                        <Label htmlFor="icon">Icon</Label>
                        <Input 
                            id="icon" 
                            value={icon} 
                            onChange={e => setIcon(e.target.value)} 
                            className="bg-zinc-900 border-white/10 text-center text-xl"
                        />
                    </div>
                </div>
             </div>

             <div className="h-px bg-white/5 my-4" />

             {/* 2. Projects */}
             <div className="space-y-3">
                <Label className="flex items-center gap-2 text-blue-400">
                    <Monitor size={16} /> Open VS Code Projects
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-white/5 rounded-md p-2 bg-zinc-900/50">
                    {projects.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => toggleProject(p.id)}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded cursor-pointer border transition-all text-sm",
                                selectedProjectIds.includes(p.id) 
                                    ? "bg-blue-500/20 border-blue-500/50 text-blue-100" 
                                    : "bg-transparent border-transparent hover:bg-white/5 text-muted-foreground"
                            )}
                        >
                            <div className={cn("w-3 h-3 rounded-full border", selectedProjectIds.includes(p.id) ? "bg-blue-500 border-blue-500" : "border-white/30")} />
                            <span className="truncate">{p.name}</span>
                        </div>
                    ))}
                    {projects.length === 0 && <div className="text-xs text-muted-foreground p-2 col-span-2 text-center">No projects available</div>}
                </div>
             </div>

             <div className="h-px bg-white/5 my-4" />

             {/* 3. Browser Tabs */}
             <div className="space-y-3">
                <Label className="flex items-center gap-2 text-orange-400">
                    <Globe size={16} /> Open Browser URLs
                </Label>
                <div className="flex gap-2">
                    <Input 
                        value={newUrl} 
                        onChange={e => setNewUrl(e.target.value)} 
                        placeholder="https://..." 
                        onKeyDown={e => e.key === 'Enter' && addUrl()}
                        className="bg-zinc-900 border-white/10"
                    />
                    <Button onClick={addUrl} variant="secondary" size="icon">
                        <Plus size={16} />
                    </Button>
                </div>
                <div className="space-y-1">
                    {urls.map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded border border-white/5">
                            <span className="truncate flex-1 font-mono text-xs">{url}</span>
                            <button onClick={() => setUrls(urls.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-400 ml-2">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
             </div>

             <div className="h-px bg-white/5 my-4" />

             {/* 4. External Apps */}
             <div className="space-y-3">
                <Label className="flex items-center gap-2 text-emerald-400">
                    <Settings2 size={16} /> Launch External Apps
                </Label>
                <Button onClick={addApp} variant="outline" className="w-full border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5">
                    <FolderOpen className="mr-2" size={16} /> Select Application (.exe)
                </Button>
                 <div className="space-y-1">
                    {apps.map((app) => (
                        <div key={app.id} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded border border-white/5">
                            <span className="truncate flex-1">{app.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px] mx-2">{app.path}</span>
                            <button onClick={() => setApps(apps.filter(a => a.id !== app.id))} className="text-muted-foreground hover:text-red-400">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
             </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-zinc-900/50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            Create Automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
