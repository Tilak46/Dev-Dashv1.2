import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Trash2, Sparkles } from "lucide-react";
import { explainLog } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

type LogViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  logs: string;
  projectName: string;
  projectId: string; // Need ID to clear logs
};

export function LogViewer({
  isOpen,
  onClose,
  logs,
  projectName,
  projectId,
}: LogViewerProps) {
  const logContainerRef = useRef<HTMLPreElement>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClearLogs = () => {
    window.api.clearLogs(projectId);
    setExplanation(null);
  };
  
  const handleExplain = async () => {
      setIsExplaining(true);
      try {
          // Get last 20 lines or so
          const lines = logs.split("\n").slice(-30).join("\n");
          if (!lines.trim()) return;
          const result = await explainLog(lines);
          setExplanation(result);
      } catch (e) {
          setExplanation("Failed to get explanation.");
      } finally {
          setIsExplaining(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card p-6 rounded-xl w-full max-w-4xl border border-white/10 shadow-2xl flex flex-col h-[85vh] relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                Terminal: <span className="text-primary">{projectName}</span>
             </h2>
             {logs && (
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-4 border-primary/30 text-primary hover:bg-primary/10 gap-2"
                            onClick={handleExplain}
                            disabled={isExplaining}
                        >
                            <Sparkles size={14} className={isExplaining ? "animate-spin" : ""} />
                            {isExplaining ? "Analyzing..." : "Explain Error"}
                        </Button>
                    </PopoverTrigger>
                    {explanation && (
                        <PopoverContent className="w-[400px] max-h-[300px] overflow-y-auto bg-popover/95 border-white/10 backdrop-blur text-sm">
                            <h4 className="font-semibold text-primary mb-2">AI Analysis</h4>
                            <div className="whitespace-pre-wrap text-muted-foreground">{explanation}</div>
                        </PopoverContent>
                    )}
                 </Popover>
             )}
          </div>
          <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleClearLogs}
                title="Clear Logs"
                className="hover:bg-destructive/10 hover:text-destructive"
            >
                <Trash2 className="h-5 w-5" />
            </Button>
             <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                <X size={20} />
            </Button>
          </div>
        </div>

        <pre
          ref={logContainerRef}
          className="bg-black/40 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-all overflow-y-auto flex-grow text-foreground/90 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent border border-white/5"
          dangerouslySetInnerHTML={{
            __html:
              logs ||
              "<span class='text-muted-foreground/50 italic'>Waiting for server output...</span>",
          }}
        />
      </div>
    </div>
  );
}
