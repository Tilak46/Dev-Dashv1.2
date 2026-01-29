import { Button } from "@/components/ui/button";
import { LayoutGrid, FolderKanban } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-bg-darker p-4 flex flex-col border-r border-border-main">
      <div className="flex items-center gap-3 px-2 mb-8">
        <LayoutGrid className="text-accent" size={28} />
        <h1 className="text-xl font-bold text-white">DevDash</h1>
      </div>
      <nav className="flex flex-col gap-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-md gap-3 px-3 py-6 text-text-main hover:bg-bg-card hover:text-white"
        >
          <FolderKanban size={20} />
          Projects
        </Button>
        {/* Future navigation links like 'Workspaces' or 'Settings' will go here */}
      </nav>
    </aside>
  );
}
