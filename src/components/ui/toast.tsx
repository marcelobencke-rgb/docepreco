import { useEffect } from 'react';

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  duration?: number;
  variant?: 'success' | 'error';
}

export function Toast({ open, onOpenChange, title, description, duration = 3000, variant = 'success' }: ToastProps) {
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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 md:left-auto md:transform-none md:right-6 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] md:w-auto">
      <div className={`rounded-[1.25rem] shadow-[0_8px_30px_rgba(159,64,45,0.12)] border p-4 flex gap-3 w-full md:min-w-[300px] md:max-w-sm items-start ${variant === 'error' ? 'bg-[#FFF0F0] border-[#FDE8E8]' : 'bg-white border-[#FDF0EC]'}`}>
        <div className={`shrink-0 p-1 rounded-full flex items-center justify-center ${variant === 'error' ? 'text-error bg-error-container' : 'text-[#2e6d3d] bg-[#e2f1e5]'}`}>
           <span className="material-symbols-outlined text-[20px]">{variant === 'error' ? 'error' : 'check'}</span>
        </div>
        <div className="flex-1 pt-0.5">
          <h4 className="font-display-md text-[#3e1d15] text-[15px] leading-tight">{title}</h4>
          {description && (
            <p className="font-body-md text-[#7a5642] text-[13px] mt-1 leading-snug">{description}</p>
          )}
        </div>
        <button 
          onClick={() => onOpenChange(false)}
          className="shrink-0 text-[#B08D87] hover:text-primary transition-colors p-1 rounded-full hover:bg-[#FFF4F2] flex items-center justify-center -mr-1 -mt-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
