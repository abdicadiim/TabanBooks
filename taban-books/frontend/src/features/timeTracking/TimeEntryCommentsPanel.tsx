import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { getCurrentUser } from "../../services/auth";

export interface QuoteComment {
  id: string | number;
  text: string;
  content: string;
  authorName: string;
  authorInitial: string;
  createdAt: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

type TimeEntryCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  entryId: string;
  comments?: any[];
  onCommentsChange?: (comments: QuoteComment[]) => void;
  updateEntry: (entryId: string, data: any) => Promise<any>;
};

const normalizeComment = (comment: any, index = 0): QuoteComment | null => {
  if (!comment || typeof comment !== "object") return null;

  const rawText = String(comment.text ?? "").trim();
  const rawContent = String(comment.content ?? rawText).trim();
  const authorName = String(comment.authorName || comment.author || "You").trim() || "You";
  const authorInitial = String(comment.authorInitial || authorName.charAt(0) || "Y").trim().slice(0, 1) || "Y";

  return {
    id: String(comment.id || comment._id || `comment-${index}-${Date.now()}`),
    text: rawText || rawContent.replace(/<[^>]*>/g, ""),
    content: rawContent || rawText,
    authorName,
    authorInitial,
    createdAt: String(comment.createdAt || comment.timestamp || new Date().toISOString()),
    bold: Boolean(comment.bold),
    italic: Boolean(comment.italic),
    underline: Boolean(comment.underline),
  };
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function TimeEntryCommentsPanel({
  open,
  onClose,
  entryId,
  comments = [],
  onCommentsChange,
  updateEntry,
}: TimeEntryCommentsPanelProps) {
  const currentUser = getCurrentUser();
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | number | null>(null);

  const normalizedComments = useMemo(
    () => comments.map((comment, index) => normalizeComment(comment, index)).filter(Boolean) as QuoteComment[],
    [comments],
  );

  useEffect(() => {
    if (!open) return;
    setDraft("");
    setIsSaving(false);
    setIsDeletingId(null);
  }, [open, entryId]);

  const getCurrentAuthor = () => {
    const name =
      String(
        currentUser?.name ||
          currentUser?.fullName ||
          currentUser?.username ||
          currentUser?.email ||
          "You",
      ).trim() || "You";
    return {
      authorName: name,
      authorInitial: name.charAt(0).toUpperCase() || "Y",
    };
  };

  const persistComments = async (nextComments: QuoteComment[]) => {
    const result = await updateEntry(entryId, { comments: nextComments });
    const savedComments = Array.isArray(result?.comments) ? result.comments : nextComments;
    onCommentsChange?.(savedComments);
    return savedComments;
  };

  const handleAddComment = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error("Write a comment first.");
      return;
    }

    const nextComment: QuoteComment = {
      id: `comment-${Date.now()}`,
      text,
      content: text,
      createdAt: new Date().toISOString(),
      ...getCurrentAuthor(),
    };

    setIsSaving(true);
    try {
      await persistComments([...normalizedComments, nextComment]);
      setDraft("");
      toast.success("Comment added.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to add comment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!window.confirm("Delete this comment?")) return;

    setIsDeletingId(commentId);
    try {
      const nextComments = normalizedComments.filter((comment) => String(comment.id) !== String(commentId));
      await persistComments(nextComments);
      toast.success("Comment deleted.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete comment.");
    } finally {
      setIsDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-stretch justify-end bg-black/35"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="m-0 text-base font-semibold text-gray-900">Time Entry Comments</h2>
            <p className="m-0 text-xs text-gray-500">Entry ID: {entryId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-none bg-transparent p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close comments panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Add a comment</label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              placeholder="Write a note about this time entry..."
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372]"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleAddComment}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-md bg-[#156372] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f4f5c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Plus size={14} />
                {isSaving ? "Saving..." : "Add Comment"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {normalizedComments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                No comments yet.
              </div>
            ) : (
              normalizedComments.map((comment) => (
                <div key={String(comment.id)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#156372]/10 text-xs font-semibold text-[#156372]">
                        {comment.authorInitial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{comment.authorName}</div>
                        <div className="text-xs text-gray-500">{formatTimestamp(comment.createdAt)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={isDeletingId === comment.id}
                      className="rounded-full border-none bg-transparent p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-gray-700">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
