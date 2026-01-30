"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export interface TaskFormData {
  id?: number;
  title: string;
  start_time: string;
  end_time: string;
  content: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskFormData) => void;
  onDelete?: (taskId: number) => void;
  mode?: "create" | "view" | "edit";
  initialData?: TaskFormData | null;
}

export default function TaskModal({ isOpen, onClose, onSave, onDelete, mode = "create", initialData }: TaskModalProps) {
  const t = useTranslations("dashboard.tasks.modal");
  const tStatus = useTranslations("dashboard.tasks.status");
  const [currentMode, setCurrentMode] = useState<"create" | "view" | "edit">(mode);
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    start_time: "",
    end_time: "",
    content: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});

  const formatDateTimeLocal = (dateStr: string) => {
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
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
        });
      }
    } else {
      // 모달이 닫힐 때 폼 초기화
      setFormData({
        title: "",
        start_time: "",
        end_time: "",
        content: "",
      });
      setErrors({});
      setCurrentMode("create");
    }
  }, [isOpen, initialData, mode]);

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
      onSave(formData);
    }
  };

  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEditClick = () => {
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
              <h2 className="text-xl font-semibold text-popover-foreground">
                {formData.title}
              </h2>
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