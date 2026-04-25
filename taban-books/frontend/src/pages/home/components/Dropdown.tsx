import React, { type Dispatch, type ReactNode, type SetStateAction, useEffect, useRef } from "react";

type DropdownAlign = "left" | "right";

interface DropdownProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  trigger: ReactNode;
  children: ReactNode;
  align?: DropdownAlign;
}

export default function Dropdown({
  open,
  setOpen,
  trigger,
  children,
  align = "right",
}: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setOpen]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2
          w-56 rounded-xl border bg-white shadow-lg z-50`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
