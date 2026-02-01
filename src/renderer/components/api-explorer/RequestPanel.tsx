import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { ApiRoute, Method } from "../../../types";
import { cn } from "@/lib/utils";

type RequestPanelProps = {
  route: ApiRoute;
  onRun: (response: any) => void;
};

export function RequestPanel({ route, onRun }: RequestPanelProps) {
  const [method, setMethod] = useState<Method>(route.method);
  const [url, setUrl] = useState(route.path);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("body");
  const [bodyContent, setBodyContent] = useState("{\n\n}");

  // Sync state when route changes
  useEffect(() => {
    setMethod(route.method);
    // In real app, we would prepend {{baseUrl}} here based on env
    setUrl(`http://localhost:3000${route.path}`);
  }, [route]);

  const handleSend = async () => {
    setLoading(true);
    
    // Simulate API Call for UI Design Phase
    setTimeout(() => {
        setLoading(false);
        onRun({
            status: 200,
            statusText: "OK",
            time: "145ms",
            size: "1.2KB",
            data: {
                message: "Success",
                items: [
                    { id: 1, name: "Visa Type A" },
                    { id: 2, name: "Visa Type B" }
                ]
            }
        });
    }, 800);
  };

  return (
    <div className="flex flex-col h-full">
        {/* URL BAR */}
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                <SelectTrigger className={cn("w-[100px] border-none font-bold", 
                    method === "GET" && "text-blue-400",
                    method === "POST" && "text-yellow-400",
                    method === "DELETE" && "text-red-400",
                    method === "PUT" && "text-orange-400",
                )}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    <SelectItem value="GET" className="text-blue-400 font-medium">GET</SelectItem>
                    <SelectItem value="POST" className="text-yellow-400 font-medium">POST</SelectItem>
                    <SelectItem value="PUT" className="text-orange-400 font-medium">PUT</SelectItem>
                    <SelectItem value="DELETE" className="text-red-400 font-medium">DELETE</SelectItem>
                </SelectContent>
            </Select>

            <Input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-black/20 border-white/5 font-mono text-sm h-10" 
            />

            <Button onClick={handleSend} disabled={loading} className="bg-primary hover:bg-primary/90 text-white min-w-[100px] gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                Send
            </Button>
        </div>

        {/* REQUEST TABS */}
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-col flex-1 h-full">
                <div className="px-4 border-b border-white/5">
                    <TabsList className="bg-transparent h-10 w-full justify-start gap-6 p-0">
                        <TabTriggerItem value="params" label="Params" />
                        <TabTriggerItem value="headers" label="Headers" count={1} />
                        <TabTriggerItem value="body" label="Body" />
                        <TabTriggerItem value="auth" label="Auth" />
                    </TabsList>
                </div>

                <div className="flex-1 bg-[#111] relative overflow-hidden">
                     {/* BODY EDITOR PLACEHOLDER */}
                    <TabsContent value="body" className="mt-0 h-full p-0">
                        <textarea 
                            className="w-full h-full bg-transparent p-4 font-mono text-sm text-white/80 resize-none focus:outline-none"
                            value={bodyContent}
                            onChange={(e) => setBodyContent(e.target.value)}
                            spellCheck={false}
                        />
                        {method === "GET" && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                                <span className="text-muted-foreground text-sm">GET requests typically don't have a body</span>
                            </div>
                        )}
                    </TabsContent>
                    
                     <TabsContent value="headers" className="mt-0 h-full p-4 text-muted-foreground text-sm">
                        {/* Headers Table Placeholder */}
                        <div className="grid grid-cols-[1fr_1fr] gap-4">
                            <div className="border border-white/10 rounded p-2 text-white">Content-Type</div>
                            <div className="border border-white/10 rounded p-2 text-white">application/json</div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    </div>
  );
}

function TabTriggerItem({ value, label, count }: { value: string, label: string, count?: number }) {
    return (
        <TabsTrigger 
            value={value} 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-white text-muted-foreground px-0 pb-2 relative"
        >
            {label}
            {count && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1 rounded-full">{count}</span>}
        </TabsTrigger>
    )
}
