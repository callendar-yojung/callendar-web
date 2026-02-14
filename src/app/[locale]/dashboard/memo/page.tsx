"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import RichTextEditor from "@/components/editor/RichTextEditor";

type MemoOwnerType = "personal" | "team";
type MemoSort = "latest" | "oldest" | "favorite";

interface MemoListItem {
  memo_id: number;
  title: string;
  is_favorite: number;
  updated_at: string;
}

export default function MemoPage() {
  const t = useTranslations("dashboard.memo");
  const { currentWorkspace } = useWorkspace();
  const [content, setContent] = useState<Record<string, any> | null>(null);
  const [title, setTitle] = useState("");
  const [memos, setMemos] = useState<MemoListItem[]>([]);
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MemoSort>("latest");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  const ownerType: MemoOwnerType | null = currentWorkspace?.type ?? null;
  const ownerId = currentWorkspace?.owner_id ?? null;
  const pageSize = 10;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total]
  );

  useEffect(() => {
    if (!ownerType || !ownerId) return;

    const fetchMemos = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          owner_type: ownerType,
          owner_id: String(ownerId),
          page: String(page),
          page_size: String(pageSize),
          sort,
        });
        if (query.trim()) params.set("query", query.trim());
        if (favoriteOnly) params.set("favorite", "1");

        const res = await fetch(`/api/memos?${params.toString()}`);
        const data = await res.json();
        const list = data?.memos ?? [];
        setMemos(list);
        setTotal(Number(data?.total || 0));

        if (!selectedMemoId && list.length > 0) {
          setSelectedMemoId(list[0].memo_id);
        }
      } catch {
        setMemos([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemos();
  }, [ownerType, ownerId, page, sort, favoriteOnly, query]);

  useEffect(() => {
    setPage(1);
  }, [query, favoriteOnly, sort]);

  useEffect(() => {
    if (!ownerType || !ownerId || !selectedMemoId) return;

    const fetchMemoDetail = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/memos/${selectedMemoId}?owner_type=${ownerType}&owner_id=${ownerId}`
        );
        const data = await res.json();
        if (data?.memo?.content_json) {
          setContent(JSON.parse(data.memo.content_json));
          setTitle(data.memo.title || "");
        } else {
          setContent({ type: "doc", content: [{ type: "paragraph" }] });
          setTitle(t("untitled"));
        }
      } catch {
        setContent({ type: "doc", content: [{ type: "paragraph" }] });
        setTitle(t("untitled"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemoDetail();
  }, [ownerType, ownerId, selectedMemoId, t]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleSave = async (nextContent: Record<string, any>) => {
    if (!ownerType || !ownerId || !selectedMemoId) return;
    setContent(nextContent);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(`/api/memos/${selectedMemoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_type: ownerType,
            owner_id: ownerId,
            title: title || t("untitled"),
            content: nextContent,
          }),
        });
        await refreshList();
      } finally {
        setIsSaving(false);
      }
    }, 600);
  };

  const refreshList = async () => {
    if (!ownerType || !ownerId) return;
    const params = new URLSearchParams({
      owner_type: ownerType,
      owner_id: String(ownerId),
      page: String(page),
      page_size: String(pageSize),
      sort,
    });
    if (query.trim()) params.set("query", query.trim());
    if (favoriteOnly) params.set("favorite", "1");
    const res = await fetch(`/api/memos?${params.toString()}`);
    const data = await res.json();
    setMemos(data?.memos ?? []);
    setTotal(Number(data?.total || 0));
  };

  const handleCreateMemo = async () => {
    if (!ownerType || !ownerId) return;
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_type: ownerType,
        owner_id: ownerId,
        title: t("untitled"),
        content: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    });
    const data = await res.json();
    if (data?.memo_id) {
      setSelectedMemoId(Number(data.memo_id));
      setPage(1);
      await refreshList();
    }
  };

  const handleDeleteMemo = async (memoId: number) => {
    if (!ownerType || !ownerId) return;
    await fetch(`/api/memos/${memoId}?owner_type=${ownerType}&owner_id=${ownerId}`, {
      method: "DELETE",
    });
    if (selectedMemoId === memoId) {
      setSelectedMemoId(null);
      setContent(null);
    }
    await refreshList();
  };

  const handleToggleFavorite = async (memoId: number, nextValue: boolean) => {
    if (!ownerType || !ownerId) return;
    await fetch(`/api/memos/${memoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_type: ownerType,
        owner_id: ownerId,
        is_favorite: nextValue,
      }),
    });
    await refreshList();
  };

  const handleTitleSave = async () => {
    if (!ownerType || !ownerId || !selectedMemoId) return;
    setIsSaving(true);
    try {
      await fetch(`/api/memos/${selectedMemoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_type: ownerType,
          owner_id: ownerId,
          title: title.trim() || t("untitled"),
        }),
      });
      await refreshList();
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("noWorkspace")}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ownerType === "team" ? t("teamMemo") : t("personalMemo")}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {isSaving ? t("saving") : t("saved")}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={handleCreateMemo}
                className="rounded border border-border bg-background px-2 py-1 text-sm"
              >
                {t("newMemo")}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as MemoSort)}
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="latest">{t("sortLatest")}</option>
                <option value="oldest">{t("sortOldest")}</option>
                <option value="favorite">{t("sortFavorite")}</option>
              </select>
              <button
                type="button"
                onClick={() => setFavoriteOnly((prev) => !prev)}
                className={`rounded border border-border px-2 py-1 text-sm ${
                  favoriteOnly ? "bg-primary text-primary-foreground" : "bg-background"
                }`}
              >
                {t("favorites")}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : memos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noMemos")}</p>
              ) : (
                memos.map((memo) => (
                  <div
                    key={memo.memo_id}
                    className={`rounded border px-3 py-2 text-sm ${
                      selectedMemoId === memo.memo_id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMemoId(memo.memo_id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate font-medium">
                          {memo.title || t("untitled")}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(memo.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleFavorite(
                            memo.memo_id,
                            memo.is_favorite !== 1
                          )
                        }
                        className="text-xs text-muted-foreground hover:text-foreground"
                        aria-label={t("favorites")}
                      >
                        {memo.is_favorite ? "★" : "☆"}
                      </button>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteMemo(memo.memo_id)}
                        className="text-xs text-destructive"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
              >
                {t("prev")}
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
              >
                {t("next")}
              </button>
            </div>
          </div>

          <div>
            {isLoading || !content ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                {t("loading")}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onBlur={handleTitleSave}
                    placeholder={t("titlePlaceholder")}
                    className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleTitleSave}
                    className="rounded border border-border px-3 py-2 text-sm"
                  >
                    {t("saveTitle")}
                  </button>
                </div>
                <RichTextEditor
                  initialContent={content}
                  onChange={handleSave}
                  contentKey={selectedMemoId ?? "empty"}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
