/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, User as UserIcon, Sword, Trophy, X, Hash, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { User, Game } from '../types';

interface GamesProps {
  currentUser: User;
  socket: any;
}

export default function Games({ currentUser, socket }: GamesProps) {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Game[]>([]);
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  
  useEffect(() => {
    if (!socket) return;

    socket.on('game:invite', (game: Game) => {
      setPendingInvitations(prev => [...prev, game]);
    });

    socket.on('game:start', (game: Game) => {
      setActiveGame(game);
      setBoard(Array(9).fill(null));
      setPendingInvitations([]);
    });

    socket.on('game:move', (data: any) => {
      setBoard(data.state.board);
      if (activeGame) {
         setActiveGame({ ...activeGame, turn: data.turn });
      }
    });

    return () => {
      socket.off('game:invite');
      socket.off('game:start');
      socket.off('game:move');
    };
  }, [socket, activeGame]);

  const acceptInvite = (gameId: string) => {
    socket.emit('game:accept', gameId);
  };

  const makeMove = (index: number) => {
    if (!activeGame || board[index] || activeGame.turn !== currentUser.id) return;

    const newBoard = [...board];
    const playerSymbol = activeGame.player1Id === currentUser.id ? 'X' : 'O';
    newBoard[index] = playerSymbol;

    const nextTurn = activeGame.player1Id === currentUser.id ? activeGame.player2Id : activeGame.player1Id;
    
    setBoard(newBoard);
    socket.emit('game:move', {
      gameId: activeGame.id,
      state: { board: newBoard },
      turn: nextTurn
    });
  };

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = checkWinner(board);
  const isDraw = !winner && board.every(s => s !== null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center technical-grid p-6 bg-[#050505]">
      <AnimatePresence mode="wait">
        {!activeGame ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl bg-[#14161B] border border-[#2D333B] rounded-2xl p-8 glow-accent"
          >
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-[#2D333B]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#00FF9D]/10 rounded-xl border border-[#00FF9D]/30">
                  <Gamepad2 className="w-8 h-8 text-[#00FF9D]" />
                </div>
                <div>
                  <h2 className="text-xl font-mono font-bold text-[#E6EDF3] tracking-tighter">TACTICAL_HUB</h2>
                  <p className="text-[#7D8590] font-mono text-[10px] uppercase tracking-widest font-bold">Multi-Node Engagement Protocol</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-[10px] font-mono text-[#7D8590] uppercase tracking-[0.3em] font-bold">Active Modules</h3>
                {[
                  { id: 'tictactoe', name: 'GRID_LOCK', players: '1v1', desc: 'Secure logical sectors before the opponent.' },
                  { id: 'chess', name: 'GRANDMASTER', players: '1v1', desc: 'Recursive strategy simulation.' },
                  { id: 'ludo', name: 'PACKET_RACE', players: '2-4', desc: 'Route nodes from start to home terminal.' },
                ].map(game => (
                  <div key={game.id} className="p-5 bg-[#0A0B0E] border border-[#2D333B] rounded-xl hover:border-[#00FF9D]/40 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                       <span className="font-mono text-[#00FF9D] font-bold text-sm tracking-tight">{game.name}</span>
                       <span className="text-[9px] font-mono bg-[#14161B] text-[#7D8590] px-2 py-0.5 rounded border border-[#2D333B] font-bold">{game.players}</span>
                    </div>
                    <p className="text-[10px] font-mono text-[#7D8590] mb-5 leading-relaxed">{game.desc}</p>
                    <button className="w-full py-2.5 bg-[#00FF9D]/10 hover:bg-[#00FF9D] text-[#00FF9D] hover:text-[#0A0B0E] border border-[#00FF9D]/30 rounded-lg text-[10px] font-mono font-bold transition-all uppercase tracking-widest">
                      Initialize Link
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-mono text-[#7D8590] uppercase tracking-[0.3em] font-bold">Inbound Signals</h3>
                {pendingInvitations.length > 0 ? (
                  pendingInvitations.map(invite => (
                    <div key={invite.id} className="p-5 bg-[#00FF9D]/5 border border-[#00FF9D]/20 rounded-xl">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-lg bg-[#00FF9D]/10 border border-[#00FF9D]/20 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-[#00FF9D]" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#E6EDF3] uppercase tracking-tight">{invite.player1Id}</div>
                          <div className="text-[9px] font-mono text-[#00FF9D] uppercase font-bold tracking-widest mt-1">UPLINK_REQ: {invite.type.toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => acceptInvite(invite.id)}
                          className="flex-1 py-3 bg-[#00FF9D] text-[#0A0B0E] rounded-lg text-[10px] font-mono font-bold hover:bg-[#00E68E] transition-all tracking-widest"
                        >
                          CONNECT
                        </button>
                        <button className="flex-1 py-3 bg-[#0A0B0E] border border-[#2D333B] text-[#7D8590] rounded-lg text-[10px] font-mono font-bold hover:text-[#E6EDF3] hover:border-[#7D8590] transition-all tracking-widest">
                          DROP
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center border border-dashed border-[#2D333B] rounded-xl text-center px-6">
                    <Sword className="w-8 h-8 text-[#2D333B] mb-4" />
                    <span className="text-[10px] font-mono text-[#2D333B] uppercase tracking-[0.4em] font-bold">No Active Signals Detected</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="mb-12 flex items-center justify-center gap-12 md:gap-24 w-full">
              <div className={cn(
                "flex flex-col items-center gap-4 p-6 rounded-2xl transition-all border relative min-w-[140px]",
                activeGame.turn === activeGame.player1Id 
                  ? "bg-[#00FF9D]/10 border-[#00FF9D]/40 glow-accent scale-105" 
                  : "bg-[#0A0B0E] border-[#2D333B] opacity-50"
              )}>
                {activeGame.turn === activeGame.player1Id && (
                  <motion.div 
                    layoutId="turnIndicator"
                    className="absolute -top-3 px-3 py-1 bg-[#00FF9D] text-[#0A0B0E] text-[9px] font-mono font-bold rounded-full shadow-[0_0_10px_#00FF9D]"
                  >
                    DEPLOYING...
                  </motion.div>
                )}
                <div className="w-20 h-20 rounded-2xl bg-[#050505] flex items-center justify-center border border-[#2D333B] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,157,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                   <span className="font-mono text-[#00FF9D] font-bold text-4xl drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]">X</span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-mono text-[#E6EDF3] font-bold uppercase tracking-widest block mb-1">{activeGame.player1Id.split('-')[0]}</span>
                  <span className="text-[9px] font-mono text-[#7D8590] uppercase font-bold tracking-tighter">NODE_MASTER</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                 <div className="relative group">
                   <div className="absolute -inset-4 bg-[#00FF9D]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="text-4xl font-mono font-black text-[#E6EDF3] tracking-tighter italic opacity-10 select-none">VS</div>
                 </div>
                 {(winner || isDraw) && (
                   <motion.div 
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={cn(
                      "mt-8 py-3 px-8 rounded-xl text-[12px] font-mono font-bold uppercase tracking-widest shadow-2xl border flex items-center gap-3",
                      winner ? "bg-[#00FF9D] text-[#0A0B0E] border-[#00FF9D] glow-accent" : "bg-[#14161B] text-[#7D8590] border-[#2D333B]"
                    )}
                   >
                     <Trophy className={cn("w-4 h-4", winner ? "text-[#0A0B0E]" : "text-[#7D8590]")} />
                     {winner ? `SIGNAL_DOMINANCE: ${winner}` : 'PARITY_REACHED'}
                   </motion.div>
                 )}
              </div>

              <div className={cn(
                "flex flex-col items-center gap-4 p-6 rounded-2xl transition-all border relative min-w-[140px]",
                activeGame.turn === activeGame.player2Id 
                  ? "bg-[#00FF9D]/10 border-[#00FF9D]/40 glow-accent scale-105" 
                  : "bg-[#0A0B0E] border-[#2D333B] opacity-50"
              )}>
                {activeGame.turn === activeGame.player2Id && (
                  <motion.div 
                    layoutId="turnIndicator"
                    className="absolute -top-3 px-3 py-1 bg-[#00FF9D] text-[#0A0B0E] text-[9px] font-mono font-bold rounded-full shadow-[0_0_10px_#00FF9D]"
                  >
                    DEPLOYING...
                  </motion.div>
                )}
                <div className="w-20 h-20 rounded-2xl bg-[#050505] flex items-center justify-center border border-[#2D333B] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,157,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                   <span className="font-mono text-[#00FF9D] font-bold text-4xl drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]">O</span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-mono text-[#E6EDF3] font-bold uppercase tracking-widest block mb-1">{activeGame.player2Id.split('-')[0]}</span>
                  <span className="text-[9px] font-mono text-[#7D8590] uppercase font-bold tracking-tighter">NODE_GUEST</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 p-8 bg-[#0A0B0E] rounded-[2rem] border border-[#2D333B] shadow-2xl relative overflow-hidden">
              {/* Background HUD elements */}
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                 <Terminal className="w-32 h-32 text-[#00FF9D]" />
              </div>
              
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => makeMove(i)}
                  disabled={!!cell || !!winner || activeGame.turn !== currentUser.id}
                  className={cn(
                    "w-24 h-24 md:w-32 md:h-32 bg-[#14161B] border border-[#2D333B] rounded-3xl flex items-center justify-center transition-all relative group overflow-hidden shadow-lg",
                    !cell && !winner && activeGame.turn === currentUser.id && "hover:border-[#00FF9D]/50 hover:bg-[#00FF9D]/5 cursor-crosshair hover:shadow-[0_0_20px_rgba(0,255,157,0.1)]",
                    cell && "shadow-[inset_0_0_30px_rgba(0,255,157,0.1)] border-[#00FF9D]/30"
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {cell && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className={cn(
                          "text-5xl font-mono font-black select-none",
                          cell === 'X' ? "text-[#00FF9D] drop-shadow-[0_0_8px_#00FF9D]" : "text-[#E6EDF3] border-b-4 border-[#00FF9D]/20 pb-1"
                        )}
                      >
                        {cell}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {!cell && !winner && activeGame.turn === currentUser.id && (
                     <div className="absolute inset-0 bg-[#00FF9D]/0 group-hover:bg-[#00FF9D]/5 transition-colors border-2 border-transparent group-hover:border-[#00FF9D]/10" />
                  )}

                  {/* Cell metadata */}
                  <span className="absolute top-2 left-2 text-[8px] font-mono text-[#2D333B] font-bold">SEC_{i}</span>
                </button>
              ))}
            </div>

            <div className="mt-16 flex gap-6">
              <button 
                onClick={() => { setActiveGame(null); }}
                className="py-3 px-10 bg-[#0A0B0E] border border-[#2D333B] text-[#7D8590] hover:text-[#E6EDF3] hover:border-[#7D8590] rounded-xl text-[11px] font-mono font-bold transition-all uppercase tracking-[0.3em]"
              >
                Terminate Session
              </button>
              {winner || isDraw ? (
                <button 
                  onClick={() => { setBoard(Array(9).fill(null)); }}
                  className="py-3 px-10 bg-[#00FF9D] text-[#0A0B0E] rounded-xl text-[11px] font-mono font-bold transition-all uppercase tracking-[0.3em] shadow-[0_0_15px_rgba(0,255,157,0.3)] hover:bg-[#00E68E]"
                >
                  New Instance
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
