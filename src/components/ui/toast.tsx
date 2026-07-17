import { useEffect } from 'react';

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  duration?: number;
}

export function Toast({ open, onOpenChange, title, description, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="bg-white rounded-[1.25rem] shadow-[0_8px_30px_rgba(159,64,45,0.12)] border border-[#FDF0EC] p-4 flex gap-3 min-w-[300px] max-w-sm w-full items-start">
        <div className="shrink-0 text-[#2e6d3d] bg-[#e2f1e5] p-1 rounded-full flex items-center justify-center">
           <span className="material-symbols-outlined text-[20px]">check</span>
        </div>
        <div className="flex-1 pt-0.5">
          <h4 className="font-display-md text-[#3e1d15] text-[15px] leading-tight">{title}</h4>
          {description && (
            <p className="font-body-md text-[#7a5642] text-[13px] mt-1 leading-snug">{description}</p>
          )}
        </div>
        <button 
          onClick={() => onOpenChange(false)}
          className="shrink-0 text-[#B08D87] hover:text-[#9F402D] transition-colors p-1 rounded-full hover:bg-[#FFF4F2] flex items-center justify-center -mr-1 -mt-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
