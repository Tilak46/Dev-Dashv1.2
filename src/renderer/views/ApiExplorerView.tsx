import { useState } from "react";
import { Sidebar } from "../components/api-explorer/ApiSidebar";
import { RequestPanel } from "../components/api-explorer/RequestPanel";
import { ResponsePanel } from "../components/api-explorer/ResponsePanel";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";

import { ApiRoute, ApiFolder, isRoute } from "../../types";

// Mock Data matching User's Screenshot/Example
const MOCK_API_TREE: ApiFolder[] = [
  {
    id: "f_travel",
    name: "TravelAgent",
    children: [
      {
        id: "f_auth",
        name: "Auth",
        children: [],
      },
      {
        id: "f_evisa",
        name: "E Visa",
        children: [
          {
            id: "f_evisa_app",
            name: "Application",
            children: [
              { id: "r_1", name: "Get Visa Countries", method: "GET", path: "/api/v1/travel-agent/e-visa/public/countries" },
              { id: "r_2", name: "List Visas For Country", method: "GET", path: "/api/v1/travel-agent/e-visa/public/list" },
              { id: "r_3", name: "Apply for Visa", method: "POST", path: "/api/v1/travel-agent/e-visa/apply" },
            ]
          }
        ]
      },
      {
        id: "f_hotels",
        name: "Hotels",
        children: [
            { id: "r_4", name: "Search Hotels", method: "POST", path: "/api/v1/hotels/search" },
            { id: "r_5", name: "Get Hotel Details", method: "GET", path: "/api/v1/hotels/:id" },
        ]
      }
    ]
  }
];

export function ApiExplorerView() {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [activeResponse, setActiveResponse] = useState<any>(null);

  const handleSelectRoute = (route: ApiRoute) => {
    setSelectedRoute(route);
    // Reset response when changing routes
    setActiveResponse(null); 
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-transparent">
      
      {/* LEFT SIDEBAR: Route Tree */}
      <div className="w-[300px] border-r border-white/5 flex flex-col bg-black/20">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Waitlist API</span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
                <RefreshCw size={12} />
            </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
            <Sidebar tree={MOCK_API_TREE} selectedId={selectedRoute?.id} onSelect={handleSelectRoute} />
        </div>
      </div>

      {/* MIDDLE: Request Panel (Split Vertically) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 bg-black/10">
         <div className="flex-1 min-h-0">
             {selectedRoute ? (
                <RequestPanel route={selectedRoute} onRun={(res) => setActiveResponse(res)} />
             ) : (
                <div className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground">
                    <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                        <Play size={24} className="opacity-50" />
                    </div>
                    <p>Select an API endpoint to start testing</p>
                </div>
             )}
         </div>
         {/* RESPONSE PANEL (Bottom Half) */}
         <div className="h-[40%] min-h-[200px]">
             <ResponsePanel response={activeResponse} />
         </div>
      </div>
    </div>
  );
}
