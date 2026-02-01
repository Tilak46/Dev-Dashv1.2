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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
  Layers,
  Sparkles,
  Code2,
  Terminal,
  Cloud,
  Database,
  Server,
  Smartphone,
  Coffee,
  Music,
  Briefcase,
  Rocket,
  Gamepad2,
  Bug,
  Cpu,
  Zap,
  Palette,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AppWorkspaceConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspace: AppWorkspace) => void;
  onEdit: (workspace: AppWorkspace) => void;
  editingWorkspace?: AppWorkspace | null;
  projects: Project[];
  workspaces: Workspace[];
};

type UrlEntry = {
  id: string;
  url: string;
  browserValue: string;
  privateMode: boolean;
};

// Premium Icon Selection
const PREMIUM_ICONS = [
  { id: "rocket", value: "lucide:rocket", label: "Launch" },
  { id: "code", value: "lucide:code", label: "Code" },
  { id: "term", value: "lucide:term", label: "Terminal" },
  { id: "cloud", value: "lucide:cloud", label: "Cloud" },
  { id: "db", value: "lucide:db", label: "Data" },
  { id: "server", value: "lucide:server", label: "Server" },
  { id: "mobile", value: "lucide:mobile", label: "Mobile" },
  { id: "brief", value: "lucide:brief", label: "Work" },
  { id: "coffee", value: "lucide:coffee", label: "Focus" },
  { id: "music", value: "lucide:music", label: "Chill" },
  { id: "game", value: "lucide:game", label: "Game" },
  { id: "bug", value: "lucide:bug", label: "Debug" },
  { id: "cpu", value: "lucide:cpu", label: "Sys" },
  { id: "zap", value: "lucide:zap", label: "Action" },
  { id: "palette", value: "lucide:palette", label: "Design" },
];

