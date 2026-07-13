import { Check } from 'lucide-react';
import './Toast.css';

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast" role="status">
      <Check size={14} className="toast__icon" />
      <span>{message}</span>
    </div>
  );
}
