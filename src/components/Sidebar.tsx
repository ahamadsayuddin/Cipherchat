/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Gamepad2, Settings, User as UserIcon, LogOut, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { User, Notification } from '../types';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  activeTab: 'chats' | 'games' | 'settings';
  setActiveTab: (tab: 'chats' | 'games' | 'settings') => void;
  user: User;
  onLogout: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, notifications, setNotifications }: SidebarProps) {
  const tabs = [
    { id: 'chats', icon: MessageSquare, label: 'CHATS' },
    { id: 'games', icon: Gamepad2, label: 'GAMES' },
    { id: 'settings', icon: Settings, label: 'SETTINGS' },
  ] as const;

  return (
    <div className="w-20 md:w-64 bg-[#0A0B0E]/80 backdrop-blur-xl border-r border-[#2D333B] flex flex-col h-full z-40">
      <div className="p-4 md:p-6 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,157,0.1)]">
            <span className="font-mono text-[#00FF9D] font-bold">C</span>
          </div>
          <span className="hidden md:block font-mono font-bold text-sm tracking-tighter text-[#E6EDF3] uppercase">Cipher_Node</span>
        </div>
        <div className="md:hidden">
           <NotificationBell notifications={notifications} setNotifications={setNotifications} />
        </div>
      </div>

      <div className="hidden md:block px-6 mb-6">
         <NotificationBell notifications={notifications} setNotifications={setNotifications} />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-mono text-[11px] font-bold uppercase tracking-widest relative group",
              activeTab === tab.id 
                ? "bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/20 shadow-[inset_0_0_10px_rgba(0,255,157,0.05)]" 
                : "text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#14161B]"
            )}
          >
            <tab.icon className={cn("w-5 h-5 transition-transform group-active:scale-95", activeTab === tab.id ? "text-[#00FF9D]" : "group-hover:text-[#E6EDF3]")} />
            <span className="hidden md:block">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute left-1 w-1.5 h-6 bg-[#00FF9D] rounded-full shadow-[0_0_15px_#00FF9D]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-[#2D333B] bg-[#050505]">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 rounded-full bg-[#14161B] border border-[#00FF9D]/20 flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-[#00FF9D]" />
            )}
          </div>
          <div className="hidden md:block overflow-hidden">
            <div className="text-sm font-mono text-[#E6EDF3] font-bold truncate tracking-tight">{user.username}</div>
            <div className="text-[9px] font-mono text-[#00FF9D] uppercase tracking-widest font-bold">NODE_ACTIVE</div>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors group border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden md:block font-mono text-[10px] font-bold tracking-widest">LOGOUT</span>
        </button>
      </div>
    </div>
  );
}
