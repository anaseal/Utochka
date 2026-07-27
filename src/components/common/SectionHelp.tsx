import { useId } from 'react';
import { HelpCircle } from 'lucide-react';
import './SectionHelp.css';

export const SectionHelp = ({ text }: { text: string }) => {
  const id = useId();
  return (
    <span className="section-help">
      <button type="button" className="section-help__icon" aria-describedby={id}>
        <HelpCircle size={15} />
      </button>
      <span className="section-help__bubble" role="tooltip" id={id}>{text}</span>
    </span>
  );
};
