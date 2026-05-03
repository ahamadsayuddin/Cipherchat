/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import useSound from 'use-sound';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Games from './components/Games';
import Settings from './components/Settings';
import SecurityWrapper from './components/SecurityWrapper';
import { User, Notification as AppNotification } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'games' | 'settings'>('chats');
  const [socket, setSocket] = useState<any>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Sound notification placeholders
  const [playMessageSound] = useSound('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', { volume: 0.4 });
  const [playAlertSound] = useSound('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', { volume: 0.6 });

  useEffect(() => {
    if (token && !socket) {
      const newSocket = io({
        auth: { token }
      });
      
      newSocket.on('connect', () => {
        newSocket.emit('authenticate', token);
      });

      newSocket.on('notification:new', (notification: AppNotification) => {
        setNotifications(prev => [
          { ...notification, id: notification.id || Math.random().toString(), createdAt: new Date().toISOString() },
          ...prev
        ]);
        
        if (notification.type === 'security') {
          playAlertSound();
          toast.error(notification.title, {
            description: notification.body,
            duration: 5000,
          });
        } else {
          playMessageSound();
          toast(notification.title, {
            description: notification.body,
          });
        }
      });

      setSocket(newSocket);
    }
  }, [token, socket]);

  const handleAuth = (token: string, user: User, privKey: CryptoKey) => {
    setToken(token);
    setUser(user);
    setPrivateKey(privKey);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    setToken(null);
    setUser(null);
    setPrivateKey(null);
    if (socket) socket.disconnect();
    setSocket(null);
  };

  if (!token || !user || !privateKey) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="flex h-screen bg-[#0A0B0E] overflow-hidden">
      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#14161B',
            border: '1px solid #2D333B',
            color: '#E6EDF3',
          }
        }}
      />
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={logout}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      
      <main className="flex-1 relative overflow-hidden bg-[#0A0B0E]">
        <SecurityWrapper user={user} socket={socket} activeChatId={activeChatId}>
          <AnimatePresence mode="wait">
            {activeTab === 'chats' && (
              <motion.div
                key="chats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <Chat 
                  currentUser={user} 
                  privateKey={privateKey} 
                  socket={socket} 
                  setActiveChatId={setActiveChatId} 
                />
              </motion.div>
            )}
            
            {activeTab === 'games' && (
              <motion.div
                key="games"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <Games currentUser={user} socket={socket} />
              </motion.div>
            )}
   
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                 <Settings user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </SecurityWrapper>
      </main>
    </div>
  );
}