export function AppWorkspaceConfigModal({
  isOpen,
  onClose,
  onSave,
  onEdit,
  editingWorkspace,
  projects,
  workspaces,
}: AppWorkspaceConfigModalProps) {
  const [activeTab, setActiveTab] = useState("general");

  // Form State
  const [name, setName] = useState("");
  // Storing icon as string (emoji) or ID for Lucide.
  // For simplicity, we'll store the rendered string/component representation identifier if it's a component, or just the emoji.
  // Actually, keeping the simpler 'icon' string prop on type means we should stick to Emojis OR we need to update the type.
  // For now, let's stick to the 'icon' field being a string. If user picks a Lucide icon, we can store a special prefix or just use a representative Emoji for the backend data model
  // BUT the user asked for icons. The AppWorkspace type defines icon as string.
  // Let's use Emojis for the "Premium" look for now to avoid breaking the type, but present them beautifully.
  // OR we can misuse the string to store a lucide identifier (e.g. "lucide:code") and handle rendering elsewhere.
  // To be safe and compliant with current types, let's use a unified set of high-quality Emojis that look like icons.
  const [icon, setIcon] = useState("🚀");

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [runProjectIds, setRunProjectIds] = useState<string[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(
    [],
  );

  const [urlEntries, setUrlEntries] = useState<UrlEntry[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newUrlBrowserValue, setNewUrlBrowserValue] =
    useState<string>("default");
  const [newUrlPrivate, setNewUrlPrivate] = useState(false);
  const [openLinksInNewWindow, setOpenLinksInNewWindow] = useState(false);

  const [apps, setApps] = useState<
    Array<{ id: string; name: string; path: string }>
  >([]);
  const [isScanningApps, setIsScanningApps] = useState(false);
  const [appsQuery, setAppsQuery] = useState("");
  const [detectedApps, setDetectedApps] = useState<DetectedApp[]>([]);
  const [detectedBrowsers, setDetectedBrowsers] = useState<DetectedBrowser[]>(
    [],
  );

  const isEditing = !!editingWorkspace;

  useEffect(() => {
    if (isOpen && editingWorkspace) {
      setName(editingWorkspace.name);
      setIcon(editingWorkspace.icon || "🚀");
      setSelectedProjectIds(editingWorkspace.projectIds || []);
      setRunProjectIds((editingWorkspace as any).runProjectIds || []);
      setSelectedWorkspaceIds(editingWorkspace.vsCodeWorkspaceIds || []);
      setApps(editingWorkspace.apps || []);

      const entries: UrlEntry[] = [];
      editingWorkspace.browsers?.forEach((b) => {
        b.urls.forEach((url, idx) => {
          entries.push({
            id: `restored_${b.id}_${idx}`,
            url,
            browserValue:
              b.type === "detected"
                ? `detected:${b.detectedBrowserId}`
                : b.type,
            privateMode: b.usePrivateWindow || false,
          });
        });
      });
      setUrlEntries(entries);
    } else if (isOpen && !editingWorkspace) {
      resetForm();
    }
  }, [isOpen, editingWorkspace]);

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
      setActiveTab("general");
      return;
    }

    const browserGroups = new Map<
      string,
      {
        type: AppWorkspace["browsers"][number]["type"];
        detectedBrowserId?: string;
        privateMode: boolean;
        openInNewWindow: boolean;
        urls: string[];
      }
    >();
    for (const e of urlEntries) {
      const url = String(e.url ?? "").trim();
      if (!url) continue;
      const bv = String(e.browserValue ?? "default");
      const privateMode = Boolean(e.privateMode);
      const openInNewWindow = Boolean(openLinksInNewWindow);

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

      const key = `${type}:${detectedBrowserId ?? ""}__${privateMode ? "1" : "0"}__${openInNewWindow ? "1" : "0"}`;
      const existing = browserGroups.get(key);
      if (existing) existing.urls.push(url);
      else
        browserGroups.set(key, {
          type,
          detectedBrowserId,
          privateMode,
          openInNewWindow,
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
      openInNewWindow: g.openInNewWindow,
    }));

    const workspaceData: AppWorkspace = {
      id: isEditing ? editingWorkspace.id : `aws_${Date.now()}`,
      name,
      icon,
      projectIds: selectedProjectIds,
      runProjectIds,
      vsCodeWorkspaceIds: selectedWorkspaceIds,
      browsers,
      apps,
      createdAt: isEditing ? editingWorkspace.createdAt : Date.now(),
    };

    if (isEditing) {
      onEdit(workspaceData);
    } else {
      onSave(workspaceData);
    }

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setIcon("🚀");
    setSelectedProjectIds([]);
    setRunProjectIds([]);
    setSelectedWorkspaceIds([]);
    setUrlEntries([]);
    setNewUrl("");
    setNewUrlBrowserValue("default");
    setNewUrlPrivate(false);
    setOpenLinksInNewWindow(false);
    setApps([]);
    setAppsQuery("");
    setActiveTab("general");
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const toggleRunProject = (projectId: string) => {
    setRunProjectIds((prev) =>
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
      if (prev.some((x) => x.path === a.path)) {
        return prev.filter((x) => x.path !== a.path);
      }
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
      <DialogContent className="sm:max-w-[750px] h-[650px] bg-[#0A0A0A] border-white/10 text-foreground flex flex-col p-0 gap-0 shadow-2xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
                {isEditing ? (
                  <Settings2 size={16} className="text-primary" />
                ) : (
                  <Sparkles size={16} className="text-primary" />
                )}
              </div>
              <div>
                {isEditing ? "Edit Automation" : "New Automation"}
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Configure your dream workflow.
                </p>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2 mr-4">
              {/* <Button
                variant="ghost"
                onClick={onClose}
                size="sm"
                className="hover:bg-white/5 text-muted-foreground hover:text-white h-8"
              >
                Cancel
              </Button> */}
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-8 px-4 text-xs font-medium"
              >
                {isEditing ? "Save Changes" : "Create"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
              <TabsList className="bg-transparent gap-2 p-0 h-9">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md px-4"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md px-4"
                >
                  Projects
                </TabsTrigger>
                <TabsTrigger
                  value="workspaces"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md px-4"
                >
                  VS Code Files
                </TabsTrigger>
                <TabsTrigger
                  value="browsers"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md px-4"
                >
                  Browsers
                </TabsTrigger>
                <TabsTrigger
                  value="apps"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md px-4"
                >
                  Apps
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 bg-zinc-950/50">
              <div className="p-6 pb-20">
                {/* GENERAL TAB */}
                <TabsContent
                  value="general"
                  className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">
                        Workspace Name
                      </Label>
                      <Input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Frontend Dev, Morning Routine"
                        className="bg-black/40 border-white/10 h-11 text-lg"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-muted-foreground">
                        Select Icon
                      </Label>
                      <div className="grid grid-cols-6 gap-3">
                        {PREMIUM_ICONS.map((item) => {
                          // Simple helper to render the icon component based on ID/Value
                          // In a real app we might store the component in the object, but here we just switch for display in the grid
                          const renderGridIcon = (id: string) => {
                            switch (id) {
                              case "rocket": return <Rocket size={24} className="text-orange-500" />;
                              case "code": return <Code2 size={24} className="text-blue-500" />;
                              case "term": return <Terminal size={24} className="text-emerald-500" />;
                              case "cloud": return <Cloud size={24} className="text-sky-500" />;
                              case "db": return <Database size={24} className="text-amber-500" />;
                              case "server": return <Server size={24} className="text-violet-500" />;
                              case "mobile": return <Smartphone size={24} className="text-pink-500" />;
                              case "brief": return <Briefcase size={24} className="text-amber-700" />;
                              case "coffee": return <Coffee size={24} className="text-brown-500" />;
                              case "music": return <Music size={24} className="text-fuchsia-500" />;
                              case "game": return <Gamepad2 size={24} className="text-purple-500" />;
                              case "bug": return <Bug size={24} className="text-rose-500" />;
                              case "cpu": return <Cpu size={24} className="text-cyan-500" />;
                              case "zap": return <Zap size={24} className="text-yellow-400" />;
                              case "palette": return <Palette size={24} className="text-indigo-400" />;
                              default: return <Sparkles size={24} />;
                            }
                          };

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setIcon(item.value)}
                              className={cn(
                                "aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group",
                                item.value === icon
                                  ? "bg-primary/20 border-primary shadow-[0_0_15px_-5px_var(--primary)]"
                                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-105",
                              )}
                            >
                              <div className={cn("transition-transform duration-300", item.value === icon ? "scale-110" : "group-hover:scale-110")}>
                                {renderGridIcon(item.id)}
                              </div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                        {/* Custom Input */}
                        <div className="aspect-square rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-1 p-2">
                          <span className="text-xs text-muted-foreground">
                            Custom
                          </span>
                          <Input
                            value={icon.startsWith("lucide:") ? "" : icon}
                            placeholder="🚀"
                            onChange={(e) => setIcon(e.target.value)}
                            className="h-8 w-12 text-center text-lg bg-transparent border-none p-0 focus-visible:ring-0"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* PROJECTS TAB */}
                <TabsContent
                  value="projects"
                  className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-white flex items-center gap-2 text-base">
                        <Monitor size={18} className="text-blue-400" /> VS Code
                        Projects
                      </Label>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-white/5 rounded-md">
                        {selectedProjectIds.length} selected
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select folder-based projects to open.
                    </p>
                  </div>

                  <ScrollArea className="h-[450px] rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="space-y-2 pb-8">
                      {projects.map((p) => {
                        const isSelected = selectedProjectIds.includes(p.id);
                        const isRunning = runProjectIds.includes(p.id);
                        const isActive = isSelected || isRunning;

                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "group relative border rounded-xl p-3 flex items-center gap-4 transition-all duration-300",
                              isActive
                                ? "bg-blue-500/5 border-blue-500/30 shadow-[0_0_20px_-10px_rgba(59,130,246,0.2)]"
                                : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10",
                            )}
                          >
                            {/* Icon Box */}
                            <div
                              className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isActive
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-white/5 text-muted-foreground group-hover:text-white group-hover:bg-white/10",
                              )}
                            >
                              <Code2 size={20} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "text-sm font-medium transition-colors break-words leading-tight",
                                  isActive ? "text-blue-100" : "text-white/90",
                                )}
                              >
                                {p.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 break-all opacity-70">
                                {p.path}
                              </div>
                            </div>

                            {/* Actions / Logic Preserved */}
                            <div className="flex items-center gap-2">
                              {/* Open Toggle */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProject(p.id);
                                }}
                                className={cn(
                                  "cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all select-none",
                                  isSelected
                                    ? "bg-blue-500/20 border-blue-500/30 text-blue-200"
                                    : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className={cn(
                                    "border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500",
                                    isSelected ? "opacity-100" : "opacity-50",
                                  )}
                                />
                                <span className="text-xs font-medium">Open</span>
                              </div>

                              {/* Run Toggle */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRunProject(p.id);
                                }}
                                className={cn(
                                  "cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all select-none",
                                  isRunning
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-200"
                                    : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
                                )}
                              >
                                <Checkbox
                                  checked={isRunning}
                                  className={cn(
                                    "border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
                                    isRunning ? "opacity-100" : "opacity-50",
                                  )}
                                />
                                <span className="text-xs font-medium">Run</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {projects.length === 0 && (
                        <div className="text-sm text-muted-foreground p-4 bg-white/5 rounded-lg border border-dashed border-white/10 text-center">
                          No projects found in DevDash.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* WORKSPACES TAB */}
                <TabsContent
                  value="workspaces"
                  className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-white flex items-center gap-2 text-base">
                        <LayoutGrid size={18} className="text-violet-400" /> VS
                        Code Workspace Files
                      </Label>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-white/5 rounded-md">
                        {selectedWorkspaceIds.length} selected
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select{" "}
                      <span className="font-mono text-xs bg-white/10 px-1 rounded">
                        .code-workspace
                      </span>{" "}
                      files.
                    </p>
                  </div>

                  <ScrollArea className="h-[450px] rounded-xl border border-white/5 bg-white/5 p-3">
                    <div className="grid grid-cols-1 gap-3 pb-6">
                      {workspaces.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => toggleWorkspace(w.id)}
                          className={cn(
                            "cursor-pointer flex items-center gap-3 p-3 rounded-md border transition-all text-left",
                            selectedWorkspaceIds.includes(w.id)
                              ? "bg-violet-500/10 border-violet-500/30 shadow-[0_0_15px_-5px_#8b5cf6]"
                              : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10",
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                              selectedWorkspaceIds.includes(w.id)
                                ? "bg-violet-500/20 text-violet-400"
                                : "bg-white/5 text-muted-foreground",
                            )}
                          >
                            <LayoutGrid size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "text-sm font-medium truncate transition-colors",
                                selectedWorkspaceIds.includes(w.id)
                                  ? "text-violet-200"
                                  : "text-white/90",
                              )}
                            >
                              {w.displayName || w.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate opacity-60">
                              {w.path}
                            </div>
                          </div>
                        </div>
                      ))}
                      {workspaces.length === 0 && (
                        <div className="text-sm text-muted-foreground p-8 flex flex-col items-center justify-center text-center opacity-50">
                          <LayoutGrid size={24} className="mb-2" />
                          No workspace files imported yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* BROWSERS TAB */}
                <TabsContent
                  value="browsers"
                  className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <div className="space-y-1">
                    <Label className="text-white flex items-center gap-2 text-base">
                      <Globe size={18} className="text-orange-400" /> Browser Tabs
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Links to open on launch.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                    {/* Input Row - Flexbox for better alignment */}
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder="Paste a URL (https://...)"
                          className="bg-black/20 border-white/10 h-10 text-sm w-full"
                          onKeyDown={(e) => e.key === "Enter" && addUrl()}
                        />
                      </div>
                      <div className="w-[140px] shrink-0">
                        <Select
                          value={newUrlBrowserValue}
                          onValueChange={(v) => setNewUrlBrowserValue(String(v))}
                        >
                          <SelectTrigger className="bg-black/20 border-white/10 h-10 text-sm w-full">
                            <SelectValue placeholder="Browser" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10">
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="chrome">Chrome</SelectItem>
                            <SelectItem value="edge">Edge</SelectItem>
                            <SelectItem value="firefox">Firefox</SelectItem>
                            {detectedBrowsers.map((b) => (
                              <SelectItem key={b.id} value={`detected:${b.id}`}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={addUrl}
                        variant="secondary"
                        className="h-10 px-4 border border-white/10 shrink-0"
                      >
                        <Plus size={16} className="mr-2" /> Add
                      </Button>
                    </div>

                    {/* Options Row */}
                    <div className="flex flex-wrap items-center gap-6 px-1">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer hover:text-white transition-colors">
                        <Checkbox
                          checked={newUrlPrivate}
                          onCheckedChange={(v) => setNewUrlPrivate(Boolean(v))}
                          className="border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <span className="flex items-center gap-1.5">
                          <Lock size={12} /> Open in Private / Incognito
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer hover:text-white transition-colors">
                        <Checkbox
                          checked={openLinksInNewWindow}
                          onCheckedChange={(v) =>
                            setOpenLinksInNewWindow(Boolean(v))
                          }
                          className="border-white/20"
                        />
                        Open all links in a new window
                      </label>
                    </div>

                    {/* Link List */}
                    <div className="space-y-2 mt-2">
                       {/* We can add scroll here if list gets long */}
                       <ScrollArea className="h-[280px] pr-4">
                          <div className="space-y-2">
                            {urlEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="group flex items-center justify-between text-sm p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                              >
                                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 mr-4">
                                  <div className="min-w-[4px] h-4 rounded-full bg-orange-400/50 grow-0 shrink-0" />
                                  <span className="truncate text-white/90 font-medium block max-w-[300px]" title={entry.url}>
                                    {entry.url.length > 60 ? entry.url.slice(0, 60) + "..." : entry.url}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <Select
                                    value={entry.browserValue}
                                    onValueChange={(v) =>
                                      setUrlEntries((prev) =>
                                        prev.map((x) =>
                                          x.id === entry.id
                                            ? { ...x, browserValue: String(v) }
                                            : x,
                                        ),
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-[130px] bg-black/40 border-white/5 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                                      <SelectItem value="default">Default</SelectItem>
                                      <SelectItem value="chrome">Chrome</SelectItem>
                                      <SelectItem value="edge">Edge</SelectItem>
                                      <SelectItem value="firefox">Firefox</SelectItem>
                                      {detectedBrowsers.map((b) => (
                                        <SelectItem
                                          key={b.id}
                                          value={`detected:${b.id}`}
                                        >
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <div className="flex items-center gap-1" title="Private Window">
                                    {entry.privateMode && <Lock size={12} className="text-orange-400"/>}
                                  </div>
                                  
                                  <button
                                    onClick={() =>
                                      setUrlEntries((prev) =>
                                        prev.filter((x) => x.id !== entry.id),
                                      )
                                    }
                                    className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/5 rounded"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {urlEntries.length === 0 && (
                              <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center opacity-50">
                                <Globe size={24} className="mb-2"/>
                                No links added yet.
                              </div>
                            )}
                          </div>
                       </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                {/* APPS TAB */}
                <TabsContent
                  value="apps"
                  className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-white flex items-center gap-2 text-base">
                         <Settings2 size={18} className="text-emerald-400" /> External Applications
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      System apps found on your machine.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                    <div className="flex gap-2">
                       {/* Search Input */}
                      <div className="relative flex-1">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          size={14}
                        />
                        <Input
                          value={appsQuery}
                          onChange={(e) => setAppsQuery(e.target.value)}
                          placeholder="Search installed apps..."
                          className="pl-9 bg-black/20 border-white/10 h-10"
                        />
                      </div>
                      <Button
                        onClick={addApp}
                        variant="outline"
                        className="h-10 border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        <FolderOpen size={14} className="mr-2" /> Browse
                      </Button>
                    </div>

                    <ScrollArea className="h-[320px] border border-white/5 rounded-lg bg-black/20">
                      <div className="p-2 grid grid-cols-2 gap-2 pb-6">
                        {isScanningApps ? (
                          <div className="col-span-2 py-8 text-center text-muted-foreground animate-pulse flex flex-col items-center">
                            <Settings2 size={24} className="mb-2 animate-spin duration-3000"/>
                            Scanning system apps...
                          </div>
                        ) : (
                          <>
                            {filteredDetectedApps.slice(0, 40).map((app) => {
                               // Check if selected
                               const isSelected = apps.some(a => a.path === app.path);
                               return (
                                <div
                                    key={app.id}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded border cursor-pointer group transition-all",
                                        isSelected 
                                            ? "bg-emerald-500/10 border-emerald-500/30" 
                                            : "border-white/5 bg-white/5 hover:bg-white/10"
                                    )}
                                    onClick={() => addDetectedApp(app)}
                                >
                                    <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center shrink-0 overflow-hidden">
                                    {app.iconDataUrl ? (
                                        <img
                                        src={app.iconDataUrl}
                                        className="w-5 h-5 object-contain"
                                        alt=""
                                        />
                                    ) : (
                                        <Settings2
                                        size={14}
                                        className="text-muted-foreground"
                                        />
                                    )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                    <div className={cn("text-sm truncate", isSelected ? "text-emerald-100" : "text-white/80")}>
                                        {app.name}
                                    </div>
                                    </div>
                                    {isSelected ? <div className="w-2 h-2 bg-emerald-500 rounded-full"/> : <Plus
                                    size={14}
                                    className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />}
                                </div>
                               )
                            })}
                          </>
                        )}
                      </div>
                    </ScrollArea>

                    {apps.length > 0 && (
                      <div className="border-t border-white/10 pt-4">
                        <Label className="text-xs text-emerald-400 mb-2 block font-mono">
                          SELECTED APPS ({apps.length})
                        </Label>
                        <ScrollArea className="h-[100px]">
                            <div className="space-y-1 pr-3">
                            {apps.map((app) => (
                                <div
                                key={app.id}
                                className="flex items-center justify-between text-sm bg-emerald-500/5 border border-emerald-500/20 p-2 rounded"
                                >
                                <span className="truncate text-emerald-100">{app.name}</span>
                                <button
                                    onClick={() =>
                                    setApps((prev) =>
                                        prev.filter((a) => a.id !== app.id),
                                    )
                                    }
                                    className="text-emerald-400 hover:text-emerald-300 p-1 hover:bg-emerald-500/10 rounded"
                                >
                                    <Trash2 size={14} />
                                </button>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
           </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
