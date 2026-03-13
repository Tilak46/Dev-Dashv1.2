import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

type ResponsePanelProps = {
  response: any;
};

export function ResponsePanel({ response }: ResponsePanelProps) {
  if (!response) {
    return (
      <div className="flex-1 bg-[#0f0f0f] rounded-xl border border-white/10 p-4 flex flex-col min-h-[200px]">
        <div className="text-sm font-medium text-gray-300 mb-4 flex justify-between items-center">
          <span>Response</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Hit Send to test endpoint.
        </div>
      </div>
    );
  }

  const isError = response.status >= 400;

  return (
    <div className="flex-1 bg-[#0f0f0f] rounded-xl border border-white/10 p-4 flex flex-col min-h-[200px] animate-in fade-in duration-200">
      {/* RESPONSE HEADER */}
      <div className="text-sm font-medium text-gray-300 mb-4 flex justify-between items-center">
        <span>Response</span>
        <div className="flex gap-3 text-xs">
          <span className={cn("flex items-center gap-1", isError ? "text-red-400" : "text-green-400")}>
            {isError ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
            {response.status} {response.statusText}
          </span>
          <span className="text-gray-500">{response.time}</span>
          <span className="text-gray-500">{response.size}</span>
        </div>
      </div>

      {/* RESPONSE BODY */}
      <pre className="flex-1 font-mono text-xs text-blue-300 bg-black p-4 rounded border border-white/5 overflow-auto whitespace-pre-wrap">
        {typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data, null, 2)}
      </pre>
    </div>
  );
}

