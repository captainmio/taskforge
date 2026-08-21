import { useEffect, useRef, useState, type ReactNode } from "react";

interface DropdownMenuProps {
  trigger: (isOpen: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  containerClassName?: string;
  triggerClassName?: string;
}

const DropdownMenu = ({
  trigger,
  children,
  align = "right",
  containerClassName = "",
  triggerClassName = "",
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer focus-visible:outline-site-green ${triggerClassName}`}
      >
        {trigger(isOpen)}
      </button>
      {isOpen ? (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          {typeof children === "function"
            ? children(() => setIsOpen(false))
            : children}
        </div>
      ) : null}
    </div>
  );
};

export default DropdownMenu;
