import { type ChangeEvent, type DragEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Edit, FileText, MessageCircle, MoreVertical, Paperclip, X } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { currenciesAPI, inventoryAdjustmentsAPI } from "../../services/api";
import { AdjustmentDocumentContent } from "./adjustment-detail/AdjustmentDocumentContent";
import {
  AttachmentsModal,
  CommentsPanel,
  DeleteConfirmationModal,
  ImageViewerModal,
} from "./adjustment-detail/AdjustmentDetailPanels";
import type { Adjustment, Attachment, Comment, MaybeAsyncVoid } from "./adjustment-detail/types";
import {
  DEFAULT_BASE_CURRENCY,
  formatFileSize,
  getAdjustmentId,
  getAdjustmentReference,
  getAttachmentSource,
  getItemRows,
  isImageAttachment,
  normalizeAttachments,
  normalizeComments,
  readFileAsDataUrl,
  renderSafeValue,
  resolveJournalLines,
  toAttachmentPayload,
  triggerDownload,
} from "./adjustment-detail/utils";

interface AdjustmentDetailProps {
  adjustment?: Adjustment | null;
  onClose?: () => MaybeAsyncVoid;
  onEdit?: () => MaybeAsyncVoid;
  onDelete?: () => MaybeAsyncVoid;
  onRefresh?: () => MaybeAsyncVoid;
}

type ScrollSnapshot = {
  commentScroll: number;
  pageScroll: number;
};

