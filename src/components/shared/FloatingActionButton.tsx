import React from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  label: string;
}

export const FloatingActionButton: React.FC<FABProps> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="fixed bottom-8 right-6 bg-action-blue text-white p-6 rounded-full shadow-xl hover:bg-blue-600 transition z-10"
    aria-label={label}
  >
    <Plus className="w-8 h-8" />
  </button>
);
