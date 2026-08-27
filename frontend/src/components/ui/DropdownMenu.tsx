import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownMenuProps {
  trigger: (isOpen: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  containerClassName?: string;
  triggerClassName?: string;
  menuClassName?: string;
}

interface MenuPosition {
  top: number;
  left?: number;
  right?: number;
}

const DropdownMenu = ({
  trigger,
  children,
  align = "right",
  containerClassName = "",
  triggerClassName = "",
  menuClassName = "w-64",
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = (): void => {
      const triggerBounds = triggerRef.current?.getBoundingClientRect();
      if (!triggerBounds) return;

      setMenuPosition(
        align === "right"
          ? {
              top: triggerBounds.bottom + 8,
              right: window.innerWidth - triggerBounds.right,
            }
          : { top: triggerBounds.bottom + 8, left: triggerBounds.left },
      );
    };
    const closeOnOutsideClick = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };

    updateMenuPosition();
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [align, isOpen]);

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer focus-visible:outline-site-green ${triggerClassName}`}
      >
        {trigger(isOpen)}
      </button>
      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={menuPosition}
              className={`fixed z-50 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ${menuClassName}`}
            >
              {typeof children === "function"
                ? children(() => setIsOpen(false))
                : children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default DropdownMenu;
