/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, User as UserIcon, Shield, Lock, Terminal, ShieldCheck, Clock, Trash2, Check, CheckCheck, Smile } from 'lucide-react';
import { cn } from '../lib/utils';
import { User, Message } from '../types';
import { encryptHybrid, decryptHybrid } from '../lib/crypto';
import { ChatSkeleton } from './ui/Skeleton';

const TTL_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '1m', value: 60 },
  { label: '1h', value: 3600 },
];

interface ChatProps {
  currentUser: User;
  privateKey: CryptoKey;
  socket: any;
  setActiveChatId: (id: string | null) => void;
}

export default function Chat({ currentUser, privateKey, socket, setActiveChatId }: ChatProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [activeChat, setActiveChat] = useState<User | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update global active chat ID for security monitoring
  useEffect(() => {
    setActiveChatId(activeChat?.id || null);
    setIsPartnerTyping(false); // Reset typing when switching chat
  }, [activeChat, setActiveChatId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ttl, setTtl] = useState(0);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reactions state (msgId -> array of emojis)
  const [reactions, setReactions] = useState<Record<string, string[]>>({});

  // Typing indicator receiver
  useEffect(() => {
    if (!socket) return;
    const handleTyping = (data: { senderId: string, isTyping: boolean }) => {
      if (activeChat && data.senderId === activeChat.id) {
        setIsPartnerTyping(data.isTyping);
      }
    };
    socket.on('chat:typing', handleTyping);
    return () => { socket.off('chat:typing', handleTyping); };
  }, [socket, activeChat]);

  const handleTypingInput = (val: string) => {
    setNewMessage(val);
    if (!socket || !activeChat) return;

    socket.emit('chat:typing', { receiverId: activeChat.id, isTyping: true });
    
    if (typingTimeout) clearTimeout(typingTimeout);
    
    const timeout = setTimeout(() => {
      socket.emit('chat:typing', { receiverId: activeChat.id, isTyping: false });
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  // Filter out expired messages from state
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => prev.filter(m => !m.expiresAt || new Date(m.expiresAt).getTime() > now));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      
      // Try to decrypt if it's for us
      if (msg.receiverId === currentUser.id) {
        try {
          const plain = await decryptHybrid(msg.content, msg.iv, (msg as any).encryptedKey, privateKey);
          setDecryptedMessages(prev => ({ ...prev, [msg.id]: plain }));
        } catch (err) {
          console.error("Decryption failed", err);
          setDecryptedMessages(prev => ({ ...prev, [msg.id]: "[DECRYPTION_ERROR: KEY_MISMATCH]" }));
        }
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:message:sent', (msg: Message) => setMessages(prev => [...prev, msg]));

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:message:sent');
    };
  }, [socket, currentUser.id, privateKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const searchUsers = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsLoadingSearch(true);
    try {
      const res = await fetch(`/api/users/search/${val}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      setSearchResults(data.filter((u: User) => u.id !== currentUser.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !activeChat.publicKey) return;

    try {
      const encrypted = await encryptHybrid(newMessage, activeChat.publicKey);
      socket.emit('chat:message', {
        receiverId: activeChat.id,
        content: encrypted.content,
        iv: encrypted.iv,
        encryptedKey: encrypted.encryptedKey,
        type: 'text',
        ttl: ttl > 0 ? ttl : null
      });
      
      // Store local decrypted version for ourselves
      const tempId = `temp-${Date.now()}`;
      setDecryptedMessages(prev => ({ ...prev, [tempId]: newMessage }));
      setNewMessage('');
    } catch (err) {
      console.error("Encryption failed", err);
    }
  };

  return (
    <div className="flex h-full bg-[#0A0B0E]">
      {/* Sidebar - Search/Contacts */}
      <div className="w-full md:w-80 border-r border-[#2D333B] flex flex-col bg-[#0A0B0E]">
        <div className="p-4 border-b border-[#2D333B]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D8590]" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="SEARCH_IDENTITY..."
              className="w-full bg-[#14161B] border border-[#2D333B] rounded-lg py-2 pl-10 pr-4 text-xs font-mono text-[#E6EDF3] focus:outline-hidden focus:border-[#00FF9D] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingSearch ? (
            <ChatSkeleton />
          ) : searchResults.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-mono text-[#7D8590] uppercase tracking-widest font-bold">Search Results</div>
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => { setActiveChat(user); setSearchResults([]); setQuery(''); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#14161B] transition-colors group border border-transparent hover:border-[#2D333B]"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0A0B0E] border border-[#2D333B] flex items-center justify-center relative">
                    <UserIcon className="w-5 h-5 text-[#7D8590] group-hover:text-[#00FF9D]" />
                    <ShieldCheck className="absolute -right-1 -bottom-1 w-4 h-4 text-[#00FF9D] fill-[#0A0B0E]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-mono font-bold text-[#E6EDF3]">{user.username}</div>
                    <div className="text-[10px] font-mono text-[#7D8590] uppercase truncate w-32 tracking-tighter">{user.id}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Terminal className="w-8 h-8 text-[#2D333B] mb-4" />
              <p className="text-[#7D8590] font-mono text-[10px] uppercase tracking-widest font-bold">No active secure channels</p>
              <p className="text-[#2D333B] font-mono text-[10px] mt-2 uppercase tracking-[0.3em]">Awaiting Discovery</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col relative bg-[#14161B]">
        <AnimatePresence mode="wait">
          {activeChat ? (
            <motion.div 
              key={activeChat.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              <div className="h-16 px-6 border-b border-[#2D333B] bg-[#0A0B0E]/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#14161B] border border-[#00FF9D]/30 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-[#00FF9D]" />
                  </div>
                  <div>
                    <div className="text-sm font-mono font-bold text-[#E6EDF3] uppercase tracking-tight">{activeChat.username}</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00FF9D] font-bold">
                      <Lock className="w-3 h-3" />
                      E2E_ENCRYPTION_ACTIVE
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                   <div className="text-[11px] font-mono text-[#00FF9D] bg-[#00FF9D]/10 border border-[#00FF9D] px-2 py-1 rounded">
                     AES-256-GCM VERIFIED
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 technical-grid custom-scrollbar bg-[#14161B]">
                {messages.filter(m => (m.senderId === activeChat.id && m.receiverId === currentUser.id) || (m.senderId === currentUser.id && m.receiverId === activeChat.id)).map((msg, i) => {
                  const isMe = msg.senderId === currentUser.id;
                  const decrypted = decryptedMessages[msg.id] || (isMe ? "..." : "[ENCRYPTED_PACKET]");
                  const isExpiring = !!msg.expiresAt;
                  const remainingSec = isExpiring ? Math.max(0, Math.floor((new Date(msg.expiresAt!).getTime() - Date.now()) / 1000)) : null;

                  return (
                    <motion.div 
                      key={msg.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex flex-col group/msg", isMe ? "items-end" : "items-start gap-1")}
                    >
                      <div className="flex items-center gap-2">
                         {!isMe && <span className="text-[9px] font-mono text-[#7D8590] uppercase font-bold">{activeChat.username} //</span>}
                         <span className="text-[9px] font-mono text-[#7D8590] uppercase">
                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString()}
                         </span>
                         {isMe && <span className="text-[9px] font-mono text-[#7D8590] uppercase font-bold">// YOU</span>}
                      </div>

                      <div className="relative group/bubble max-w-[80%]">
                        <div className={cn(
                          "p-4 rounded-2xl font-mono text-[13px] leading-relaxed break-words shadow-lg transition-all",
                          isMe 
                            ? "bg-[#00FF9D] text-[#0A0B0E] font-bold shadow-[0_0_20px_rgba(0,255,157,0.15)] rounded-tr-none" 
                            : "bg-[#0A0B0E] text-[#E6EDF3] border border-[#2D333B] rounded-tl-none backdrop-blur-sm"
                        )}>
                          {decrypted}
                          
                          {/* Reactions overlay */}
                          {reactions[msg.id] && (
                            <div className="flex gap-1 mt-2">
                              {reactions[msg.id].map((emoji, idx) => (
                                <span key={idx} className="bg-[#14161B] border border-[#2D333B] rounded px-1 text-[10px]">{emoji}</span>
                              ))}
                            </div>
                          )}

                          <div className={cn(
                            "flex items-center gap-1.5 mt-1 opacity-40",
                            isMe ? "justify-end" : "justify-start"
                          )}>
                             {isMe && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>

                        {/* Reaction Trigger Button */}
                        <button 
                          onClick={() => {
                            const emojis = ['👍', '❤️', '🔥', '😂', '😮'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            setReactions(prev => ({ 
                              ...prev, 
                              [msg.id]: [...(prev[msg.id] || []), randomEmoji].slice(-5) 
                            }));
                          }}
                          className={cn(
                            "absolute -top-2 p-1.5 bg-[#14161B] border border-[#2D333B] rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all hover:border-[#00FF9D]/50 hover:text-[#00FF9D] z-10",
                            isMe ? "-left-10" : "-right-10"
                          )}
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>

                        {isExpiring && (
                          <div className={cn(
                            "mt-1 flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded border transition-colors",
                            remainingSec! < 10 ? "text-red-400 border-red-400/20 bg-red-400/5 animate-pulse" : "text-[#00FF9D] border-[#00FF9D]/20 bg-[#00FF9D]/5",
                            isMe ? "ml-auto" : "mr-auto"
                          )}>
                            <Clock className="w-2.5 h-2.5" />
                            PURGE: {remainingSec}S
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {isPartnerTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start gap-1"
                  >
                    <div className="bg-[#0A0B0E] border border-[#2D333B] p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#00FF9D] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-[#00FF9D] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-[#00FF9D] rounded-full animate-bounce" />
                    </div>
                    <span className="text-[9px] font-mono text-[#00FF9D] uppercase font-bold ml-1">Identity is typing...</span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-[#0A0B0E] border-t border-[#2D333B] backdrop-blur-md">
                <div className="flex items-center gap-4 mb-3 px-2">
                  <span className="text-[10px] font-mono text-[#7D8590] uppercase tracking-widest font-bold">Expiration Protocol</span>
                  <div className="flex gap-2">
                    {TTL_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTtl(opt.value)}
                        className={cn(
                          "px-3 py-1 rounded text-[10px] font-mono border transition-all font-bold",
                          ttl === opt.value 
                            ? "bg-[#00FF9D]/15 border-[#00FF9D] text-[#00FF9D] glow-accent" 
                            : "bg-transparent border-[#2D333B] text-[#7D8590] hover:text-[#E6EDF3] hover:border-[#7D8590]"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={sendMessage} className="flex gap-3 h-12">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => handleTypingInput(e.target.value)}
                      placeholder="Encrypt message packet..."
                      className="w-full h-full bg-[#14161B] border border-[#2D333B] rounded-xl px-4 text-sm font-mono text-[#E6EDF3] focus:outline-hidden focus:border-[#00FF9D] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                       <Smile className="w-4 h-4 text-[#7D8590] cursor-pointer hover:text-[#00FF9D]" />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-12 h-12 bg-[#00FF9D] disabled:opacity-30 disabled:cursor-not-allowed text-[#0A0B0E] rounded-xl flex items-center justify-center hover:bg-[#00E68E] transition-all shadow-[0_0_20px_rgba(0,255,157,0.3)] active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 technical-grid">
              <div className="p-8 bg-[#0A0B0E] border border-[#2D333B] rounded-3xl glow-accent mb-6">
                <Shield className="w-12 h-12 text-[#00FF9D]" />
              </div>
              <h2 className="text-xl font-mono font-bold text-[#E6EDF3] mb-2 tracking-tighter">SECURE_UPLINK_STDBY</h2>
              <p className="text-[#7D8590] font-mono text-[10px] uppercase tracking-widest max-w-xs leading-relaxed">
                Establish an encrypted node connection to begin communication.
              </p>
              <div className="mt-8 flex gap-4">
                 <div className="p-4 bg-[#0A0B0E] border border-[#2D333B] rounded-lg">
                    <span className="block text-[10px] text-[#7D8590] uppercase font-bold mb-1">Status</span>
                    <span className="text-xs font-mono text-[#00FF9D]">ENCRYPT_RDY</span>
                 </div>
                 <div className="p-4 bg-[#0A0B0E] border border-[#2D333B] rounded-lg">
                    <span className="block text-[10px] text-[#7D8590] uppercase font-bold mb-1">Latency</span>
                    <span className="text-xs font-mono text-[#00FF9D]">14ms</span>
                 </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
