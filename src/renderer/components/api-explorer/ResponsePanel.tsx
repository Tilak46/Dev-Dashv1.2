import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ResponsePanelProps = {
  response: any;
};

export function ResponsePanel({ response }: ResponsePanelProps) {
  if (!response) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-t border-white/5 bg-[#0A0A0A]">
            <p className="text-sm">Response will appear here</p>
        </div>
    );
  }

  const isError = response.status >= 400;

  return (
    <div className="h-full flex flex-col border-t border-white/10 bg-[#0A0A0A] animate-in slide-in-from-bottom-2 duration-200">
        {/* RESPONSE HEADER */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 text-xs">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={cn("font-medium", isError ? "text-red-400" : "text-green-400")}>
                        {response.status} {response.statusText}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-foreground">{response.time}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="text-foreground">{response.size}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button className="text-muted-foreground hover:text-white transition-colors">Copy</button>
            </div>
        </div>

        {/* RESPONSE BODY */}
        <ScrollArea className="flex-1">
            <div className="p-4">
                <pre className="text-xs font-mono text-white/90 leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(response.data, null, 2)}
                </pre>
            </div>
        </ScrollArea>
    </div>
  );
}
