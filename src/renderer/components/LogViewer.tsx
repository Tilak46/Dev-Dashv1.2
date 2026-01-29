import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

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

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClearLogs = () => {
    window.api.clearLogs(projectId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-bg-card p-6 rounded-xl w-full max-w-3xl border border-border-main shadow-2xl flex flex-col h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Terminal Logs: {projectName}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearLogs}
            title="Clear Logs"
          >
            <Trash2 className="h-5 w-5 text-text-alt hover:text-red" />
          </Button>
        </div>

        <pre
          ref={logContainerRef}
          className="bg-bg-darker p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-all overflow-y-auto flex-grow text-text-main scrollbar-thin scrollbar-thumb-border-main scrollbar-track-bg-darker"
          // Add fallback text directly within the pre tag for better accessibility
          dangerouslySetInnerHTML={{
            __html:
              logs ||
              "<span class='text-gray-500 italic'>Waiting for server output...</span>",
          }}
        />

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose}>
            <X className="mr-2" size={18} /> Close
          </Button>
        </div>
      </div>
    </div>
  );
}
