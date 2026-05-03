import React from 'react';
import { Settings as SettingsIcon, User as UserIcon, ShieldCheck, Terminal, Disc } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface SettingsProps {
  user: User;
}

export default function Settings({ user }: SettingsProps) {
  return (
    <div className="flex-1 p-8 technical-grid bg-[#0A0B0E] overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#2D333B]">
          <div className="p-3 bg-[#00FF9D]/10 rounded-xl border border-[#00FF9D]/30">
            <SettingsIcon className="w-8 h-8 text-[#00FF9D]" />
          </div>
          <div>
            <h2 className="text-xl font-mono font-bold text-[#E6EDF3] tracking-tighter uppercase">Identity Configuration</h2>
            <p className="text-[#7D8590] font-mono text-[10px] uppercase tracking-widest font-bold">Node Management & Security</p>
          </div>
        </div>

        <div className="bg-[#14161B] border border-[#2D333B] rounded-2xl p-8 glow-accent">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-24 h-24 rounded-2xl bg-[#0A0B0E] border border-[#2D333B] flex items-center justify-center relative overflow-hidden group">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-[#00FF9D]" />
              )}
              <div className="absolute inset-0 bg-[#00FF9D]/0 group-hover:bg-[#00FF9D]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                <span className="text-[10px] font-mono text-[#00FF9D] font-bold">EDIT</span>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-mono font-bold text-[#E6EDF3] tracking-tight">{user.username}</h3>
              <p className="text-[#7D8590] font-mono text-xs uppercase mb-3 flex items-center gap-2">
                <Terminal className="w-3 h-3 text-[#00FF9D]" />
                ID: {user.id}
              </p>
              <div className="flex items-center gap-2">
                 <span className="px-2 py-0.5 bg-[#00FF9D]/10 border border-[#00FF9D]/30 rounded text-[9px] font-mono text-[#00FF9D] font-bold uppercase tracking-widest">Master Node</span>
                 <span className="px-2 py-0.5 bg-[#14161B] border border-[#2D333B] rounded text-[9px] font-mono text-[#7D8590] font-bold uppercase tracking-widest">v2.4.0-SEC</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-[#0A0B0E] border border-[#2D333B] rounded-xl group hover:border-[#00FF9D]/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-[#00FF9D]" />
                   <span className="text-xs font-mono font-bold text-[#E6EDF3] uppercase tracking-tight">ENCRYPTION_PROTOCOL</span>
                </div>
                <span className="text-[10px] font-mono text-[#00FF9D] font-bold">ACTIVE</span>
              </div>
              <p className="text-[10px] font-mono text-[#7D8590]">End-to-end RSA-OAEP / AES-256-GCM verification active. All transmission logs are decentralized.</p>
            </div>

            <div className="p-5 bg-[#0A0B0E] border border-[#2D333B] rounded-xl">
              <h4 className="text-[10px] font-mono font-bold text-[#7D8590] uppercase tracking-widest mb-4">Node Preferences</h4>
              <div className="space-y-3">
                {[
                  { label: 'AUTO_START_SECURE_LINK', val: true },
                  { label: 'VANISH_READ_PACKETS', val: false },
                  { label: 'DARK_MODE_FORCED', val: true },
                ].map(pref => (
                  <div key={pref.label} className="flex items-center justify-between py-2 border-b border-[#2D333B]/50 last:border-0">
                    <span className="text-[11px] font-mono text-[#7D8590] font-bold uppercase tracking-tighter">{pref.label}</span>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-all",
                      pref.val ? "bg-[#00FF9D]/20 border border-[#00FF9D]/40" : "bg-[#14161B] border border-[#2D333B]"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full absolute top-1/2 -translate-y-1/2 transition-all",
                        pref.val ? "right-1 bg-[#00FF9D] glow-accent" : "left-1 bg-[#2D333B]"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <h4 className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest mb-3">Critical Actions</h4>
          <p className="text-[10px] font-mono text-red-400/60 mb-5 uppercase tracking-tighter">Permanently revoke target identity and purge all encrypted transmission data from the node network.</p>
          <button className="px-6 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red-500 hover:text-white rounded-lg text-[10px] font-mono font-bold transition-all uppercase tracking-widest">
            Purge Identity
          </button>
        </div>
      </div>
    </div>
  );
}
