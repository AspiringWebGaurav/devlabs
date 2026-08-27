"use client";

import React, { useState } from "react";
import type { ProjectDocument } from "@/types/portfolio";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  reorderProjectsAction,
} from "@/lib/actions/cms.actions";
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
  const [projects, setProjects] = useState<ProjectDocument[]>(initialProjects);
  const [editingProject, setEditingProject] = useState<Partial<ProjectDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Project Title
              </label>
              <input
                type="text"
                value={editingProject.title || ""}
                onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Cover Image URL
              </label>
              <input
                type="text"
                value={editingProject.coverImage || ""}
                onChange={(e) => setEditingProject({ ...editingProject, coverImage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Description
            </label>
            <textarea
              rows={2}
              value={editingProject.description || ""}
              onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Live URL (Strictly HTTPS)
              </label>
              <input
                type="url"
                value={editingProject.liveUrl || ""}
                onChange={(e) => setEditingProject({ ...editingProject, liveUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                placeholder="https://..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={editingProject.githubUrl || ""}
                onChange={(e) => setEditingProject({ ...editingProject, githubUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                placeholder="https://github.com/..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Tech Stack Icon Paths (comma-separated)
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
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              placeholder="/re.svg, /tail.svg, /ts.svg"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-admin-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProject.isPublished !== false}
                  onChange={(e) => setEditingProject({ ...editingProject, isPublished: e.target.checked })}
                  className="w-4 h-4 text-[#7C3AED] rounded"
                />
                <span>Published</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-admin-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProject.isFeatured !== false}
                  onChange={(e) => setEditingProject({ ...editingProject, isFeatured: e.target.checked })}
                  className="w-4 h-4 text-[#7C3AED] rounded"
                />
                <span>Featured</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 border border-[#E2E8F0] text-xs font-admin-mono text-[#64748B] hover:text-black rounded-sm cursor-pointer"
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
                  title="Move Up"
                >
                  <FaArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === projects.length - 1 || isPending}
                  className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                  title="Move Down"
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
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(project.id, project.title)}
                  className="p-2 text-[#991B1B] hover:text-[#FFFFFF] bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FCA5A5] hover:border-[#DC2626] rounded-sm cursor-pointer"
                  title="Delete Project"
                >
                  <FaTrash className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
