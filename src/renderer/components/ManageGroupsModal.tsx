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
  DialogDescription,
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
import { GripVertical, FolderOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Draggable Project Item ---
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
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
         "group flex items-center gap-3 p-3 mb-2 rounded-lg transition-all border select-none",
         "bg-card border-white/5 hover:border-white/10 hover:bg-accent/5",
         isDragging && "ring-2 ring-primary shadow-xl rotate-2 scale-105 bg-card/90"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/50 hover:text-foreground p-1 rounded hover:bg-white/10 transition-colors"
      >
        <GripVertical size={14} />
      </button>
      <span className="flex-grow text-sm font-medium text-foreground truncate">
        {project.name}
      </span>
    </div>
  );
}

// --- Droppable List Component ---
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

  return (
    <div className="flex flex-col h-[400px] bg-black/20 rounded-xl border border-white/5 overflow-hidden">
      <div className={cn(
          "px-4 py-3 border-b border-white/5 flex items-center gap-2",
          isOver && "bg-primary/10"
      )}>
        <Layers size={16} className={cn("text-muted-foreground", isOver && "text-primary")} />
        <h3 className={cn("text-sm font-semibold text-foreground", isOver && "text-primary")}>{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
            {projects.length}
        </span>
      </div>
      
      <div
        ref={setNodeRef}
         className={cn(
            "flex-1 p-3 overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
            isOver ? "bg-primary/5" : "bg-transparent"
         )}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <DraggableProjectItem key={project.id} project={project} />
          ))}
          {projects.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-sm text-muted-foreground/40 italic border-2 border-dashed border-white/5 rounded-lg">
                <FolderOpen size={24} className="mb-2 opacity-50" />
              {id === "ungrouped"
                ? "Dropped projects will become ungrouped"
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col bg-card/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b border-white/5">
          <DialogTitle className="text-2xl font-bold tracking-tight text-glow">
            Organize Projects
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
              Drag and drop projects between columns to organize them into groups.
          </DialogDescription>
        </DialogHeader>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-grow p-8 overflow-y-auto bg-black/20">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                {/* Ungrouped List - Always distinct */}
                <div className="md:col-span-1">
                    <DroppableList
                    id="ungrouped"
                    title="Ungrouped Projects"
                    projects={ungroupedProjects}
                    />
                </div>
                
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
          </div>

          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay>
                  {activeProject ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-primary/50 shadow-2xl ring-2 ring-primary/20 cursor-grabbing w-[280px]">
                      <GripVertical size={16} className="text-primary" />
                      <span className="flex-grow text-sm font-semibold text-foreground truncate">
                        {activeProject.name}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.body,
              )
            : null}
        </DndContext>
        
        <DialogFooter className="px-8 py-4 border-t border-white/5 bg-muted/20">
          <Button onClick={onClose} size="lg" className="px-8 shadow-lg shadow-primary/20">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
