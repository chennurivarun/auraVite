import React, { useState, useEffect } from 'react';
import { Notification } from '@/api/entities';
import NotificationItem from './NotificationItem';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BellRing, CheckCheck, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter({ userEmail, onNotificationsUpdate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userEmail) {
      fetchNotifications();
    }
  }, [userEmail]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await Notification.filter({ user_email: userEmail }, '-created_date', 50);
      setNotifications(data || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read_status) {
      try {
        await Notification.update(notification.id, { read_status: true });
        fetchNotifications();
        onNotificationsUpdate();
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    navigate(notification.link);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_status).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      const updatePromises = unreadIds.map(id => Notification.update(id, { read_status: true }));
      await Promise.all(updatePromises);
      fetchNotifications();
      onNotificationsUpdate();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <div className="w-full md:w-96 bg-white rounded-lg shadow-xl border">
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          Notifications
        </h3>
        <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
          <CheckCheck className="w-4 h-4 mr-2" />
          Mark all as read
        </Button>
      </div>
      <Separator />
      <ScrollArea className="h-96">
        {loading ? (
          <div className="text-center p-8 text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            No new notifications
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} onClick={handleNotificationClick} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}