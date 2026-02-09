"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import TaskModal, { type TaskFormData } from "./TaskModal";

interface Tag {
  tag_id: number;
  name: string;
  color: string;
  owner_type: "team" | "personal";
  owner_id: number;
}

interface Task {
  id: number;
  title?: string;
  start_time: string;
  end_time?: string;
  content?: string;
  workspace_id: number;
  color?: string;
  tags?: Tag[];
}

export default function CalendarDemo() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { currentWorkspace } = useWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 태스크 개수 데이터 불러오기
  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/tasks?workspace_id=${currentWorkspace.workspace_id}`
        );
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [currentWorkspace?.workspace_id, currentDate]);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const weekDays = [
    t("calendar.weekDays.sun"),
    t("calendar.weekDays.mon"),
    t("calendar.weekDays.tue"),
    t("calendar.weekDays.wed"),
    t("calendar.weekDays.thu"),
    t("calendar.weekDays.fri"),
    t("calendar.weekDays.sat"),
  ];

  // 특정 날짜의 태스크 가져오기
  const getTasksForDate = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return tasks.filter((task) => {
      const taskStartDate = new Date(task.start_time).toISOString().split("T")[0];
      const taskEndDate = new Date(task.end_time || task.start_time).toISOString().split("T")[0];
      return dateStr >= taskStartDate && dateStr <= taskEndDate;
    });
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const handleSaveTask = async (taskData: TaskFormData) => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          workspace_id: currentWorkspace.workspace_id,
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        // 태스크 목록 새로고침
        const tasksResponse = await fetch(
          `/api/tasks?workspace_id=${currentWorkspace.workspace_id}`
        );
        if (tasksResponse.ok) {
          const data = await tasksResponse.json();
          setTasks(data.tasks);
        }
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedDateTasks = selectedDate
    ? getTasksForDate(selectedDate.getDate())
    : [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 캘린더 */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-6">
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {currentDate.toLocaleDateString(
                locale === "ko" ? "ko-KR" : "en-US",
                { year: "numeric", month: "long" }
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-2 hover:bg-hover"
                aria-label="Previous month"
              >
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("calendar.today")}
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-2 hover:bg-hover"
                aria-label="Next month"
              >
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* 캘린더 그리드 */}
          <div className="space-y-2">
            {/* 요일 */}
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className={`py-2 text-center text-sm font-semibold ${
                    i === 0
                      ? "text-destructive"
                      : i === 6
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 */}
            <div className="grid grid-cols-7 gap-4">
              {days.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isSelected =
                  selectedDate?.getDate() === day &&
                  selectedDate?.getMonth() === month;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!day}
                    onClick={() => day && handleDateClick(day)}
                    className={`min-h-[120px] rounded-lg border p-2 text-left transition-all ${
                      !day
                        ? "cursor-default border-transparent"
                        : isSelected
                          ? "border-primary bg-primary/10"
                          : isToday(day)
                            ? "border-foreground bg-muted"
                            : "border-border hover:border-primary/50"
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`mb-2 text-sm font-semibold ${
                            isToday(day)
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 2).map((task) => (
                            <div
                              key={task.id}
                              className="truncate rounded bg-primary/10 px-2 py-1 text-xs text-primary"
                            >
                              {task.content || "Task"}
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              {t("calendar.more", { count: dayTasks.length - 2 })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 선택된 날짜의 태스크 목록 */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedDate
                ? selectedDate.toLocaleDateString(
                    locale === "ko" ? "ko-KR" : "en-US",
                    { month: "long", day: "numeric" }
                  )
                : t("calendar.selectDate")}
            </h3>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-sm text-primary hover:underline"
              >
                + {t("calendar.add")}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {selectedDateTasks.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                {selectedDate
                  ? t("calendar.noTasksOnDate")
                  : t("calendar.selectDateFromCalendar")}
              </p>
            ) : (
              selectedDateTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border p-3 hover:bg-hover"
                >
                  <div className="text-sm font-medium text-foreground">
                    {task.content || "Task"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatTime(task.start_time)} - {formatTime(task.end_time || task.start_time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={selectedDate ? {
          title: '',
          start_time: selectedDate.toISOString(),
          end_time: new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString(),
          content: ''
        } : undefined}
        workspaceType={currentWorkspace?.type}
        ownerId={currentWorkspace?.owner_id}
      />
    </div>
  );
}
