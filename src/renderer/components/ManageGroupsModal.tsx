import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Project, Group } from "@/../types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// --- Draggable Project Item ---
// Apply consistent theme colors
function DraggableProjectItem({ project }: { project: Project }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Use theme colors: bg-bg, border-border-main, text-text-main
      className={`p-2 mb-2 bg-bg border border-border-main rounded-md flex items-center gap-2 ${
        isDragging ? "shadow-lg ring-2 ring-accent" : ""
      }`}
    >
      {/* Use theme colors: text-text-alt, hover:text-white */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-text-alt hover:text-white p-1"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex-grow text-sm text-text-main truncate">
        {project.name}
      </span>
    </div>
  );
}

// --- Droppable List Component ---
// Apply consistent theme colors and drop state colors
function DroppableList({
  id,
  title,
  projects,
}: {
  id: UniqueIdentifier;
  title: string;
  projects: Project[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  // Define styles based on theme variables
  const baseStyle: React.CSSProperties = {
    backgroundColor: "var(--bg)", // Base background color
    borderColor: "var(--border-main)", // Base border color
    borderStyle: "solid",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
  };

  const dropStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-hover)", // Highlight background on hover
    borderColor: "var(--accent)", // Highlight border on hover
    borderStyle: "dashed",
  };

  // Combine styles based on isOver state
  const style = isOver ? { ...baseStyle, ...dropStyle } : baseStyle;

  return (
    <div className="flex-1 flex flex-col min-w-[250px]">
      {" "}
      {/* Increased min-width slightly */}
      {/* Use theme color: text-white */}
      <h3 className="text-lg font-semibold text-white mb-3 px-2">{title}</h3>
      <div
        ref={setNodeRef}
        style={style}
        // Use theme color: border-border-main, add scrollbar styling
        className="border border-border-main rounded-lg p-2 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border-main scrollbar-track-bg"
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <DraggableProjectItem key={project.id} project={project} />
          ))}
          {projects.length === 0 && (
            // Use theme color: text-gray-500
            <div className="text-center text-sm text-gray-500 py-4 italic">
              {id === "ungrouped"
                ? "Drag projects here to make them ungrouped"
                : "Drop projects here"}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// --- Main ManageGroupsModal Component ---
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  groups: Group[];
  onAssignProjectGroup: (projectId: string, groupId: string | null) => void;
};

export function ManageGroupsModal({
  isOpen,
  onClose,
  projects: initialProjects,
  groups,
  onAssignProjectGroup,
}: ModalProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: any) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const project = initialProjects.find((p) => p.id === active.id);
      if (!project) return;

      const targetGroupId = over.id === "ungrouped" ? null : String(over.id);
      const currentGroupId = project.groupId ?? null;

      if (currentGroupId !== targetGroupId) {
        onAssignProjectGroup(String(active.id), targetGroupId);
      }
    }
  }

  const ungroupedProjects = initialProjects.filter((p) => !p.groupId);
  const projectsByGroup = groups.reduce(
    (acc, group) => {
      acc[group.id] = initialProjects.filter((p) => p.groupId === group.id);
      return acc;
    },
    {} as { [groupId: string]: Project[] },
  );

  const activeProject = activeId
    ? initialProjects.find((p) => p.id === activeId)
    : null;

  // Use theme colors for DialogContent
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-bg-card border-border-main">
        {" "}
        {/* Apply theme colors */}
        <DialogHeader>
          {/* Use theme color: text-white */}
          <DialogTitle className="text-white">
            Organize Projects into Groups
          </DialogTitle>
        </DialogHeader>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Use theme color: bg-bg-darker */}
          <div className="flex-grow flex gap-4 overflow-x-auto py-4 px-1 bg-bg-darker rounded-md">
            {" "}
            {/* Added padding and bg */}
            {/* Ungrouped List */}
            <DroppableList
              id="ungrouped"
              title="Ungrouped"
              projects={ungroupedProjects}
            />
            {/* Group Lists */}
            {groups.map((group) => (
              <DroppableList
                key={group.id}
                id={group.id}
                title={group.name}
                projects={projectsByGroup[group.id] || []}
              />
            ))}
          </div>

          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay>
                  {activeProject ? (
                    // Use theme colors: bg-bg-hover, border-accent, text-text-main
                    <div className="p-2 bg-bg-hover border border-accent rounded-md flex items-center gap-2 shadow-lg cursor-grabbing">
                      <GripVertical size={16} className="text-text-alt" />
                      <span className="flex-grow text-sm text-text-main truncate">
                        {activeProject.name}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body,
              )
            : null}
        </DndContext>
        {/* Use theme color: border-border-main */}
        <DialogFooter className="mt-auto pt-4 border-t border-border-main">
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
