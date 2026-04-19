import React from "react";

type LoadingSpinnerSize = "sm" | "md" | "lg";

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  className?: string;
  fullScreen?: boolean;
}

const LoadingSpinner = ({
  size = "md",
  className = "",
  fullScreen = false,
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const borderSizes = {
    sm: "border-[2px]",
    md: "border-[3px]",
    lg: "border-[4px]",
  };

  const sizeClass = sizeClasses[size];
  const borderSize = borderSizes[size];

  const containerClass = fullScreen 
    ? `flex items-center justify-center min-h-screen ${className}`
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClass}>
      <div className="relative">
        <div className={`relative ${sizeClass}`}>
          <div
            className={`absolute w-full h-full rounded-full ${borderSize} border-gray-100/10 border-r-[#0ff] border-b-[#0ff] animate-spin`}
            style={{ animationDuration: "3s" }}
          ></div>

          <div
            className={`absolute w-full h-full rounded-full ${borderSize} border-gray-100/10 border-t-[#0ff] animate-spin`}
            style={{ animationDuration: "2s", animationDirection: "reverse" }}
          ></div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-tr from-[#0ff]/10 via-transparent to-[#0ff]/5 animate-pulse rounded-full blur-sm"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;

