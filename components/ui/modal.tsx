// Modal.tsx
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="rounded-lg border shadow-lg w-full max-w-sm p-6 bg-card text-card-foreground">
        {children}
      </div>
    </div>
  );
};

export default Modal;