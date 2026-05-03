/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  avatar: string;
  publicKey?: string;
  status?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string; // Encrypted
  iv: string;
  type: 'text' | 'file';
  createdAt: string;
  expiresAt?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  fromUserId?: string;
  type: 'message' | 'invite' | 'security' | 'request';
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface GameState {
  board: (string | null)[];
  status: 'playing' | 'draw' | 'winner';
  winner?: string | null;
}

export interface Game {
  id: string;
  type: 'tictactoe' | 'chess';
  player1Id: string;
  player2Id: string;
  state: any;
  turn: string;
  status: 'pending' | 'active' | 'finished';
}
