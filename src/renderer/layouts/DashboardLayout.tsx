import React, { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutGrid,
  FolderKanban,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ListTree,
  Briefcase,
} from "lucide-react";

export type ActiveView = "projects" | "workspaces"; // Define possible views

type DashboardLayoutProps = {
  children: React.ReactNode;
  activeView: ActiveView; // Receive active view state
  onViewChange: (view: ActiveView) => void; // Function to change view
  onManageGroupsClick: () => void;
};

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  onManageGroupsClick,
}: DashboardLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper component for navigation buttons
  const NavButton = ({
    viewId,
    currentView,
    setView,
    icon: Icon,
    label,
    tooltip,
  }: {
    viewId: ActiveView;
    currentView: ActiveView;
    setView: (view: ActiveView) => void;
    icon: React.ElementType;
    label: string;
    tooltip: string;
  }) => {
    const isActive = viewId === currentView;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setView(viewId)}
            className={`flex items-center gap-4 h-12 rounded-lg transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-text-alt hover:bg-bg-card hover:text-white"
            } ${
              isExpanded ? "w-full px-4 justify-start" : "w-12 justify-center"
            }`} // Use w-full for expanded
          >
            <Icon className="h-6 w-6 flex-shrink-0" />{" "}
            {/* Added flex-shrink-0 */}
            {isExpanded && (
              <span className="font-semibold truncate">{label}</span>
            )}{" "}
            {/* Added truncate */}
            <span className="sr-only">{tooltip}</span>
          </button>
        </TooltipTrigger>
        {!isExpanded && <TooltipContent side="right">{tooltip}</TooltipContent>}
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-bg-darker text-text-main">
        {/* Sidebar */}
        <aside
          className={`h-screen bg-bg p-2 flex flex-col justify-between border-r border-border-main transition-all duration-300 ${
            isExpanded ? "w-64 items-start" : "w-16 items-center"
          }`}
        >
          {/* Top Sections Wrapper */}
          <div
            className={`w-full ${
              isExpanded ? "" : "flex flex-col items-center"
            }`}
          >
            {/* Logo & Toggle */}
            <div
              className={`flex items-center gap-3 p-2 mb-6 ${
                isExpanded ? "justify-between" : "justify-center"
              }`}
            >
              {isExpanded && (
                <h1 className="text-xl font-bold text-white pl-1">DevDash</h1>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-bg-card"
                title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isExpanded ? (
                  <PanelLeftClose size={24} />
                ) : (
                  <PanelLeftOpen size={24} />
                )}
                <span className="sr-only">
                  {isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                </span>
              </button>
            </div>

            {/* Middle Navigation */}
            <nav className="flex flex-col items-stretch gap-2 w-full">
              {" "}
              {/* Use items-stretch */}
              <NavButton
                viewId="projects"
                currentView={activeView}
                setView={onViewChange}
                icon={FolderKanban}
                label="Projects"
                tooltip="View Projects"
              />
              <NavButton
                viewId="workspaces"
                currentView={activeView}
                setView={onViewChange}
                icon={Briefcase}
                label="Workspaces"
                tooltip="View VS Code Workspaces"
              />
              {/* Manage Groups Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onManageGroupsClick}
                    className={`flex items-center gap-4 h-12 text-text-alt rounded-lg hover:bg-bg-card hover:text-white transition-colors ${
                      isExpanded
                        ? "w-full px-4 justify-start"
                        : "w-12 justify-center"
                    }`}
                  >
                    <ListTree className="h-6 w-6 flex-shrink-0" />
                    {isExpanded && (
                      <span className="font-semibold truncate">Organize</span>
                    )}
                    <span className="sr-only">Organize Projects/Groups</span>
                  </button>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right">
                    Organize Projects/Groups
                  </TooltipContent>
                )}
              </Tooltip>
            </nav>
          </div>

          {/* Bottom Section (Settings) */}
          <nav
            className={`flex flex-col items-stretch gap-2 w-full ${
              isExpanded ? "" : "items-center"
            }`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Make this a button for potential future settings view */}
                <button
                  className={`flex items-center gap-4 h-12 text-text-alt rounded-lg hover:bg-bg-card hover:text-white transition-colors ${
                    isExpanded
                      ? "w-full px-4 justify-start"
                      : "w-12 justify-center"
                  }`}
                  // onClick={() => onViewChange('settings')} // Future: Add settings view
                >
                  <Settings className="h-6 w-6 flex-shrink-0" />
                  {isExpanded && (
                    <span className="font-semibold truncate">Settings</span>
                  )}
                  <span className="sr-only">Settings</span>
                </button>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right">Settings</TooltipContent>
              )}
            </Tooltip>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto bg-bg">{children}</main>
      </div>
    </TooltipProvider>
  );
}
