import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, EyeOff } from 'lucide-react';
import { User } from '../types';
import { Socket } from 'socket.io-client';

interface SecurityWrapperProps {
  children: React.ReactNode;
  user: User;
  socket: Socket | null;
  activeChatId?: string | null;
}

export default function SecurityWrapper({ children, user, socket, activeChatId }: SecurityWrapperProps) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
        if (socket && activeChatId) {
          socket.emit('security:alert', {
            action: 'tab_switch_hidden',
            details: 'User switched away from the secure channel',
            targetUserId: activeChatId
          });
        }
      } else {
        setIsBlurred(false);
      }
    };

    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Common screenshot/screen recording shortcuts
      const isScreenshot = e.key === 'PrintScreen' || 
                          (e.shiftKey && e.metaKey && (e.key === '3' || e.key === '4' || e.key === '5')) || // Mac
                          (e.metaKey && e.key === 's') || // Snipping tool proxy
                          (e.ctrlKey && e.key === 'PrintScreen');

      // Disable PrintScreen, Ctrl+S, Ctrl+P, Ctrl+U, Ctrl+Shift+I
      if (
        isScreenshot ||
        (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u' || (e.shiftKey && e.key === 'I'))) ||
        (e.metaKey && (e.key === 's' || e.key === 'p' || e.key === 'u' || (e.shiftKey && e.key === 'I')))
      ) {
        e.preventDefault();
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
        
        if (socket && activeChatId) {
          socket.emit('security:alert', {
            action: isScreenshot ? 'screenshot_detected' : 'keyboard_shortcut_blocked',
            details: `User attempted to use restricted shortcut: ${e.key}`,
            targetUserId: activeChatId
          });
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [socket, activeChatId]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className={isBlurred ? "blur-xl transition-all duration-300" : "transition-all duration-300 h-full"}>
        {children}
      </div>

      {/* Watermark Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] select-none z-50">
        <div className="grid grid-cols-4 gap-20 rotate-[-15deg] scale-150">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="text-[10px] font-mono whitespace-nowrap">
              {user.id} // {user.username} // SECURE_NODE
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Guard Screen */}
      <AnimatePresence>
        {isBlurred && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0A0B0E]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6"
          >
            <div className="p-4 bg-[#00FF9D]/10 rounded-full mb-4 border border-[#00FF9D]/20">
              <EyeOff className="w-12 h-12 text-[#00FF9D]" />
            </div>
            <h2 className="text-xl font-mono font-bold text-[#E6EDF3] mb-2 tracking-tighter">PRIVACY_GUARD_ACTIVE</h2>
            <p className="text-[#7D8590] font-mono text-xs uppercase tracking-widest max-w-xs">
              Secure content hidden while window is inactive or blurred.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Toast Overlay */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white font-mono text-[10px] uppercase font-bold py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            <ShieldAlert className="w-3 h-3" />
            Security Protocol Violation: Action Restricted
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
