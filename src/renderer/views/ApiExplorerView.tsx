import { useMemo, useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { Sidebar } from "../components/api-explorer/ApiSidebar";
import { RequestPanel } from "../components/api-explorer/RequestPanel";
import { ResponsePanel } from "../components/api-explorer/ResponsePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, Play, X } from "lucide-react";

import { ApiRoute, ApiFolder, Project } from "../../types";

const API_EXPLORER_TABS_STORAGE_KEY = "devdash.apiExplorer.tabs.v1";

type ApiProjectTab = {
  id: string;
  name: string;
  path: string;
  baseUrl: string;
};

type ApiExplorerViewProps = {
  projects: Project[];
};

function guessNameFromPath(p: string) {
  const normalized = String(p || "").replace(/\\+/g, "\\");
  const parts = normalized.split("\\").filter(Boolean);
  return parts.at(-1) || "Project";
}

export function ApiExplorerView({ projects }: ApiExplorerViewProps) {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [activeResponse, setActiveResponse] = useState<any>(null);

  const handleSelectRoute = (route: ApiRoute) => {
    setSelectedRoute(route);
    // Reset response when changing routes
    setActiveResponse(null);
  };

  const [tree, setTree] = useState<ApiFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const [tabs, setTabs] = useState<ApiProjectTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [addProjectId, setAddProjectId] = useState<string | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || null,
    [tabs, activeTabId],
  );

  useEffect(() => {
    // Restore tabs from previous session.
    // Important: do NOT auto-open any project by default; user chooses.
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(API_EXPLORER_TABS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        tabs?: ApiProjectTab[];
        activeTabId?: string | null;
      };
      const restoredTabs = Array.isArray(parsed?.tabs)
        ? parsed.tabs.filter(
            (t) =>
              t &&
              typeof t.id === "string" &&
              typeof t.name === "string" &&
              typeof t.path === "string" &&
              typeof t.baseUrl === "string",
          )
        : [];

      if (restoredTabs.length === 0) return;

      setTabs(restoredTabs);
      const restoredActive =
        typeof parsed.activeTabId === "string" ? parsed.activeTabId : null;
      setActiveTabId(
        restoredActive && restoredTabs.some((t) => t.id === restoredActive)
          ? restoredActive
          : restoredTabs[0].id,
      );
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Keep persisted state in sync so switching views doesn't reset the tabs.
    try {
      if (typeof window === "undefined") return;
      const payload = JSON.stringify({ tabs, activeTabId });
      window.localStorage.setItem(API_EXPLORER_TABS_STORAGE_KEY, payload);
    } catch {
      // ignore
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    // If a tab corresponds to a known DevDash project, keep its name/path fresh.
    if (!projects.length) return;
    setTabs((prev) =>
      prev.map((t) => {
        const p = projects.find((x) => x.id === t.id);
        if (!p) return t;
        return {
          ...t,
          name: p.name,
          path: p.path,
        };
      }),
    );
  }, [projects]);

  useEffect(() => {
    if (!activeTab) return;
    setSelectedRoute(null);
    setActiveResponse(null);
    void scan(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  const scan = async (tab: ApiProjectTab) => {
    setLoading(true);
    setLogs([]);
    try {
      const result = await apiClient.scanProject(tab.path);
      setTree(result.tree || []);
      setLogs(result.logs || []);
    } catch (err) {
      console.error("Scan failed", err);
      setLogs((prev) => [...prev, `Client Error: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  const addTabFromProject = (p: Project) => {
    setTabs((prev) => {
      if (prev.some((t) => t.id === p.id)) return prev;
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          path: p.path,
          baseUrl: "http://localhost:3000",
        },
      ];
    });
    setActiveTabId(p.id);
    setAddPopoverOpen(false);
    setAddProjectId(null);
  };

  const addTabFromFolderPick = async () => {
    const folder = await apiClient.openDirectoryDialog();
    if (!folder) return;
    const id = `folder_${Date.now()}`;
    const name = guessNameFromPath(folder);
    setTabs((prev) => [
      ...prev,
      { id, name, path: folder, baseUrl: "http://localhost:3000" },
    ]);
    setActiveTabId(id);
    setAddPopoverOpen(false);
    setAddProjectId(null);
  };

  const removeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next[0]?.id ?? null);
        setSelectedRoute(null);
        setActiveResponse(null);
        setTree([]);
        setLogs([]);
      }
      return next;
    });
  };

  const updateActiveBaseUrl = (baseUrl: string) => {
    if (!activeTabId) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, baseUrl } : t)),
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-transparent">
      {/* TOP BAR: Project Tabs + Add */}
      <div className="shrink-0 border-b border-white/5 bg-black/30 px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((t) => {
              const active = t.id === activeTabId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTabId(t.id)}
                  className={
                    "group flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm whitespace-nowrap transition-colors " +
                    (active
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10")
                  }
                  title={t.path}
                >
                  <span className="max-w-[180px] truncate">{t.name}</span>
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(t.id);
                    }}
                  >
                    <X size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2">
              <Plus size={14} /> Add
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[320px] bg-[#121212] border-white/10"
          >
            <div className="space-y-3">
              <div className="text-sm font-medium">
                Add project to API Explorer
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  From DevDash projects
                </div>
                <Select
                  value={addProjectId ?? ""}
                  onValueChange={(v) => setAddProjectId(v)}
                >
                  <SelectTrigger className="bg-black/30 border-white/10">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121212] border-white/10">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!addProjectId}
                    onClick={() => {
                      const p = projects.find((x) => x.id === addProjectId);
                      if (p) addTabFromProject(p);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Or browse a folder
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={addTabFromFolderPick}
                >
                  Choose Folder...
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* LEFT SIDEBAR: Route Tree */}
        <div className="w-[300px] border-r border-white/5 flex flex-col bg-black/20">
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {activeTab
                  ? `Detected APIs • ${activeTab.name}`
                  : "Detected APIs"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => activeTab && scan(activeTab)}
                disabled={loading || !activeTab}
              >
                <RefreshCw
                  size={12}
                  className={loading ? "animate-spin" : ""}
                />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={activeTab?.baseUrl ?? ""}
                onChange={(e) => updateActiveBaseUrl(e.target.value)}
                placeholder="Base URL (e.g. http://localhost:3000)"
                className="h-8 bg-black/20 border-white/10 text-xs"
                disabled={!activeTab}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Scanning...
              </div>
            ) : tree.length > 0 ? (
              <Sidebar
                tree={tree}
                selectedId={selectedRoute?.id}
                onSelect={handleSelectRoute}
              />
            ) : (
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">No APIs found.</p>
                <div className="bg-black/40 rounded p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE: Request Panel (Split Vertically) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 bg-black/10">
          <div className="flex-1 min-h-0">
            {selectedRoute ? (
              <RequestPanel
                route={selectedRoute}
                baseUrl={activeTab?.baseUrl ?? "http://localhost:3000"}
                onRun={(res) => setActiveResponse(res)}
              />
            ) : (
              <div className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground">
                <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  <Play size={24} className="opacity-50" />
                </div>
                <p>
                  {activeTab
                    ? "Select an API endpoint to start testing"
                    : "Add a project tab to scan APIs"}
                </p>
              </div>
            )}
          </div>
          {/* RESPONSE PANEL (Bottom Half) */}
          <div className="h-[40%] min-h-[200px]">
            <ResponsePanel response={activeResponse} />
          </div>
        </div>
      </div>
    </div>
  );
}
