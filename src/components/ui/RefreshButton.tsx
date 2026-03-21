import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './button';

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
  label?: string;
}

export function RefreshButton({
  onClick,
  loading = false,
  className = "",
  label = "Atualizar"
}: RefreshButtonProps) {
  return (
    <Button 
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className={`h-9 px-4 gap-2 border-border/50 bg-muted/5 hover:bg-muted/10 transition-all font-semibold text-xs ${className}`}
    >
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      {label && <span className="hidden sm:inline">{label}</span>}
    </Button>
  );
}
