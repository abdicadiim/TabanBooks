import type { ChangeEventHandler, DragEventHandler, RefObject } from "react";
import { MessageCircle, X } from "lucide-react";

import type { Attachment, Comment, MaybeAsyncVoid } from "./types";

type CommentsPanelProps = {
  open: boolean;
  comments: Comment[];
  newComment: string;
  isAddingComment: boolean;
  commentsPanelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => MaybeAsyncVoid;
  onDeleteComment: (comment: Comment, index: number) => MaybeAsyncVoid;
};

type AttachmentsModalProps = {
  open: boolean;
  attachments: Attachment[];
  isDragging: boolean;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onAttachFromDesktop: () => void;
  onFileInputChange: ChangeEventHandler<HTMLInputElement>;
  onFileClick: (attachment: Attachment) => void;
  onRemoveAttachment: (id: string | number) => MaybeAsyncVoid;
};

type ImageViewerModalProps = {
  open: boolean;
  image: string | null;
  onClose: () => void;
};

type DeleteConfirmationModalProps = {
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => MaybeAsyncVoid;
};

export function CommentsPanel({
  open,
  comments,
  newComment,
  isAddingComment,
  commentsPanelRef,
  onClose,
  onNewCommentChange,
  onAddComment,
  onDeleteComment,
}: CommentsPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div onClick={onClose} className="fixed top-0 left-0 right-0 bottom-0 bg-black/30 z-[1999]" />
      <div className="fixed top-0 right-0 bottom-0 w-[400px] bg-white shadow-[-2px_0_8px_rgba(0,0,0,0.1)] z-[2000] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 m-0">Comments & History</h3>
          <button
            onClick={onClose}
            className="p-1.5 border-none rounded cursor-pointer flex items-center justify-center w-7 h-7"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div ref={commentsPanelRef} className="flex-1 overflow-y-auto p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            className="bg-gray-50 rounded-md p-3 mb-6"
          >
            <div className="flex gap-1 mb-2">
              <button type="button" className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100">
                B
              </button>
              <button type="button" className="px-2 py-1 text-xs italic bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100">
                I
              </button>
              <button type="button" className="px-2 py-1 text-xs bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100">
                U
              </button>
            </div>

            <textarea
              value={newComment}
              onChange={(event) => onNewCommentChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                }
              }}
              placeholder="Type your comment..."
              className="w-full min-h-20 p-2 border border-gray-300 rounded text-sm font-inherit resize-y outline-none bg-white mb-2"
            />

            <button
              type="button"
              onClick={() => void onAddComment()}
              disabled={isAddingComment || !newComment.trim()}
              className={`w-full px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100 flex items-center justify-center gap-2 ${isAddingComment ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isAddingComment ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Comment"
              )}
            </button>
          </form>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <h4 className="text-xs font-bold text-gray-700 m-0 uppercase">ALL COMMENTS</h4>
              <div
                className="text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-semibold"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              >
                {comments.length}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {comments.length === 0 && <div className="text-sm text-gray-500">No comments yet.</div>}
              {comments.map((comment, index) => (
                <div key={comment.id || index} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(21, 99, 114, 0.1)" }}>
                    <MessageCircle size={16} style={{ color: "#156372" }} />
                  </div>
                  <div className="flex-1 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-gray-700">{comment.author}</span>
                      <span className="text-[11px] text-gray-400">-</span>
                      <span className="text-[11px] text-gray-400 uppercase">{comment.timestamp}</span>
                    </div>
                    <div className="bg-gray-100 rounded-md px-3 py-2 text-[13px] text-gray-900 relative">
                      {comment.text}
                      <button
                        type="button"
                        onClick={() => void onDeleteComment(comment, index)}
                        className="absolute top-2 right-2 p-1 border-none bg-transparent text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete comment"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function AttachmentsModal({
  open,
  attachments,
  isDragging,
  isUploading,
  fileInputRef,
  onClose,
  onDrop,
  onDragOver,
  onDragLeave,
  onAttachFromDesktop,
  onFileInputChange,
  onFileClick,
  onRemoveAttachment,
}: AttachmentsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[2090]" onClick={onClose} />
      <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Attachments ({attachments.length})</h3>
            <button onClick={onClose} className="p-1 text-gray-600 hover:text-gray-900">
              <X size={18} />
            </button>
          </div>

          <div
            className={`p-4 border-b border-gray-200 ${isDragging ? "bg-blue-50" : "bg-gray-50"}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={onAttachFromDesktop}
                disabled={isUploading}
                className={`px-3 py-2 rounded border text-sm ${isUploading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isUploading ? "Uploading..." : "Upload File"}
              </button>
              <span className="text-xs text-gray-500">Drag and drop files here</span>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileInputChange} />
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {attachments.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 text-center">No attachments</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {attachments.map((attachment, index) => (
                  <div key={attachment.id || index} className="px-4 py-3 flex items-center justify-between gap-3">
                    <button onClick={() => onFileClick(attachment)} className="text-left flex-1 hover:underline">
                      <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                      <div className="text-xs text-gray-500">{attachment.size}</div>
                    </button>
                    <button onClick={() => void onRemoveAttachment(attachment.id || index)} className="text-red-500 hover:text-red-700 text-sm">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function ImageViewerModal({ open, image, onClose }: ImageViewerModalProps) {
  if (!open || !image) {
    return null;
  }

  return (
    <div onClick={onClose} className="fixed top-0 left-0 right-0 bottom-0 bg-black/90 z-[3000] flex items-center justify-center p-5">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 bg-white border-none cursor-pointer p-2 rounded flex items-center justify-center z-[3001]"
      >
        <X size={20} className="text-gray-900" />
      </button>
      <img src={image} alt="Preview" className="max-w-[90%] max-h-[90%] object-contain" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}

export function DeleteConfirmationModal({ open, isDeleting, onClose, onConfirm }: DeleteConfirmationModalProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[30010]" onClick={onClose} />
      <div className="fixed inset-0 z-[30020] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Adjustment</h3>
          <p className="text-sm text-gray-600 mb-5">Are you sure you want to delete this adjustment?</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => void onConfirm()}
              disabled={isDeleting}
              className={`px-4 py-2 text-sm rounded text-white ${isDeleting ? "opacity-70 cursor-not-allowed bg-red-500" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
