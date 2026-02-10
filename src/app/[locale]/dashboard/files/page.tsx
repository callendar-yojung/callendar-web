"use client";

import { useTranslations } from "next-intl";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface FileRecord {
  file_id: number;
  owner_type: "personal" | "team";
  owner_id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilesData {
  files: FileRecord[];
  pagination: Pagination;
  stats: {
    total: number;
    images: number;
    documents: number;
    others: number;
  };
}

type FilterType = "all" | "image" | "document" | "other";

const ITEMS_PER_PAGE = 24;

export default function FilesPage() {
  const t = useTranslations("dashboard.files");
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [filesData, setFilesData] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<"single" | "bulk" | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      setError(null);
      const typeParam = filter === "all" ? "" : `&type=${filter}`;
      const url = `/api/me/files?workspace_id=${currentWorkspace.workspace_id}&page=${page}&limit=${ITEMS_PER_PAGE}${typeParam}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await response.json();
      setFilesData(data);
    } catch (err) {
      console.error("Error fetching files:", err);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, filter, page, t]);

  useEffect(() => {
    setPage(1);
    setSelectedFiles(new Set());
  }, [filter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedFiles(new Set());
  };

  const toggleFileSelection = (fileId: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    if (!filesData) return;
    const allIds = new Set(filesData.files.map((f) => f.file_id));
    setSelectedFiles(allIds);
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleSingleDelete = async (file: FileRecord) => {
    if (!currentWorkspace) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/me/files?file_id=${file.file_id}&workspace_id=${currentWorkspace.workspace_id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      await fetchFiles();
      setDeleteConfirm(null);
      setFileToDelete(null);
      setSelectedFile(null);
    } catch (err) {
      console.error("Error deleting file:", err);
      alert(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!currentWorkspace || selectedFiles.size === 0) return;

    try {
      setDeleting(true);
      const response = await fetch("/api/me/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_delete",
          file_ids: Array.from(selectedFiles),
          workspace_id: currentWorkspace.workspace_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete files");
      }

      const result = await response.json();

      await fetchFiles();
      setDeleteConfirm(null);
      setSelectedFiles(new Set());
      setIsSelectMode(false);

      if (result.failed?.length > 0) {
        alert(t("bulkDeletePartial", { deleted: result.deleted.length, failed: result.failed.length }));
      }
    } catch (err) {
      console.error("Error deleting files:", err);
      alert(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDownload = () => {
    if (!filesData) return;

    const selectedFilesList = filesData.files.filter((f) =>
      selectedFiles.has(f.file_id)
    );

    selectedFilesList.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = getFileUrl(file.file_path);
        link.download = file.original_name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("document") || mimeType.includes("text")) return "📝";
    if (mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("presentation")) return "📽️";
    if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦";
    if (mimeType.includes("video")) return "🎬";
    if (mimeType.includes("audio")) return "🎵";
    return "📄";
  };

  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith("image/") || false;
  };

  const getFileUrl = (filePath: string) => {
    if (filePath.startsWith("/uploads/")) {
      return filePath;
    }
    const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "";
    const region = process.env.NEXT_PUBLIC_AWS_REGION || "";
    return `https://${bucket}.s3.${region}.amazonaws.com${filePath}`;
  };

  if (workspaceLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 rounded bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  const files = filesData?.files || [];
  const stats = filesData?.stats || { total: 0, images: 0, documents: 0, others: 0 };
  const pagination = filesData?.pagination || { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false };

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={toggleSelectMode}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            isSelectMode
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {isSelectMode ? t("cancelSelect") : t("selectMode")}
        </button>
      </div>

      {/* Selection Actions Bar */}
      {isSelectMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted p-3">
          <span className="text-sm text-muted-foreground">
            {t("selectedCount", { count: selectedFiles.size })}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-card/80"
          >
            {t("selectAll")}
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-card/80"
          >
            {t("deselectAll")}
          </button>
          {selectedFiles.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleBulkDownload}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {t("downloadSelected")} ({selectedFiles.size})
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm("bulk")}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                {t("deleteSelected")} ({selectedFiles.size})
              </button>
            </>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleFilterChange("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("all")} ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("image")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "image"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          🖼️ {t("images")} ({stats.images})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("document")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "document"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          📄 {t("documents")} ({stats.documents})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("other")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "other"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          📦 {t("others")} ({stats.others})
        </button>
      </div>

      {/* File Grid */}
      {files.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <span className="text-4xl">📁</span>
          <p className="mt-4 text-lg font-medium text-foreground">
            {t("noFiles")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noFilesDesc")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {files.map((file) => {
              const isSelected = selectedFiles.has(file.file_id);
              return (
                <div
                  key={file.file_id}
                  className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border bg-card hover:border-primary hover:shadow-lg"
                  }`}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleFileSelection(file.file_id);
                    } else {
                      setSelectedFile(file);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isSelectMode) {
                        toggleFileSelection(file.file_id);
                      } else {
                        setSelectedFile(file);
                      }
                    }
                  }}
                >
                  {/* Checkbox for select mode */}
                  {isSelectMode && (
                    <div className="absolute left-2 top-2 z-10">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white bg-black/30 text-transparent"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Thumbnail or Icon */}
                  <div className="relative aspect-square bg-muted">
                    {isImage(file.mime_type) ? (
                      <Image
                        src={getFileUrl(file.file_path)}
                        alt={file.original_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl">
                        {getFileIcon(file.mime_type)}
                      </div>
                    )}

                    {/* Hover overlay with delete button (not in select mode) */}
                    {!isSelectMode && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileToDelete(file);
                            setDeleteConfirm("single");
                          }}
                          className="rounded-full bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
                          title={t("delete")}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {file.original_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={!pagination.hasPrev}
                className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrev}
                className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
              >
                ‹
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        page === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext}
                className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setPage(pagination.totalPages)}
                disabled={!pagination.hasNext}
                className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
              >
                »
              </button>

              <span className="ml-4 text-sm text-muted-foreground">
                {t("pageInfo", { current: page, total: pagination.totalPages, items: pagination.total })}
              </span>
            </div>
          )}
        </>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedFile(null)}
          onKeyDown={(e) => e.key === "Escape" && setSelectedFile(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-card"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Preview Content */}
            <div className="flex max-h-[70vh] items-center justify-center bg-muted p-4">
              {isImage(selectedFile.mime_type) ? (
                <img
                  src={getFileUrl(selectedFile.file_path)}
                  alt={selectedFile.original_name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-8xl">
                    {getFileIcon(selectedFile.mime_type)}
                  </span>
                  <p className="mt-4 text-lg font-medium text-muted-foreground">
                    {t("noPreview")}
                  </p>
                </div>
              )}
            </div>

            {/* File Details */}
            <div className="border-t border-border p-4">
              <h3 className="text-lg font-semibold text-card-foreground">
                {selectedFile.original_name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(selectedFile.file_size)}</span>
                <span>{formatDate(selectedFile.created_at)}</span>
                <span>{selectedFile.mime_type || t("unknownType")}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={getFileUrl(selectedFile.file_path)}
                  download={selectedFile.original_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("download")}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileToDelete(selectedFile);
                    setDeleteConfirm("single");
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setDeleteConfirm(null);
            setFileToDelete(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDeleteConfirm(null);
              setFileToDelete(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-card p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-card-foreground">
              {deleteConfirm === "bulk" ? t("bulkDeleteConfirmTitle") : t("deleteConfirmTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteConfirm === "bulk"
                ? t("bulkDeleteConfirmMessage", { count: selectedFiles.size })
                : t("deleteConfirmMessage", { fileName: fileToDelete?.original_name || "" })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm(null);
                  setFileToDelete(null);
                }}
                className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                disabled={deleting}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm === "bulk") {
                    handleBulkDelete();
                  } else if (fileToDelete) {
                    handleSingleDelete(fileToDelete);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
