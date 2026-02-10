"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export interface TaskFormData {
  id?: number;
  title: string;
  start_time: string;
  end_time: string;
  content: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  color?: string;
  tag_ids?: number[];
  file_ids?: number[];
}

interface PendingFile {
  file_id: number;
  original_name: string;
  file_path: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string | null;
}

interface Tag {
  tag_id: number;
  name: string;
  color: string;
  owner_type: "team" | "personal";
  owner_id: number;
}

interface TaskAttachment {
  attachment_id: number;
  task_id: number;
  file_id: number;
  original_name: string;
  file_path: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string | null;
  created_at: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskFormData) => void;
  onDelete?: (taskId: number) => void;
  mode?: "create" | "view" | "edit";
  initialData?: TaskFormData | null;
  workspaceType?: "team" | "personal";
  ownerId?: number;
}

export default function TaskModal({ isOpen, onClose, onSave, onDelete, mode = "create", initialData, workspaceType, ownerId }: TaskModalProps) {
  const t = useTranslations("dashboard.tasks.modal");
  const tStatus = useTranslations("dashboard.tasks.status");
  const [currentMode, setCurrentMode] = useState<"create" | "view" | "edit">(mode);
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    start_time: "",
    end_time: "",
    content: "",
    color: "#3B82F6",
    tag_ids: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");

  // File attachments state
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 생성 모드에서 업로드된 파일 (아직 태스크에 연결되지 않음)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // 색상 옵션
  const colorOptions = [
    { value: "#3B82F6", label: "파란색" },
    { value: "#EF4444", label: "빨간색" },
    { value: "#10B981", label: "초록색" },
    { value: "#F59E0B", label: "주황색" },
    { value: "#8B5CF6", label: "보라색" },
    { value: "#EC4899", label: "분홍색" },
    { value: "#6366F1", label: "인디고" },
    { value: "#14B8A6", label: "청록색" },
  ];

  // 태그 불러오기
  useEffect(() => {
    if (isOpen && workspaceType && ownerId) {
      fetchTags();
    }
  }, [isOpen, workspaceType, ownerId]);

  // 첨부파일 불러오기
  useEffect(() => {
    if (isOpen && initialData?.id) {
      fetchAttachments(initialData.id);
    } else {
      setAttachments([]);
    }
  }, [isOpen, initialData?.id]);

  const fetchAttachments = async (taskId: number) => {
    setLoadingAttachments(true);
    try {
      const response = await fetch(`/api/tasks/attachments?task_id=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceType || !ownerId) return;

    setUploadingFile(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("owner_type", workspaceType);
      uploadFormData.append("owner_id", String(ownerId));

      // 기존 태스크에 첨부하는 경우에만 task_id 추가
      if (initialData?.id) {
        uploadFormData.append("task_id", String(initialData.id));
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.error || "파일 업로드에 실패했습니다.");
        return;
      }

      if (initialData?.id) {
        // 기존 태스크인 경우 첨부파일 목록 새로고침
        await fetchAttachments(initialData.id);
      } else {
        // 새 태스크인 경우 pendingFiles에 추가
        setPendingFiles(prev => [...prev, {
          file_id: data.file.file_id,
          original_name: data.file.original_name,
          file_path: data.file.file_path,
          file_size: data.file.file_size,
          file_size_formatted: data.file.file_size_formatted,
          mime_type: data.file.mime_type,
        }]);
      }

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("File upload error:", error);
      setUploadError("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemovePendingFile = async (fileId: number) => {
    // 파일 삭제 (DB + 물리적 파일)
    try {
      await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
      setPendingFiles(prev => prev.filter(f => f.file_id !== fileId));
    } catch (error) {
      console.error("Failed to delete pending file:", error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number, fileId: number) => {
    if (!confirm("첨부파일을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `/api/tasks/attachments?attachment_id=${attachmentId}&delete_file=true`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.attachment_id !== attachmentId));
      } else {
        const data = await response.json();
        alert(data.error || "첨부파일 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete attachment error:", error);
      alert("첨부파일 삭제 중 오류가 발생했습니다.");
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📽️";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "📦";
    return "📄";
  };

  const fetchTags = async () => {
    if (!workspaceType || !ownerId) return;

    setLoadingTags(true);
    try {
      const response = await fetch(`/api/tags?owner_type=${workspaceType}&owner_id=${ownerId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoadingTags(false);
    }
  };

  // 폼 데이터 초기화 (태그 로딩 후)
  useEffect(() => {
    if (isOpen) {
      setCurrentMode(mode);
      if (initialData && (mode === "view" || mode === "edit")) {
        setFormData({
          id: initialData.id,
          title: initialData.title,
          start_time: formatDateTimeLocal(initialData.start_time),
          end_time: formatDateTimeLocal(initialData.end_time),
          content: initialData.content || "",
          status: initialData.status,
          color: initialData.color || "#3B82F6",
          tag_ids: initialData.tag_ids || [],
        });
      } else {
        // Create 모드
        setFormData({
          title: "",
          start_time: "",
          end_time: "",
          content: "",
          color: "#3B82F6",
          tag_ids: [],
        });
      }
    } else {
      // 모달이 닫힐 때 폼 초기화
      setFormData({
        title: "",
        start_time: "",
        end_time: "",
        content: "",
        color: "#3B82F6",
        tag_ids: [],
      });
      setErrors({});
      setCurrentMode("create");
      setAttachments([]);
      setPendingFiles([]);
      setUploadError(null);
    }
  }, [isOpen, initialData, mode]);

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !workspaceType || !ownerId) return;

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          owner_type: workspaceType,
          owner_id: ownerId,
        }),
      });

      if (response.ok) {
        setNewTagName("");
        setNewTagColor("#3B82F6");
        setShowNewTagForm(false);
        await fetchTags();
      } else {
        const error = await response.json();
        alert(error.error || "태그 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
      alert("태그 생성에 실패했습니다.");
    }
  };

  const toggleTag = (tagId: number) => {
    setFormData(prev => {
      const currentTags = prev.tag_ids || [];
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId];
      return { ...prev, tag_ids: newTags };
    });
  };

  // DB에서 가져온 datetime을 datetime-local input 형식으로 변환
  // 타임존 변환 없이 그대로 표시 (저장된 시간 = 표시되는 시간)
  const formatDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return '';

    // MySQL datetime 형식 (2026-02-09 18:26:00) 또는 ISO 형식 처리
    // Date 객체를 사용하면 타임존 변환이 발생하므로 문자열 직접 파싱
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hours, minutes] = match;
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 그 외 형식은 Date 객체 사용 (폴백)
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTimeDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = t("requiredField");
    }
    if (!formData.start_time) {
      newErrors.start_time = t("requiredField");
    }
    if (!formData.end_time) {
      newErrors.end_time = t("requiredField");
    }
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = t("endTimeBeforeStart");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Send datetime-local values directly (YYYY-MM-DDTHH:mm format)
      // No timezone conversion - store exactly what user selected
      const dataToSave = {
        ...formData,
        start_time: formData.start_time,
        end_time: formData.end_time,
        // 생성 모드에서 업로드된 파일 ID들 추가
        file_ids: pendingFiles.map(f => f.file_id),
      };
      console.log("Submitting task with formData:", dataToSave);
      console.log("tag_ids being submitted:", dataToSave.tag_ids);
      console.log("file_ids being submitted:", dataToSave.file_ids);
      onSave(dataToSave);
    }
  };

  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEditClick = () => {
    // Edit 모드로 전환할 때 initialData로 폼 데이터를 다시 설정
    if (initialData) {
      setFormData({
        id: initialData.id,
        title: initialData.title,
        start_time: formatDateTimeLocal(initialData.start_time),
        end_time: formatDateTimeLocal(initialData.end_time),
        content: initialData.content || "",
        status: initialData.status,
        color: initialData.color || "#3B82F6",
        tag_ids: initialData.tag_ids || [],
      });
    }
    setCurrentMode("edit");
  };

  const handleCancelEdit = () => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        title: initialData.title,
        start_time: formatDateTimeLocal(initialData.start_time),
        end_time: formatDateTimeLocal(initialData.end_time),
        content: initialData.content || "",
        status: initialData.status,
        color: initialData.color || "#3B82F6",
        tag_ids: initialData.tag_ids || [],
      });
    }
    setCurrentMode("view");
    setErrors({});
  };

  const statusLabels = {
    TODO: tStatus("pending"),
    IN_PROGRESS: tStatus("in_progress"),
    DONE: tStatus("completed"),
  };

  const statusColors = {
    TODO: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    DONE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  if (!isOpen) return null;

  // View 모드 - 읽기 전용 상세 보기
  if (currentMode === "view") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-popover p-6 shadow-xl">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-popover-foreground">
                  {formData.title}
                </h2>
                {formData.color && (
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: formData.color }}
                    title="태스크 색상"
                  />
                )}
              </div>
              {formData.status && (
                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${statusColors[formData.status]}`}>
                  {statusLabels[formData.status]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 상세 정보 */}
          <div className="space-y-4">
            {/* 시간 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {formatDateTimeDisplay(formData.start_time)} - {formatDateTimeDisplay(formData.end_time)}
              </span>
            </div>

            {/* 태그 */}
            {formData.tag_ids && formData.tag_ids.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-subtle-foreground mb-2">태그</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.tag_ids.map(tagId => {
                    const tag = availableTags.find(t => t.tag_id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tag.tag_id}
                        className="rounded-lg px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: tag.color, color: 'white' }}
                      >
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 내용 */}
            {formData.content && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-subtle-foreground mb-2">
                  {t("content")}
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                  {formData.content}
                </p>
              </div>
            )}

            {!formData.content && (
              <div className="mt-4 text-sm text-muted-foreground italic">
                {t("noContent") || "내용이 없습니다"}
              </div>
            )}

            {/* 첨부파일 */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-subtle-foreground mb-2">
                첨부파일
              </h3>
              {loadingAttachments ? (
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              ) : attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.attachment_id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <a
                        href={att.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 truncate flex-1"
                      >
                        <span>{getFileIcon(att.mime_type)}</span>
                        <span className="truncate">{att.original_name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({att.file_size_formatted})
                        </span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  첨부된 파일이 없습니다
                </p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <div>
              {onDelete && formData.id && (
                <button
                  type="button"
                  onClick={() => onDelete(formData.id!)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {t("delete")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-subtle-foreground transition-colors hover:bg-hover"
              >
                {t("close") || "닫기"}
              </button>
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {t("edit") || "수정"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit 모드 - 폼
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-popover p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-popover-foreground">
          {currentMode === "edit" ? t("editTitle") : t("title")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-subtle-foreground">
              {t("taskTitle")} <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder={t("taskTitlePlaceholder")}
              className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
                errors.title
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring"
              } bg-background text-foreground`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* 시작 시간 */}
          <div>
            <label htmlFor="start_time" className="mb-1 block text-sm font-medium text-subtle-foreground">
              {t("startTime")} <span className="text-destructive">*</span>
            </label>
            <input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => handleChange("start_time", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
                errors.start_time
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring"
              } bg-background text-foreground`}
            />
            {errors.start_time && (
              <p className="mt-1 text-xs text-destructive">{errors.start_time}</p>
            )}
          </div>

          {/* 마감 시간 */}
          <div>
            <label htmlFor="end_time" className="mb-1 block text-sm font-medium text-subtle-foreground">
              {t("endTime")} <span className="text-destructive">*</span>
            </label>
            <input
              id="end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => handleChange("end_time", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
                errors.end_time
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring"
              } bg-background text-foreground`}
            />
            {errors.end_time && (
              <p className="mt-1 text-xs text-destructive">{errors.end_time}</p>
            )}
          </div>

          {/* 내용 */}
          <div>
            <label htmlFor="content" className="mb-1 block text-sm font-medium text-subtle-foreground">
              {t("content")}
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder={t("contentPlaceholder")}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* 색상 선택 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-subtle-foreground">
              색상
            </label>
            <div className="flex gap-2">
              {colorOptions.map(colorOption => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: colorOption.value }))}
                  className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === colorOption.value 
                      ? 'border-black dark:border-white scale-110 shadow-lg' 
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.label}
                >
                  {formData.color === colorOption.value && (
                    <svg
                      className="absolute inset-0 m-auto w-6 h-6 text-white drop-shadow-lg"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 태그 선택 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-subtle-foreground">
              태그
            </label>
            {loadingTags ? (
              <p className="text-sm text-muted-foreground">태그 불러오는 중...</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => {
                    const isSelected = formData.tag_ids?.includes(tag.tag_id);
                    return (
                      <button
                        key={tag.tag_id}
                        type="button"
                        onClick={() => toggleTag(tag.tag_id)}
                        className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-black dark:ring-white shadow-lg scale-105'
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: tag.color,
                          color: 'white'
                        }}
                      >
                        <span className="flex items-center gap-1">
                          {isSelected && (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {tag.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {showNewTagForm ? (
                  <div className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-muted/30">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="새 태그 이름"
                      className="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 border-input focus:ring-ring bg-background text-foreground"
                    />
                    <div className="flex gap-2">
                      {colorOptions.map(colorOption => (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() => setNewTagColor(colorOption.value)}
                          className={`relative w-8 h-8 rounded-lg border-2 transition-all ${
                            newTagColor === colorOption.value 
                              ? 'border-black dark:border-white scale-110 shadow-lg' 
                              : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                          }`}
                          style={{ backgroundColor: colorOption.value }}
                          title={colorOption.label}
                        >
                          {newTagColor === colorOption.value && (
                            <svg
                              className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-lg"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        생성
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewTagForm(false);
                          setNewTagName("");
                          setNewTagColor("#3B82F6");
                        }}
                        className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-subtle-foreground transition-colors hover:bg-hover"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewTagForm(true)}
                    className="w-full rounded-lg border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    + 새 태그 추가
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 첨부파일 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-subtle-foreground">
              첨부파일
            </label>

            {/* 기존 태스크의 첨부파일 목록 (수정 모드) */}
            {initialData?.id && (
              loadingAttachments ? (
                <p className="text-sm text-muted-foreground mb-2">불러오는 중...</p>
              ) : attachments.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {attachments.map((att) => (
                    <div
                      key={att.attachment_id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                    >
                      <a
                        href={att.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 truncate flex-1"
                      >
                        <span>{getFileIcon(att.mime_type)}</span>
                        <span className="truncate">{att.original_name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({att.file_size_formatted})
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.attachment_id, att.file_id)}
                        className="ml-2 p-1 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-2">
                  첨부된 파일이 없습니다
                </p>
              )
            )}

            {/* 생성 모드에서 업로드된 파일 목록 (pendingFiles) */}
            {!initialData?.id && pendingFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {pendingFiles.map((file) => (
                  <div
                    key={file.file_id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                  >
                    <div className="flex items-center gap-2 text-sm text-foreground truncate flex-1">
                      <span>{getFileIcon(file.mime_type)}</span>
                      <span className="truncate">{file.original_name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({file.file_size_formatted})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingFile(file.file_id)}
                      className="ml-2 p-1 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 파일 업로드 (생성/수정 모드 모두 가능) */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  uploadingFile
                    ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {uploadingFile ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    업로드 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    파일 첨부
                  </>
                )}
              </label>
              {uploadError && (
                <p className="text-xs text-red-600">{uploadError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                이미지, 문서, 압축 파일을 업로드할 수 있습니다.
              </p>
            </div>

          </div>

          {/* 버튼 */}
          <div className="flex justify-between pt-2">
            <div>
              {currentMode === "edit" && onDelete && formData.id && (
                <button
                  type="button"
                  onClick={() => onDelete(formData.id!)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  {t("delete")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={currentMode === "edit" && initialData ? handleCancelEdit : onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-subtle-foreground transition-colors hover:bg-hover"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {currentMode === "edit" ? t("save") : t("create")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
