import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = ""
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between px-2 py-4 border-t border-border/10 ${className}`}>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        A mostrar {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(totalItems, currentPage * itemsPerPage)} de {totalItems} registos
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border/50 bg-muted/5 hover:bg-muted/10 disabled:opacity-30 transition-all font-bold"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={14} />
        </Button>
        <div className="flex items-center px-3 h-8 border border-border/50 bg-background/50 backdrop-blur-sm rounded-md mx-1">
          <span className="text-[10px] font-bold">{currentPage}</span>
          <span className="text-[10px] text-muted-foreground/50 mx-1.5 font-medium">/</span>
          <span className="text-[10px] text-muted-foreground/50 font-medium">{totalPages}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-border/50 bg-muted/5 hover:bg-muted/10 disabled:opacity-30 transition-all font-bold"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
