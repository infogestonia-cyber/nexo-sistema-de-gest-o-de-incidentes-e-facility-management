import { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import { api } from '../services/api';
import { showPushNotification } from '../utils/notifications';

export function useNotifications(user: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/api/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao buscar notificações:', e);
      setNotifications([]);
    }
  }, [user]);

  const markAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await api.post('/api/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (e) {
      console.error('Erro ao marcar notificações como lidas:', e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const handleNotification = (notif: any) => {
      if (notif.userId === user.id) {
        setNotifications(prev => [notif, ...prev]);
        showPushNotification(notif.titulo || 'Nexo SGFM', notif.mensagem);
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    isOpen,
    setIsOpen,
    markAsRead,
    fetchNotifications,
    unreadCount: notifications.filter(n => !n.lida).length
  };
}
