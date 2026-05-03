import React, { useState, useEffect } from 'react';
import { Bell, Shield, MessageSquare, Gamepad2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';
import { cn } from '../lib/utils';

interface NotificationBellProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function NotificationBell({ notifications, setNotifications }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4 text-red-400" />;
      case 'invite': return <Gamepad2 className="w-4 h-4 text-[#00FF9D]" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      default: return <Bell className="w-4 h-4 text-[#7D8590]" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[#14161B] transition-colors relative group"
      >
        <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-[#00FF9D] animate-pulse" : "text-[#7D8590] group-hover:text-[#E6EDF3]")} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0A0B0E]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 mt-2 w-80 bg-[#14161B] border border-[#2D333B] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-[#2D333B] flex items-center justify-between bg-[#0A0B0E]/50">
                <span className="text-[10px] font-mono font-bold text-[#E6EDF3] uppercase tracking-widest">Inbound Signals ({unreadCount})</span>
                <button 
                  onClick={markAllRead}
                  className="text-[9px] font-mono text-[#00FF9D] hover:underline uppercase font-bold"
                >
                  Clear_All
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-[#2D333B]">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={cn(
                          "p-4 hover:bg-[#1C1F26] transition-colors relative group",
                          !n.read && "bg-[#00FF9D]/5"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            {getIcon(n.type)}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-mono font-bold text-[#E6EDF3] mb-1">{n.title}</h4>
                            <p className="text-[10px] font-mono text-[#7D8590] leading-relaxed">{n.body}</p>
                            <span className="text-[9px] font-mono text-[#2D333B] mt-2 block uppercase">
                              {new Date(n.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeNotification(n.id)}
                          className="absolute right-2 top-2 p-1 text-[#2D333B] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-[#2D333B] mx-auto mb-3 opacity-20" />
                    <p className="text-[10px] font-mono text-[#7D8590] uppercase tracking-widest">No Signals Detected</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
