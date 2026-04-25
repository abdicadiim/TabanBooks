import { useNewAdjustmentFormContext } from "./context";

export function AdjustmentFormActions() {
  const { actions, isEditMode, loading, submittingStatus } = useNewAdjustmentFormContext();

  return (
    <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
      <button
        type="button"
        onClick={actions.cancel}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-white rounded-md border-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
      >
        {submittingStatus === "DRAFT"
          ? isEditMode
            ? "Updating..."
            : "Saving..."
          : isEditMode
            ? "Update as Draft"
            : "Save as Draft"}
      </button>
      <button
        type="button"
        onClick={actions.convertToAdjusted}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submittingStatus === "ADJUSTED" ? "Converting..." : "Convert to Adjusted"}
      </button>
    </div>
  );
}
