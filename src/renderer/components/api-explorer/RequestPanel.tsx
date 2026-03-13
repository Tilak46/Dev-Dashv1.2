import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { PlayCircle, Loader2 } from "lucide-react";
import { ApiRoute, Method } from "../../../types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RequestPanelProps = {
  route: ApiRoute;
  baseUrl: string;
  onRun: (response: any) => void;
};

export function RequestPanel({ route, baseUrl, onRun }: RequestPanelProps) {
  const [method, setMethod] = useState<Method>(route.method);
  const [url, setUrl] = useState(route.path);
  const [loading, setLoading] = useState(false);
  const [bodyContent, setBodyContent] = useState("{\n\n}");

  // Sync state when route changes
  useEffect(() => {
    setMethod(route.method);
    const base = String(baseUrl || "")
      .trim()
      .replace(/\/+$/, "");
    setUrl(`${base}${route.path}`);
  }, [route, baseUrl]);

  const handleSend = async () => {
    setLoading(true);

    const started = performance.now();
    try {
      const headers: Record<string, string> = {};

      let body: string | undefined;
      if (method !== "GET") {
        const raw = String(bodyContent ?? "");
        try {
          if (raw.trim()) {
            JSON.parse(raw);
            headers["Content-Type"] = "application/json";
            body = raw;
          }
        } catch {
          body = raw;
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
      });

      const text = await res.text();
      const ended = performance.now();
      const bytes = new TextEncoder().encode(text).length;
      const contentType = res.headers.get("content-type") || "";

      let data: any = text;
      if (contentType.toLowerCase().includes("application/json")) {
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
      }

      onRun({
        status: res.status,
        statusText: res.statusText,
        time: `${Math.round(ended - started)}ms`,
        size: `${bytes}B`,
        data,
      });
    } catch (err: any) {
      const ended = performance.now();
      onRun({
        status: 0,
        statusText: "Network Error",
        time: `${Math.round(ended - started)}ms`,
        size: "0B",
        data: {
          error: String(err?.message || err),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const methodColors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-green-500/20 text-green-400",
    PUT: "bg-orange-500/20 text-orange-400",
    DELETE: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-white/10 p-4 shrink-0 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
          <SelectTrigger
            className={cn(
              "w-[90px] h-[34px] border-none font-bold text-xs rounded px-2",
              methodColors[method] || "bg-gray-500/20 text-gray-400"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectItem value="GET" className="text-blue-400 font-medium">GET</SelectItem>
            <SelectItem value="POST" className="text-green-400 font-medium">POST</SelectItem>
            <SelectItem value="PUT" className="text-orange-400 font-medium">PUT</SelectItem>
            <SelectItem value="DELETE" className="text-red-400 font-medium">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-black rounded p-2 text-sm font-mono text-gray-300 border border-white/5 h-[34px]"
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 h-[34px] rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors min-w-[100px]"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <PlayCircle size={16} />
          )}
          Send
        </button>
      </div>

      <div className="text-sm text-gray-400 mb-2 border-b border-white/5 pb-2">Body (JSON)</div>
      
      <div className="relative">
        <textarea
          className="w-full h-32 bg-black p-4 rounded border border-white/5 font-mono text-xs text-green-300 resize-none focus:outline-none focus:border-white/20 transition-colors"
          value={bodyContent}
          onChange={(e) => setBodyContent(e.target.value)}
          spellCheck={false}
        />
        {method === "GET" && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center rounded border border-transparent pointer-events-none">
            <span className="text-gray-500 text-sm">
              GET requests typically don't have a body
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
