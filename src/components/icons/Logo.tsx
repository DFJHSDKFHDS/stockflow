// src/components/icons/Logo.tsx
import type { SVGProps } from 'react';
import { Warehouse } from 'lucide-react';

export function Logo(props: SVGProps<SVGSVGElement> & { className?: string, showText?: boolean }) {
  const { className, showText = true, ...rest } = props;
  return (
    <div className="flex items-center gap-2">
      <Warehouse className={cn("h-8 w-8 text-primary", className)} {...rest} />
      {showText && <span className="text-2xl font-bold text-primary">StockFlow</span>}
    </div>
  );
}

// Helper cn function if not globally available in this context (it should be from utils)
// If direct import is an issue for some reason, define it locally or ensure path correctness.
// For this exercise, assuming cn is resolvable or can be inlined if necessary.
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');
