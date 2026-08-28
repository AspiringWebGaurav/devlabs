"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectDocument } from "@/types/portfolio";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  reorderProjectsAction,
} from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

import {
  FaPlus,
  FaPenToSquare,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaFloppyDisk,
  FaRotateRight,
  FaCheck,
  FaXmark,
} from "react-icons/fa6";

export const ProjectsManager: React.FC<{ initialProjects: ProjectDocument[] }> = ({ initialProjects }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [projects, setProjects] = useState<ProjectDocument[]>(initialProjects);
  const [editingProject, setEditingProject] = useState<Partial<ProjectDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "projects" || event.data?.domain === "all") {
          startTransition(() => {
            router.refresh();
          });
        }
      };
      return () => channel.close();
    } catch {}
  }, [router]);

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === projects.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...projects];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setProjects(reordered);
    setIsPending(true);

    const orderedIds = reordered.map((p) => p.id);
    const res = await reorderProjectsAction(orderedIds);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("projects");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Projects order updated and live cache revalidated." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reorder projects." });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Permanently delete project "${title}"? Associated storage files will be cleaned.`)) return;
    setIsPending(true);

    const res = await deleteProjectAction(id);
    setIsPending(false);

    if (res.success) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      broadcastClientCmsChange("projects");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Project "${title}" deleted.` });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to delete project." });
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setIsPending(true);
    setStatusMessage(null);

    const payload = {
      title: editingProject.title || "",
      description: editingProject.description || "",
      coverImage: editingProject.coverImage || "",
      coverImageStoragePath: editingProject.coverImageStoragePath || "",
      iconLists: Array.isArray(editingProject.iconLists) ? editingProject.iconLists : [],
      liveUrl: editingProject.liveUrl || "",
      githubUrl: editingProject.githubUrl || "",
      isFeatured: editingProject.isFeatured ?? true,
      isPublished: editingProject.isPublished ?? true,
    };

    if (isCreating) {
      const res = await createProjectAction(payload);
      setIsPending(false);
      if (res.success && res.data) {
        setProjects((prev) => [...prev, res.data as ProjectDocument]);
        setIsCreating(false);
        setEditingProject(null);
        broadcastClientCmsChange("projects");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "New project created and published." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to create project." });
      }
    } else if (editingProject.id) {
      const res = await updateProjectAction(editingProject.id, payload);
      setIsPending(false);
      if (res.success && res.data) {
        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? (res.data as ProjectDocument) : p))
        );
        setEditingProject(null);
        broadcastClientCmsChange("projects");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Project updated successfully." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to update project." });
      }
    }
  };


  return (
    <div className="space-y-6 w-full">
      {statusMessage && (
        <div
          className={`p-4 rounded-sm border text-xs font-admin-mono flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          {statusMessage.type === "success" ? <FaCheck className="w-3.5 h-3.5" /> : null}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-admin-mono text-[#64748B]">
          {projects.length} Total Projects Configured
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingProject({
              title: "",
              description: "",
              coverImage: "/p1.svg",
              iconLists: ["/re.svg", "/tail.svg", "/ts.svg"],
              liveUrl: "https://",
              githubUrl: "https://github.com/",
              isFeatured: true,
              isPublished: true,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm transition-all cursor-pointer"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add New Project</span>
          <ButtonHelpBadge text={BUTTON_HELP.CREATE_ITEM} />
        </button>
      </div>

      {/* Project Editor Modal / Inline Form */}
      {editingProject && (
        <form
          onSubmit={handleSaveForm}
          className="bg-[#FFFFFF] border-2 border-[#7C3AED] rounded-sm p-6 space-y-5 shadow-md animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h2 className="text-base font-bold font-admin-sans text-black">
              {isCreating ? "Create New Project" : `Edit Project: ${editingProject.title}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setIsCreating(false);
              }}
              className="text-[#64748B] hover:text-black p-1"
            >
              <FaXmark className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Project Title
              </label>
              <input
                type="text"
                value={editingProject.title || ""}
                onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Cover Image URL / Path
              </label>
              <input
                type="text"
                value={editingProject.coverImage || ""}
                onChange={(e) => setEditingProject({ ...editingProject, coverImage: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Live Deployment URL
              </label>
              <input
                type="text"
                value={editingProject.liveUrl || ""}
                onChange={(e) => setEditingProject({ ...editingProject, liveUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                GitHub Repository URL
              </label>
              <input
                type="text"
                value={editingProject.githubUrl || ""}
                onChange={(e) => setEditingProject({ ...editingProject, githubUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Description
            </label>
            <textarea
              rows={3}
              value={editingProject.description || ""}
              onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Tech Stack Icon URLs (Comma separated)
            </label>
            <input
              type="text"
              value={(editingProject.iconLists || []).join(", ")}
              onChange={(e) =>
                setEditingProject({
                  ...editingProject,
                  iconLists: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
              placeholder="/re.svg, /tail.svg, /ts.svg"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-admin-mono text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProject.isFeatured ?? true}
                  onChange={(e) => setEditingProject({ ...editingProject, isFeatured: e.target.checked })}
                  className="rounded text-[#7C3AED]"
                />
                <span>Featured Project</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-admin-mono text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProject.isPublished ?? true}
                  onChange={(e) => setEditingProject({ ...editingProject, isPublished: e.target.checked })}
                  className="rounded text-[#7C3AED]"
                />
                <span>Published Live</span>
              </label>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 text-xs font-admin-mono text-[#64748B] hover:text-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isPending ? <FaRotateRight className="w-3.5 h-3.5 animate-spin" /> : <FaFloppyDisk className="w-3.5 h-3.5" />}
                <span>{isCreating ? "Create Project" : "Save Changes"}</span>
                <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Projects Table / List */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs">
        <div className="divide-y divide-[#F1F5F9]">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="font-admin-mono text-xs font-bold text-[#94A3B8] w-6">
                  0{index + 1}.
                </span>
                <div className="w-12 h-12 rounded bg-[#04071D] border border-[#E2E8F0] overflow-hidden flex items-center justify-center shrink-0">
                  <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-admin-sans text-black flex items-center gap-2">
                    {project.title}
                    {!project.isPublished && (
                      <span className="px-1.5 py-0.5 text-[9px] font-admin-mono bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] rounded-xs uppercase">
                        Draft
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5 max-w-lg">
                    {project.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {/* Reorder Buttons */}
                <button
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0 || isPending}
                  className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                  title={BUTTON_HELP.MOVE_UP}
                >
                  <FaArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === projects.length - 1 || isPending}
                  className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                  title={BUTTON_HELP.MOVE_DOWN}
                >
                  <FaArrowDown className="w-3 h-3" />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProject(project);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono text-[#7C3AED] hover:text-[#6D28D9] border border-[#DDD6FE] bg-[#F5F3FF] hover:bg-[#EDE9FE] rounded-sm cursor-pointer"
                >
                  <FaPenToSquare className="w-3 h-3" />
                  <span>Edit</span>
                  <ButtonHelpBadge text={BUTTON_HELP.EDIT_ITEM} />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(project.id, project.title)}
                  className="flex items-center gap-1 p-2 text-[#991B1B] hover:text-[#FFFFFF] bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FCA5A5] hover:border-[#DC2626] rounded-sm cursor-pointer"
                  title="Delete Project"
                >
                  <FaTrash className="w-3 h-3" />
                  <ButtonHelpBadge text={BUTTON_HELP.DELETE_ITEM} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
