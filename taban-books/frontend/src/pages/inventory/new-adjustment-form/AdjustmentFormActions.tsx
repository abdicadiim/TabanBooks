import { useNewAdjustmentFormContext } from "./context";

export function AdjustmentFormActions() {
  const { actions, isEditMode, loading, submittingStatus } = useNewAdjustmentFormContext();

  return (
    <div className="mt-10 border-t border-[#e5e7eb] pt-6">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-start">
      <button
        type="button"
        onClick={actions.cancel}
        disabled={loading}
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer rounded-md border-none px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
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
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submittingStatus === "ADJUSTED" ? "Converting..." : "Convert to Adjusted"}
      </button>
      </div>
    </div>
  );
}
