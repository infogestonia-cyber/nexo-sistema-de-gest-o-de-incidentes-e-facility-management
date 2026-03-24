import React from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './button';

interface NotificationBellProps {
  notifications: any[];
  isOpen: boolean;
  onToggle: () => void;
  onRead: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  notifications, 
  isOpen, 
  onToggle, 
  onRead,
  className = "h-8 w-8 text-muted-foreground hover:text-foreground relative"
}) => {
  const unreadCount = notifications.filter(n => !n.lida).length;

  return (
    <div className="relative">
      <Button
        variant="ghost" 
        size="icon"
        onClick={() => {
          onToggle();
          if (!isOpen) onRead();
        }}
        className={className}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={onToggle} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-xs font-semibold text-foreground">Notificações</span>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div 
                      key={i} 
                      className={`p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.lida ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.lida ? 'bg-primary' : 'bg-muted'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1 leading-none">{n.titulo}</p>
                          <p className="text-xs text-muted-foreground leading-snug">{n.mensagem}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <Bell size={24} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">Sem notificações recentes</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
