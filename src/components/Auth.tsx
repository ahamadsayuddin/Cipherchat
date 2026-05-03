/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Shield, Terminal, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateKeyPair } from '../lib/crypto';

interface AuthProps {
  onAuth: (token: string, user: any, privateKey: CryptoKey) => void;
}

export default function Auth({ onAuth }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [id, setId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body: any = { id, password };
      
      let clientPrivateKey: CryptoKey | undefined;

      if (!isLogin) {
        body.username = username;
        const keyPair = await generateKeyPair();
        body.publicKey = keyPair.publicKey;
        clientPrivateKey = keyPair.privateKey;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_id', data.user.id);
      
      onAuth(data.token, data.user, clientPrivateKey!); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0B0E] technical-grid px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#14161B] border border-[#2D333B] rounded-2xl p-8 glow-accent"
      >
        <div className="flex justify-center mb-8">
          <div className="p-3 bg-[#00FF9D]/10 rounded-xl border border-[#00FF9D]/30">
            <Shield className="w-10 h-10 text-[#00FF9D]" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono font-bold text-[#E6EDF3] tracking-tighter">
            CIPHER_COMM_SYSTEM
          </h1>
          <p className="text-[#7D8590] font-mono text-xs uppercase mt-2 tracking-[0.2em] font-bold">
            Secure Encryption Protocols
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7D8590] mb-2 px-1 font-bold">Identity ID</label>
            <div className="relative">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF9D]" />
              <input 
                type="text" 
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="UNIQUE_USER_ID"
                className="w-full bg-[#0A0B0E] border border-[#2D333B] rounded-lg py-3 pl-10 pr-4 text-[#E6EDF3] font-mono text-sm focus:outline-hidden focus:border-[#00FF9D] transition-colors"
                required
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-[10px] font-mono uppercase text-[#7D8590] mb-2 px-1 font-bold">Display Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF9D]" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="USERNAME"
                    className="w-full bg-[#0A0B0E] border border-[#2D333B] rounded-lg py-3 pl-10 pr-4 text-[#E6EDF3] font-mono text-sm focus:outline-hidden focus:border-[#00FF9D] transition-colors"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7D8590] mb-2 px-1 font-bold">Secure Passkey</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF9D]" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0B0E] border border-[#2D333B] rounded-lg py-3 pl-10 pr-4 text-[#E6EDF3] font-mono text-sm focus:outline-hidden focus:border-[#00FF9D] transition-colors"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#00FF9D] hover:bg-[#00E68E] text-[#0A0B0E] py-3 rounded-lg font-mono font-bold text-sm tracking-wide transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'INITIATE_LOGIN' : 'REGISTER_IDENTITY')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#7D8590] hover:text-[#00FF9D] font-mono text-[10px] transition-colors flex items-center justify-center gap-2 mx-auto font-bold uppercase tracking-wider"
          >
            {isLogin ? (
              <>
                <UserPlus className="w-3 h-3" />
                CREATE_NEW_IDENTITY
              </>
            ) : (
              <>
                <LogIn className="w-3 h-3" />
                RETURN_TO_LOGIN
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
