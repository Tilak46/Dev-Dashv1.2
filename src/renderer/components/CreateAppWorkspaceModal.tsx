import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AppWorkspace,
  DetectedApp,
  DetectedBrowser,
  Project,
  Workspace,
} from "../../types";
import {
  FolderOpen,
  Globe,
  LayoutGrid,
  Lock,
  Monitor,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CreateAppWorkspaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspace: AppWorkspace) => void; // Pass the constructed workspace back
  projects: Project[];
  workspaces: Workspace[];
};

type UrlEntry = {
  id: string;
  url: string;
  browserValue: string; // 'default' | 'chrome' | ... | `detected:<id>`
  privateMode: boolean;
};

export function CreateAppWorkspaceModal({
  isOpen,
  onClose,
  onSave,
  projects,
  workspaces,
}: CreateAppWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🚀");

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    [],
  );

  const [urlEntries, setUrlEntries] = useState<UrlEntry[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newUrlBrowserValue, setNewUrlBrowserValue] =
    useState<string>("default");
  const [newUrlPrivate, setNewUrlPrivate] = useState(false);

  const [apps, setApps] = useState<
    Array<{ id: string; name: string; path: string }>
  >([]);
  const [isScanningApps, setIsScanningApps] = useState(false);
  const [appsQuery, setAppsQuery] = useState("");
  const [detectedApps, setDetectedApps] = useState<DetectedApp[]>([]);
  const [detectedBrowsers, setDetectedBrowsers] = useState<DetectedBrowser[]>(
    [],
  );

  const filteredDetectedApps = useMemo(() => {
    const q = appsQuery.trim().toLowerCase();
    if (!q) return detectedApps;
    return detectedApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q),
    );
  }, [detectedApps, appsQuery]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof apiClient.scanApps !== "function") {
      setDetectedApps([]);
      setIsScanningApps(false);
      return;
    }
    setIsScanningApps(true);
    apiClient
      .scanApps()
      .then((list) => setDetectedApps(Array.isArray(list) ? list : []))
      .catch(() => setDetectedApps([]))
      .finally(() => setIsScanningApps(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof apiClient.scanBrowsers !== "function") {
      setDetectedBrowsers([]);
      return;
    }
    apiClient
      .scanBrowsers()
      .then((list) => setDetectedBrowsers(Array.isArray(list) ? list : []))
      .catch(() => setDetectedBrowsers([]));
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    const browserGroups = new Map<
      string,
      {
        type: AppWorkspace["browsers"][number]["type"];
        detectedBrowserId?: string;
        privateMode: boolean;
        urls: string[];
      }
    >();
    for (const e of urlEntries) {
      const url = String(e.url ?? "").trim();
      if (!url) continue;
      const bv = String(e.browserValue ?? "default");
      const privateMode = Boolean(e.privateMode);

      let type: AppWorkspace["browsers"][number]["type"] = "default";
      let detectedBrowserId: string | undefined;
      if (bv.startsWith("detected:")) {
        type = "detected";
        detectedBrowserId = bv.slice("detected:".length);
      } else if (
        bv === "chrome" ||
        bv === "edge" ||
        bv === "firefox" ||
        bv === "default"
      ) {
        type = bv;
      }

      const key = `${type}:${detectedBrowserId ?? ""}__${privateMode ? "1" : "0"}`;
      const existing = browserGroups.get(key);
      if (existing) existing.urls.push(url);
      else
        browserGroups.set(key, {
          type,
          detectedBrowserId,
          privateMode,
          urls: [url],
        });
    }

    const browsers: AppWorkspace["browsers"] = Array.from(
      browserGroups.values(),
    ).map((g) => ({
      id: `br_${Date.now()}_${g.type}_${g.detectedBrowserId ?? ""}_${g.privateMode ? "p" : "n"}`,
      type: g.type,
      detectedBrowserId: g.detectedBrowserId,
      urls: g.urls,
      usePrivateWindow: g.privateMode,
    }));

    const newWorkspace: AppWorkspace = {
      id: `aws_${Date.now()}`,
      name,
      icon,
      projectIds: selectedProjectIds,
      vsCodeWorkspaceIds: selectedWorkspaceIds,
      browsers,
      apps,
      createdAt: Date.now(),
    };

    onSave(newWorkspace);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setIcon("🚀");
    setSelectedProjectIds([]);
    setSelectedWorkspaceIds([]);
    setUrlEntries([]);
    setNewUrl("");
    setNewUrlBrowserValue("default");
    setNewUrlPrivate(false);
    setApps([]);
    setAppsQuery("");
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const toggleWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId],
    );
  };

  const addUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setUrlEntries((prev) => [
      ...prev,
      {
        id: `url_${Date.now()}`,
        url: trimmed,
        browserValue: newUrlBrowserValue,
        privateMode: newUrlPrivate,
      },
    ]);
    setNewUrl("");
  };

  const addApp = async () => {
    try {
      const path = await apiClient.selectAppFile();
      if (path) {
        const fileName = path.split("\\").pop() || "App";
        const displayName = fileName.replace(/\.(exe|lnk)$/i, "");
        setApps([
          ...apps,
          {
            id: `app_${Date.now()}`,
            name: displayName,
            path: path,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to select app");
    }
  };

  const addDetectedApp = (a: DetectedApp) => {
    if (!a?.path) return;
    setApps((prev) => {
      if (prev.some((x) => x.path === a.path)) return prev;
      return [
        ...prev,
        {
          id: `app_${Date.now()}`,
          name: a.name || (a.path.split("\\").pop() ?? "App"),
          path: a.path,
        },
      ];
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[780px] bg-zinc-950/95 border-white/10 text-foreground max-h-[85vh] flex flex-col p-0 gap-0 backdrop-blur-xl">
        <DialogHeader className="p-6 border-b border-white/5 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="bg-primary/20 p-1 rounded text-2xl">{icon}</span>{" "}
            New Automation Workspace
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* 1. Basic Info */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning Workflow"
                    className="bg-zinc-900 border-white/10"
                  />
                </div>
                <div className="w-20 space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-center text-xl"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 2. Projects */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-blue-300">
                  <Monitor size={16} /> VS Code Projects
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto border border-white/10 rounded-lg p-2 bg-black/30">
                  {projects.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border transition-all text-sm text-left",
                        selectedProjectIds.includes(p.id)
                          ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                          : "bg-transparent border-transparent hover:bg-white/5 text-muted-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border",
                          selectedProjectIds.includes(p.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-white/30",
                        )}
                      />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-xs text-muted-foreground p-2 col-span-2 text-center">
                      No projects available
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Workspace Files */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-violet-300">
                  <LayoutGrid size={16} /> VS Code Workspace Files
                </Label>
                <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto border border-white/10 rounded-lg p-2 bg-black/30">
                  {workspaces.map((w) => (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => toggleWorkspace(w.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border transition-all text-sm text-left",
                        selectedWorkspaceIds.includes(w.id)
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-100"
                          : "bg-transparent border-transparent hover:bg-white/5 text-muted-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border",
                          selectedWorkspaceIds.includes(w.id)
                            ? "bg-violet-500 border-violet-500"
                            : "border-white/30",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="truncate">
                          {w.displayName || w.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground/70 font-mono">
                          {w.path}
                        </div>
                      </div>
                    </button>
                  ))}
                  {workspaces.length === 0 && (
                    <div className="text-xs text-muted-foreground p-2 text-center">
                      No workspace files added. Import them in Workspaces → VS
                      Code Files.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* 4. Browser Links */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-orange-300">
                <Globe size={16} /> Browser Links
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
                <div className="md:col-span-3">
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Paste a URL (https://...)"
                    onKeyDown={(e) => e.key === "Enter" && addUrl()}
                    className="bg-zinc-900 border-white/10"
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    value={newUrlBrowserValue}
                    onValueChange={(v) => setNewUrlBrowserValue(String(v))}
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10">
                      <SelectValue placeholder="Browser" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-white/10">
                      <SelectItem value="default">Default</SelectItem>
                      {detectedBrowsers.map((b) => (
                        <SelectItem key={b.id} value={`detected:${b.id}`}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Button
                    onClick={addUrl}
                    variant="secondary"
                    className="w-full"
                  >
                    <Plus size={16} className="mr-2" /> Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={newUrlPrivate}
                  onCheckedChange={(v) => setNewUrlPrivate(Boolean(v))}
                />
                <span className="flex items-center gap-1">
                  <Lock size={12} /> Private / Incognito for this link
                </span>
              </div>

              <div className="space-y-2">
                {urlEntries.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-col md:flex-row md:items-center gap-2 text-sm bg-white/5 p-2 rounded-lg border border-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-mono text-xs text-foreground/90">
                        {e.url}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={e.browserValue}
                        onValueChange={(v) =>
                          setUrlEntries((prev) =>
                            prev.map((x) =>
                              x.id === e.id
                                ? { ...x, browserValue: String(v) }
                                : x,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] bg-zinc-900 border-white/10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-white/10">
                          <SelectItem value="default">Default</SelectItem>
                          {detectedBrowsers.map((b) => (
                            <SelectItem key={b.id} value={`detected:${b.id}`}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2 px-2">
                        <Checkbox
                          checked={e.privateMode}
                          onCheckedChange={(v) =>
                            setUrlEntries((prev) =>
                              prev.map((x) =>
                                x.id === e.id
                                  ? { ...x, privateMode: Boolean(v) }
                                  : x,
                              ),
                            )
                          }
                        />
                        <Lock
                          size={12}
                          className={
                            e.privateMode
                              ? "text-orange-300"
                              : "text-muted-foreground"
                          }
                        />
                      </div>

                      <button
                        onClick={() =>
                          setUrlEntries((prev) =>
                            prev.filter((x) => x.id !== e.id),
                          )
                        }
                        className="text-muted-foreground hover:text-red-400"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {urlEntries.length === 0 && (
                  <div className="text-xs text-muted-foreground/70 italic">
                    No links added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* 5. External Apps */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-emerald-300">
                <Settings2 size={16} /> External Apps
              </Label>

              <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Detected apps (Desktop + Start Menu)
                  </div>
                  <div className="relative w-64">
                    <Search
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={14}
                    />
                    <Input
                      value={appsQuery}
                      onChange={(e) => setAppsQuery(e.target.value)}
                      placeholder={
                        isScanningApps ? "Scanning..." : "Search apps..."
                      }
                      className="pl-8 h-8 bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {filteredDetectedApps.slice(0, 60).map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => addDetectedApp(a)}
                      className="flex items-center gap-3 p-2 rounded-md border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left"
                      title={a.path}
                    >
                      <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {a.iconDataUrl ? (
                          <img src={a.iconDataUrl} alt="" className="w-6 h-6" />
                        ) : (
                          <FolderOpen
                            size={16}
                            className="text-muted-foreground"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate text-foreground/90">
                          {a.name}
                        </div>
                      </div>
                      <div className="ml-auto text-xs text-primary/80">Add</div>
                    </button>
                  ))}
                  {!isScanningApps && filteredDetectedApps.length === 0 && (
                    <div className="text-xs text-muted-foreground/70 italic">
                      No apps detected. You can still browse for an exe/lnk.
                    </div>
                  )}
                  {isScanningApps && (
                    <div className="text-xs text-muted-foreground/70 italic">
                      Scanning apps...
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={addApp}
                variant="outline"
                className="w-full border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5"
              >
                <FolderOpen className="mr-2" size={16} /> Browse for .exe / .lnk
              </Button>

              <div className="space-y-1">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between text-sm bg-white/5 p-2 rounded border border-white/10"
                  >
                    <span className="truncate flex-1">{app.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[180px] mx-2 font-mono">
                      {app.path}
                    </span>
                    <button
                      onClick={() =>
                        setApps(apps.filter((a) => a.id !== app.id))
                      }
                      className="text-muted-foreground hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {apps.length === 0 && (
                  <div className="text-xs text-muted-foreground/70 italic">
                    No apps selected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-white/5 bg-zinc-900/50">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            Create Automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