export default function AdjustmentDetail({
  adjustment,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}: AdjustmentDetailProps) {
  const navigate = useNavigate();
  const [showPdfView, setShowPdfView] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsPanelRef = useRef<HTMLDivElement>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState(DEFAULT_BASE_CURRENCY);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [isCloning, setIsCloning] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeletingAdjustment, setIsDeletingAdjustment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fullAdjustment, setFullAdjustment] = useState<Adjustment | null | undefined>(adjustment);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const runCallback = async (callback?: () => MaybeAsyncVoid) => {
    if (callback) {
      await Promise.resolve(callback());
    }
  };

  useEffect(() => {
    const fetchBaseCurrency = async () => {
      try {
        const response = await currenciesAPI.getBaseCurrency();
        if (response?.success && response.data) {
          setBaseCurrency(response.data.code || DEFAULT_BASE_CURRENCY);
        }
      } catch (error) {
        console.error("Error fetching base currency:", error);
      }
    };

    void fetchBaseCurrency();
  }, []);

  const adjustmentId = getAdjustmentId(adjustment);

  const refreshAdjustmentDetails = async () => {
    const currentId = adjustmentId ?? getAdjustmentId(fullAdjustment);
    if (!currentId) {
      return;
    }

    try {
      const response = await inventoryAdjustmentsAPI.getById(currentId);
      setFullAdjustment(response?.data || response || adjustment);
    } catch (error) {
      console.error("Error refreshing adjustment details:", error);
    }
  };

  useEffect(() => {
    if (!adjustmentId) {
      setFullAdjustment(adjustment);
      return;
    }

    void refreshAdjustmentDetails();
  }, [adjustmentId]);

  const activeAdjustment = useMemo<Adjustment | null | undefined>(
    () => (fullAdjustment ? { ...(adjustment ?? {}), ...fullAdjustment } : adjustment),
    [adjustment, fullAdjustment],
  );

  const itemRows = useMemo(() => getItemRows(activeAdjustment), [activeAdjustment]);
  const journalLines = useMemo(() => resolveJournalLines(activeAdjustment, itemRows), [activeAdjustment, itemRows]);
  const currentAdjustmentId = getAdjustmentId(activeAdjustment) ?? adjustmentId;

  useEffect(() => {
    setComments(normalizeComments(activeAdjustment?.comments));
    setAttachments(normalizeAttachments(activeAdjustment?.attachments));
  }, [activeAdjustment]);

  useEffect(() => {
    if (!moreMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && commentsPanelOpen) {
        setCommentsPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [commentsPanelOpen]);

  if (!adjustment || !activeAdjustment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-gray-400 mb-4">
          <FileText size={64} />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Adjustment Selected</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Click on an adjustment from the list to view its details here.
        </p>
      </div>
    );
  }

  const captureScrollSnapshot = (): ScrollSnapshot => ({
    commentScroll: commentsPanelRef.current?.scrollTop ?? 0,
    pageScroll: window.pageYOffset || document.documentElement.scrollTop,
  });

  const restoreScrollSnapshot = (snapshot: ScrollSnapshot) => {
    const apply = () => {
      if (commentsPanelRef.current) {
        commentsPanelRef.current.scrollTop = snapshot.commentScroll;
      }
      window.scrollTo(0, snapshot.pageScroll);
    };

    apply();
    requestAnimationFrame(apply);
  };

  const persistComments = async (nextComments: Comment[]) => {
    if (!currentAdjustmentId) {
      throw new Error("Adjustment ID not found");
    }

    await inventoryAdjustmentsAPI.update(currentAdjustmentId, { comments: nextComments });
    setComments(nextComments);
    await refreshAdjustmentDetails();
  };

  const handleDownloadPdf = async () => {
    const element = document.querySelector("[data-print-content]") as HTMLElement | null;
    if (!element) {
      toast.error("Could not find content to export");
      return;
    }

    const toastId = toast.loading("Generating PDF...");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
        height: element.scrollHeight,
        onclone: (clonedDocument) => {
          const clonedElement = clonedDocument.querySelector("[data-print-content]") as HTMLElement | null;
          if (clonedElement) {
            clonedElement.style.width = "210mm";
            clonedElement.style.margin = "0 auto";
            clonedElement.style.padding = "40px";
            clonedElement.style.boxShadow = "none";
          }
        },
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imageWidth = 210;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      pdf.addImage(imageData, "PNG", 0, 0, imageWidth, imageHeight);
      pdf.save(`Inventory_Adjustment_${getAdjustmentReference(activeAdjustment)}.pdf`);
      toast.success("PDF downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  const handleConvertToAdjusted = async () => {
    if (activeAdjustment.status !== "DRAFT" || !currentAdjustmentId) {
      return;
    }

    setIsConverting(true);

    try {
      await inventoryAdjustmentsAPI.update(currentAdjustmentId, { status: "ADJUSTED" });
      await refreshAdjustmentDetails();
      await runCallback(onRefresh);
      toast.success("Adjustment converted successfully");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error?.message || error?.data?.message || "Failed to update adjustment status");
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteRequest = () => {
    setDeleteModalOpen(true);
    setMoreMenuOpen(false);
  };

  const handleClone = async () => {
    setIsCloning(true);
    const toastId = toast.loading("Cloning adjustment...");

    try {
      if (!currentAdjustmentId) {
        throw new Error("Adjustment ID not found. Please refresh and try again.");
      }

      const created = await inventoryAdjustmentsAPI.clone(currentAdjustmentId);
      const createdDocument = created?.data || created;
      const createdId = getAdjustmentId(createdDocument);

      if (!createdId) {
        throw new Error("Clone was not saved to database. Please try again.");
      }

      toast.success("Adjustment cloned successfully", { id: toastId });
      setMoreMenuOpen(false);
      await runCallback(onRefresh);
      navigate(`/inventory/edit/${createdId}`);
    } catch (error: any) {
      console.error("Error cloning adjustment:", error);
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        (error?.data?.field ? `Failed to clone adjustment (${error.data.field})` : "Failed to clone adjustment");
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsCloning(false);
    }
  };

  const confirmDelete = async () => {
    if (!currentAdjustmentId) {
      toast.error("Cannot delete: Adjustment ID not found");
      return;
    }

    setIsDeletingAdjustment(true);

    try {
      await inventoryAdjustmentsAPI.delete(currentAdjustmentId);
      setDeleteModalOpen(false);
      toast.success("Adjustment deleted successfully");
      await runCallback(onDelete);
      await runCallback(onRefresh);
      await runCallback(onClose);
    } catch (error: any) {
      console.error("Error deleting adjustment:", error);
      toast.error(error?.message || error?.data?.message || "Failed to delete adjustment");
    } finally {
      setIsDeletingAdjustment(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    const maxFiles = 10;
    const maxSize = 10 * 1024 * 1024;

    if (attachments.length + files.length > maxFiles) {
      toast.error(`You can upload a maximum of ${maxFiles} files.`);
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds the maximum size of 10MB.`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) {
      return;
    }

    if (!currentAdjustmentId) {
      toast.error("Cannot save attachment: Adjustment ID not found");
      return;
    }

    setIsUploading(true);

    try {
      const newAttachments = await Promise.all(
        validFiles.map(async (file, index) => {
          const fileData = await readFileAsDataUrl(file);
          return {
            id: `${Date.now()}_${index}`,
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type || "application/octet-stream",
            preview: fileData,
            file: fileData,
          } satisfies Attachment;
        }),
      );

      const nextAttachments = [...attachments, ...newAttachments];

      await inventoryAdjustmentsAPI.update(currentAdjustmentId, {
        attachments: toAttachmentPayload(nextAttachments),
      });

      setAttachments(nextAttachments);
      toast.success(`Successfully uploaded ${newAttachments.length} file(s)`);
      await refreshAdjustmentDetails();
      await runCallback(onRefresh);
    } catch (error: any) {
      console.error("Error saving attachment:", error);
      toast.error(error?.message || error?.data?.message || "Failed to save attachment to backend");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      void handleFileUpload(files);
    }
    event.target.value = "";
  };

  const handleFileClick = (attachment: Attachment) => {
    const source = getAttachmentSource(attachment);

    if (isImageAttachment(attachment) && source) {
      setSelectedImage(source);
      setShowImageViewer(true);
      return;
    }

    if (attachment.file instanceof File) {
      const objectUrl = URL.createObjectURL(attachment.file);
      triggerDownload(objectUrl, attachment.name);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    if (source) {
      triggerDownload(source, attachment.name);
      return;
    }

    toast.error("Attachment preview is unavailable");
  };

  const handleRemoveAttachment = async (indexOrId: string | number) => {
    if (!currentAdjustmentId) {
      toast.error("Cannot update attachments: Adjustment ID not found");
      return;
    }

    const nextAttachments = attachments.filter(
      (attachment, index) => index !== indexOrId && attachment.id !== indexOrId,
    );

    try {
      await inventoryAdjustmentsAPI.update(currentAdjustmentId, {
        attachments: toAttachmentPayload(nextAttachments),
      });
      setAttachments(nextAttachments);
      toast.success("Attachment removed successfully");
      await refreshAdjustmentDetails();
      await runCallback(onRefresh);
    } catch (error: any) {
      console.error("Error removing attachment:", error);
      toast.error(error?.message || error?.data?.message || "Failed to remove attachment from backend");
    }
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      void handleFileUpload(files);
    }
  };

  const handleDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleAttachFromDesktop = () => {
    fileInputRef.current?.click();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    const snapshot = captureScrollSnapshot();
    const nextComments = [
      ...comments,
      {
        id: `${Date.now()}_${comments.length}`,
        author: renderSafeValue(activeAdjustment.createdBy, "System"),
        timestamp: new Date().toISOString(),
        text: newComment.trim(),
      },
    ];

    setIsAddingComment(true);

    try {
      await persistComments(nextComments);
      setNewComment("");
      restoreScrollSnapshot(snapshot);
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error saving comment:", error);
      toast.error("Failed to save comment to backend");
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (comment: Comment, index: number) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    const snapshot = captureScrollSnapshot();
    const nextComments = comments.filter(
      (currentComment, currentIndex) =>
        (currentComment.id && currentComment.id !== comment.id) || (!currentComment.id && currentIndex !== index),
    );

    try {
      await persistComments(nextComments);
      restoreScrollSnapshot(snapshot);
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const canConvert = activeAdjustment.status === "DRAFT";

  return (
    <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
      <div className="px-3 md:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <h2 className="text-lg font-bold text-black m-0">Adjustment Details</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setAttachmentsModalOpen(true)}
            className="px-2.5 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border-none rounded-md cursor-pointer flex items-center justify-center min-w-9 h-9 gap-1 hover:bg-gray-200"
          >
            <Paperclip size={16} className="text-gray-500" />
            <span className="text-xs font-semibold">{attachments.length}</span>
          </button>
          <button
            onClick={() => setCommentsPanelOpen(true)}
            className="px-2.5 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border-none rounded-md cursor-pointer flex items-center justify-center min-w-9 h-9 hover:bg-gray-200"
          >
            <MessageCircle size={16} className="text-gray-500" />
          </button>
          <button
            onClick={() => void runCallback(onClose)}
            className="px-2.5 py-1.5 text-sm font-medium bg-transparent border-none rounded-md cursor-pointer flex items-center justify-center min-w-9 h-9"
            style={{ color: "#156372" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="px-3 md:px-6 py-3 border-b border-gray-200 flex flex-wrap items-center gap-0 overflow-x-auto">
        <button
          onClick={() => void runCallback(onEdit)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 border-r-0 rounded-none rounded-tl-md rounded-bl-md cursor-pointer flex items-center gap-1.5 hover:bg-gray-50 hover:border-gray-400"
        >
          <Edit size={16} />
          Edit
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => void handleDownloadPdf()}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 border-x-0 rounded-none cursor-pointer flex items-center gap-1.5 hover:bg-gray-50 hover:border-gray-400"
        >
          <Download size={16} />
          Download
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => void handleConvertToAdjusted()}
          disabled={!canConvert || isConverting}
          className={`px-3 py-1.5 text-sm font-medium bg-white border border-x-0 rounded-none flex items-center gap-1.5 ${canConvert && !isConverting ? "cursor-pointer" : "text-gray-400 cursor-not-allowed opacity-60 border-gray-300"}`}
          style={canConvert && !isConverting ? { color: "#156372", borderColor: "#156372" } : undefined}
          onMouseEnter={(event) => {
            if (canConvert) {
              event.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
            }
          }}
          onMouseLeave={(event) => {
            if (canConvert) {
              event.currentTarget.style.backgroundColor = "white";
            }
          }}
        >
          {isConverting ? (
            <>
              <div className="w-3 h-3 border-2 border-[#156372] border-t-transparent rounded-full animate-spin" />
              Converting...
            </>
          ) : (
            "Convert to Adjusted"
          )}
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              if (!moreMenuOpen && moreMenuRef.current) {
                const rect = moreMenuRef.current.getBoundingClientRect();
                setMenuPosition({
                  top: rect.bottom + 8,
                  right: window.innerWidth - rect.right,
                });
              }
              setMoreMenuOpen((open) => !open);
            }}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 border-l-0 rounded-none rounded-tr-md rounded-br-md cursor-pointer flex items-center justify-center hover:bg-gray-50 hover:border-gray-400"
          >
            <MoreVertical size={16} />
          </button>
          {moreMenuOpen &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setMoreMenuOpen(false)} />
                <div
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[10000] min-w-[200px] overflow-hidden"
                  style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="p-3">
                    <button
                      onClick={async () => {
                        const referenceToCopy = getAdjustmentReference(activeAdjustment);
                        if (!referenceToCopy || referenceToCopy === "N/A") {
                          toast.error("No reference number to copy");
                          return;
                        }

                        try {
                          await navigator.clipboard.writeText(referenceToCopy);
                          toast.success("Reference copied");
                          setMoreMenuOpen(false);
                        } catch {
                          toast.error("Failed to copy");
                        }
                      }}
                      className="w-full px-4 py-2 text-sm text-center text-gray-700 bg-transparent border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors font-medium mb-2 flex items-center justify-center gap-2"
                    >
                      <Copy size={14} />
                      Copy Reference
                    </button>
                    <button
                      onClick={() => void handleClone()}
                      disabled={isCloning}
                      className={`w-full px-4 py-2 text-sm text-center text-white bg-[#156372] rounded-md cursor-pointer hover:brightness-110 transition-all font-semibold mb-2 shadow-sm flex items-center justify-center gap-2 ${isCloning ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {isCloning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving clone...
                        </>
                      ) : (
                        "Clone"
                      )}
                    </button>
                    <button
                      onClick={handleDeleteRequest}
                      className="w-full px-4 py-2 text-sm text-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>,
              document.body,
            )}
        </div>
      </div>

      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-end">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowPdfView((visible) => !visible)}>
          <span className="text-sm italic text-black">Show PDF View</span>
          <div
            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${showPdfView ? "" : "bg-gray-300"}`}
            style={showPdfView ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : undefined}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-md ${showPdfView ? "left-[22px]" : "left-0.5"}`}
            />
          </div>
        </div>
      </div>

      <AdjustmentDocumentContent
        adjustment={activeAdjustment}
        itemRows={itemRows}
        baseCurrency={baseCurrency}
        showPdfView={showPdfView}
        journalLines={journalLines}
        onOpenPdfTemplate={() => navigate("/settings/customization/pdf-templates")}
      />

      <CommentsPanel
        open={commentsPanelOpen}
        comments={comments}
        newComment={newComment}
        isAddingComment={isAddingComment}
        commentsPanelRef={commentsPanelRef}
        onClose={() => setCommentsPanelOpen(false)}
        onNewCommentChange={setNewComment}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
      />

      <AttachmentsModal
        open={attachmentsModalOpen}
        attachments={attachments}
        isDragging={isDragging}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onClose={() => setAttachmentsModalOpen(false)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onAttachFromDesktop={handleAttachFromDesktop}
        onFileInputChange={handleFileInputChange}
        onFileClick={handleFileClick}
        onRemoveAttachment={handleRemoveAttachment}
      />

      <ImageViewerModal
        open={showImageViewer}
        image={selectedImage}
        onClose={() => {
          setShowImageViewer(false);
          setSelectedImage(null);
        }}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        isDeleting={isDeletingAdjustment}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
