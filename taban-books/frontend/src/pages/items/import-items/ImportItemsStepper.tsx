import { Check } from "lucide-react";
import { useImportItemsContext } from "./context";

export function ImportItemsStepper() {
  const { currentStep } = useImportItemsContext();

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center">
        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 ${currentStep === "configure" ? "bg-blue-600 text-white" : "bg-green-500 text-white"} rounded-full flex items-center justify-center font-bold text-sm shadow-md`}
          >
            {currentStep === "configure" ? "1" : <Check size={16} />}
          </div>
          <div className={`text-sm font-semibold mt-2 ${currentStep === "configure" ? "text-blue-600" : "text-gray-600"}`}>
            Configure
          </div>
        </div>

        <div className={`w-24 h-1 mx-4 ${currentStep !== "configure" ? "bg-blue-600" : "bg-gray-300"}`} />

        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 ${currentStep === "mapFields" ? "bg-blue-600 text-white" : currentStep === "preview" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${currentStep === "mapFields" ? "shadow-md" : ""}`}
          >
            {currentStep === "preview" ? <Check size={16} /> : "2"}
          </div>
          <div className={`text-sm font-semibold mt-2 ${currentStep === "mapFields" ? "text-blue-600" : "text-gray-600"}`}>
            Map Fields
          </div>
        </div>

        <div className={`w-24 h-1 mx-4 ${currentStep === "preview" ? "bg-blue-600" : "bg-gray-300"}`} />

        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 ${currentStep === "preview" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${currentStep === "preview" ? "shadow-md" : ""}`}
          >
            3
          </div>
          <div className={`text-sm font-semibold mt-2 ${currentStep === "preview" ? "text-blue-600" : "text-gray-600"}`}>
            Preview
          </div>
        </div>
      </div>
    </div>
  );
}
