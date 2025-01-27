// Modal.tsx
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, children }) => {
  if (!isOpen) return null; // Si le modal n'est pas ouvert, ne rien afficher.

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <div className="rounded-lg shadow-lg w-96 p-6 bg-white dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
};

export default Modal;