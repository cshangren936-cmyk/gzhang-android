import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Modal({ title, children, onClose, className = "" }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-sheet ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button subtle" onClick={onClose} aria-label="Close">
            <AppIcon name="X" size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
