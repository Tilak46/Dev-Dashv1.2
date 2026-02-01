import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import apiClient from "@/lib/apiClient";
import { Package, CircuitBoard, AlertCircle } from "lucide-react";
import type { Project } from "@/../types";

type Props = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Dependencies = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export function DependencyGraph({ project, open, onOpenChange }: Props) {
  const [data, setData] = useState<Dependencies | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && project) {
      setLoading(true);
      setError(null);
      setData(null);
      apiClient.getProjectDependencies(project.path)
        .then((res) => {
          if (res) {
            setData(res);
          } else {
            setError("Could not read package.json (or file is invalid).");
          }
        })
        .catch(() => setError("Failed to load dependencies."))
        .finally(() => setLoading(false));
    }
  }, [open, project]);

  const DependencyList = ({ deps, title, colorClass }: { deps: Record<string, string>, title: string, colorClass: string }) => {
    const entries = Object.entries(deps);
    if (entries.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
           <Package size={14} /> {title} <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full">{entries.length}</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {entries.map(([name, version]) => (
            <div key={name} className={`p-3 rounded-lg border border-white/5 bg-black/20 flex flex-col gap-1 transition-all hover:border-white/10 hover:bg-white/5 group ${colorClass}`}>
              <div className="font-mono text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors" title={name}>
                {name}
              </div>
              <div className="text-xs text-muted-foreground font-mono flex items-center justify-between">
                <span>{version}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-white/5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CircuitBoard className="text-primary" /> 
            Dependency X-Ray
            {project && <span className="text-muted-foreground font-normal mx-2">/</span>}
            {project && <span className="font-mono text-base bg-primary/10 text-primary px-2 py-0.5 rounded">{project.name}</span>}
          </DialogTitle>
          <DialogDescription>
            Visualize installed packages and version health.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4 custom-scrollbar">
          <div className="py-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground animate-pulse">
                <CircuitBoard size={48} className="animate-spin opacity-50" />
                <span>Scanning build matrix...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-destructive">
                 <AlertCircle size={48} />
                 <span>{error}</span>
              </div>
            )}

            {data && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DependencyList deps={data.dependencies} title="Production Dependencies" colorClass="hover:border-blue-500/30" />
                <DependencyList deps={data.devDependencies} title="Dev Dependencies" colorClass="hover:border-purple-500/30" />
                
                {Object.keys(data.dependencies).length === 0 && Object.keys(data.devDependencies).length === 0 && (
                     <div className="text-center py-20 text-muted-foreground">
                        No dependencies found in package.json
                     </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
