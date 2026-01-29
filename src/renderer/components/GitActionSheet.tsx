import { useEffect, useMemo, useState } from "react";
import type { GitFileStatus, GitSummary, Project } from "@/../types";
import {
  RefreshCw,
  GitBranch,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  summary?: GitSummary;
  onSummaryChange?: (projectId: string, summary: GitSummary) => void;
};

type GitExecResult = { code: number; stdout: string; stderr: string };

function formatBadgeSummary(s?: GitSummary): string {
  if (!s) return "Git";
  if (!s.isRepo) return "No repo";
  const branch = s.branch || "(unknown)";
  const count = s.changeCount ?? 0;
  return `${branch} ${count > 0 ? `[+${count}]` : "[0]"}`;
}

function fileStatusLabel(file: GitFileStatus): string {
  const xy = `${file.indexStatus}${file.worktreeStatus}`;
  if (file.untracked) return "untracked";
  if (xy === " M") return "modified";
  if (xy === "M ") return "staged";
  if (xy === "MM") return "staged+modified";
  if (xy === "A ") return "added";
  if (xy === " D") return "deleted";
  if (xy === "D ") return "deleted(staged)";
  if (xy === "R ") return "renamed";
  return xy.trim() || "changed";
}

export function GitActionSheet({
  open,
  onOpenChange,
  project,
  summary,
  onSummaryChange,
}: Props) {
  const [localSummary, setLocalSummary] = useState<GitSummary | undefined>(
    summary,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingFileOps, setPendingFileOps] = useState<Set<string>>(
    () => new Set(),
  );
  const [commitMessage, setCommitMessage] = useState("");
  const [lastResult, setLastResult] = useState<GitExecResult | null>(null);

  useEffect(() => {
    setLocalSummary(summary);
  }, [summary]);

  const activeSummary = localSummary;

  const branchValue = useMemo(() => {
    if (!activeSummary?.isRepo) return "";
    return activeSummary.branch ?? "";
  }, [activeSummary]);

  const aheadBehindText = useMemo(() => {
    const ab = activeSummary?.aheadBehind;
    if (!ab) return null;
    const parts: string[] = [];
    if (ab.behind > 0) parts.push(`behind ${ab.behind}`);
    if (ab.ahead > 0) parts.push(`ahead ${ab.ahead}`);
    return parts.length ? parts.join(", ") : "up to date";
  }, [activeSummary]);

  async function refresh() {
    setIsRefreshing(true);
    try {
      const next = await apiClient.getGitSummary(project.path);
      setLocalSummary(next);
      onSummaryChange?.(project.id, next);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (open) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.path]);

  async function runAndRefresh(
    action: () => Promise<GitExecResult>,
    opts?: { successToast?: string; errorToast?: string },
  ) {
    setIsSyncing(true);
    setLastResult(null);
    try {
      const res = await action();
      setLastResult(res);
      if (res.code === 0) {
        if (opts?.successToast) toast.success(opts.successToast);
      } else {
        toast.error(opts?.errorToast || "Git command failed", {
          description: (res.stderr || res.stdout || "").trim().slice(0, 240),
        });
      }
      await refresh();
    } catch (error: any) {
      setLastResult({
        code: 1,
        stdout: "",
        stderr: error?.message || "Operation failed",
      });
      toast.error(opts?.errorToast || "Operation failed", {
        description: (error?.message || "").slice(0, 240),
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function stageOneFile(filePath: string, stage: boolean) {
    const key = filePath;
    setPendingFileOps((prev) => new Set(prev).add(key));

    // Optimistic UI update (keeps the UI responsive)
    setLocalSummary((prev) => {
      if (!prev?.files) return prev;
      const nextFiles = prev.files.map((f) =>
        f.path === filePath ? { ...f, staged: stage } : f,
      );
      return { ...prev, files: nextFiles };
    });

    try {
      const res = await apiClient.gitStageFile(project.path, filePath, stage);
      setLastResult(res);

      if (res.code === 0) {
        toast.success(stage ? "Staged file" : "Unstaged file", {
          description: filePath,
        });
      } else {
        toast.error("Git command failed", {
          description: (res.stderr || res.stdout || "").trim().slice(0, 240),
        });
        // Revert optimistic update
        setLocalSummary((prev) => {
          if (!prev?.files) return prev;
          const nextFiles = prev.files.map((f) =>
            f.path === filePath ? { ...f, staged: !stage } : f,
          );
          return { ...prev, files: nextFiles };
        });
      }

      // Refresh in background without disabling the entire sheet
      void refresh();
    } catch (error: any) {
      toast.error("Operation failed", {
        description: (error?.message || "").slice(0, 240),
      });
      // Revert optimistic update
      setLocalSummary((prev) => {
        if (!prev?.files) return prev;
        const nextFiles = prev.files.map((f) =>
          f.path === filePath ? { ...f, staged: !stage } : f,
        );
        return { ...prev, files: nextFiles };
      });
    } finally {
      setPendingFileOps((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  const files = activeSummary?.files ?? [];

  async function stageAllFallback() {
    // Fallback for older preload builds where gitStageAll isn't exposed yet.
    for (const f of files) {
      await apiClient.gitStageFile(project.path, f.path, true);
    }
  }

  async function unstageAllFallback() {
    // Only unstage what is currently staged.
    for (const f of files) {
      if (f.staged) {
        await apiClient.gitStageFile(project.path, f.path, false);
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-bg-card border-border-main w-[520px] sm:max-w-[520px] p-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border-main">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="text-white truncate">
                  {project.name}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs truncate">
                  {formatBadgeSummary(activeSummary)}
                  {aheadBehindText ? ` • ${aheadBehindText}` : ""}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void refresh()}
                disabled={isRefreshing}
                className="shrink-0"
                aria-label="Refresh git status"
              >
                <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
              </Button>
            </div>

            {/* Sync Row */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  void runAndRefresh(() => apiClient.gitPull(project.path), {
                    successToast: "Pulled latest changes",
                    errorToast: "Pull failed",
                  })
                }
                disabled={isSyncing || isRefreshing || !activeSummary?.isRepo}
                className="border-border-main"
              >
                <ArrowDownToLine className="mr-2" /> Pull
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void runAndRefresh(() => apiClient.gitPush(project.path), {
                    successToast: "Pushed to remote",
                    errorToast: "Push failed",
                  })
                }
                disabled={isSyncing || isRefreshing || !activeSummary?.isRepo}
                className="border-border-main"
              >
                <ArrowUpFromLine className="mr-2" /> Push
              </Button>

              <div className="flex-1" />

              <div className="w-[220px]">
                <Select
                  value={branchValue}
                  onValueChange={(nextBranch) => {
                    if (!nextBranch) return;
                    void runAndRefresh(
                      () => apiClient.gitCheckout(project.path, nextBranch),
                      {
                        successToast: `Switched to ${nextBranch}`,
                        errorToast: "Checkout failed",
                      },
                    );
                  }}
                  disabled={isSyncing || isRefreshing || !activeSummary?.isRepo}
                >
                  <SelectTrigger className="bg-bg border-border-main text-text-main">
                    <GitBranch className="mr-2 h-4 w-4 opacity-70" />
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeSummary?.branches ?? []).map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetHeader>

          {/* File List */}
          <div className="flex-1 px-6 py-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white">
                Changed Files
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    isSyncing ||
                    isRefreshing ||
                    !activeSummary?.isRepo ||
                    files.length === 0
                  }
                  className="text-text-alt hover:text-white"
                  onClick={() =>
                    void runAndRefresh(
                      async () => {
                        const fn = (apiClient as any).gitStageAll;
                        if (typeof fn === "function") {
                          return fn(project.path);
                        }
                        await stageAllFallback();
                        return { code: 0, stdout: "Staged files", stderr: "" };
                      },
                      {
                        successToast: "Staged all changes",
                        errorToast: "Stage all failed",
                      },
                    )
                  }
                >
                  Stage All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    isSyncing ||
                    isRefreshing ||
                    !activeSummary?.isRepo ||
                    files.length === 0
                  }
                  className="text-text-alt hover:text-white"
                  onClick={() =>
                    void runAndRefresh(
                      async () => {
                        const fn = (apiClient as any).gitUnstageAll;
                        if (typeof fn === "function") {
                          return fn(project.path);
                        }
                        await unstageAllFallback();
                        return {
                          code: 0,
                          stdout: "Unstaged files",
                          stderr: "",
                        };
                      },
                      {
                        successToast: "Unstaged all changes",
                        errorToast: "Unstage all failed",
                      },
                    )
                  }
                >
                  Unstage All
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        isSyncing || isRefreshing || !activeSummary?.isRepo
                      }
                      className="text-text-alt hover:text-white"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Restore All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-bg-card border-border-main">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        Restore all changes?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will restore tracked files (both staged and
                        unstaged) to match HEAD.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          void runAndRefresh(
                            () => apiClient.gitRestoreAll(project.path),
                            {
                              successToast: "Restored changes",
                              errorToast: "Restore failed",
                            },
                          )
                        }
                      >
                        Restore
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="h-[360px] overflow-y-auto pr-1 rounded-md border border-border-main bg-bg">
              {activeSummary?.isRepo ? (
                files.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {files.map((file) => {
                      const isChecked = !!file.staged;
                      return (
                        <div
                          key={file.path}
                          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-bg-hover"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const stage = Boolean(checked);
                              void stageOneFile(file.path, stage);
                            }}
                            disabled={
                              isRefreshing || pendingFileOps.has(file.path)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-text-main truncate">
                              {file.path}
                            </div>
                            <div className="text-xs text-text-alt font-mono">
                              {fileStatusLabel(file)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-sm text-text-alt">
                    Working tree clean.
                  </div>
                )
              ) : (
                <div className="p-6 text-sm text-text-alt">
                  Not a git repository
                  {activeSummary?.error ? `: ${activeSummary.error}` : "."}
                </div>
              )}
            </div>

            {lastResult && (lastResult.stdout || lastResult.stderr) && (
              <div className="mt-3 rounded-md border border-border-main bg-bg p-3 text-xs font-mono text-text-alt whitespace-pre-wrap max-h-28 overflow-y-auto">
                {(lastResult.stdout || "").trim()}
                {lastResult.stderr ? `\n${lastResult.stderr.trim()}` : ""}
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-4 border-t border-border-main">
            <div className="w-full space-y-3">
              <Textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message"
                className="bg-bg border-border-main text-text-main"
                disabled={isSyncing || isRefreshing || !activeSummary?.isRepo}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-text-alt font-mono truncate">
                  {activeSummary?.upstream
                    ? `upstream: ${activeSummary.upstream}`
                    : ""}
                </div>
                <Button
                  onClick={() =>
                    void runAndRefresh(
                      () => apiClient.gitCommit(project.path, commitMessage),
                      {
                        successToast: "Committed",
                        errorToast: "Commit failed",
                      },
                    ).then(() => setCommitMessage(""))
                  }
                  disabled={
                    isSyncing ||
                    isRefreshing ||
                    !activeSummary?.isRepo ||
                    commitMessage.trim().length === 0
                  }
                >
                  Commit
                </Button>
              </div>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
