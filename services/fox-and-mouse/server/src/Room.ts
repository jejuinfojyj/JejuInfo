import type { Server, Socket } from 'socket.io';
import {
  LOBBY_DISCONNECT_GRACE_MS,
  RECONNECT_GRACE_MS,
  TICK_MS,
  TOTAL_PLAYERS,
} from '../../shared/constants';
import type { AckResult, Difficulty, LobbyState, RoomStatus } from '../../shared/types';
import { Game } from './game/Game';

export interface Member {
  id: string;
  name: string;
  sessionId: string;
  socketId: string | null;
  connected: boolean;
  graceTimer: NodeJS.Timeout | null;
}

export interface RoomTimings {
  reconnectGraceMs: number;
  lobbyGraceMs: number;
  tickMs: number;
  now: () => number;
}

export const DEFAULT_TIMINGS: RoomTimings = {
  reconnectGraceMs: RECONNECT_GRACE_MS,
  lobbyGraceMs: LOBBY_DISCONNECT_GRACE_MS,
  tickMs: TICK_MS,
  now: () => Date.now(),
};

/** 방 하나의 로비·게임 상태. 방마다 독립된 Game 인스턴스와 틱 루프를 가진다. */
export class Room {
  hostId = '';
  difficulty: Difficulty = 'normal';
  status: RoomStatus = 'lobby';
  readonly members = new Map<string, Member>();
  game: Game | null = null;
  private loop: NodeJS.Timeout | null = null;
  /** 다음 게임 틱을 실행할 서버 시각 */
  private nextTickAt = 0;
  /** 마지막으로 실행한 틱의 시각 (스냅샷의 serverTime = 위치가 계산된 시각) */
  private stateTime = 0;

  constructor(
    readonly code: string,
    private readonly io: Server,
    private readonly timings: RoomTimings,
    private readonly onEmpty: (room: Room) => void,
  ) {}

  get channel(): string {
    return `room:${this.code}`;
  }

  humanCount(): number {
    return this.members.size;
  }

  lobbyState(): LobbyState {
    const members = [...this.members.values()].map((m) => ({
      id: m.id,
      name: m.name,
      connected: m.connected,
      isHost: m.id === this.hostId,
    }));
    return {
      code: this.code,
      hostId: this.hostId,
      difficulty: this.difficulty,
      status: this.status,
      members,
      humanCount: members.length,
      botCount: Math.max(0, TOTAL_PLAYERS - members.length),
    };
  }

  broadcastLobby(): void {
    this.io.to(this.channel).emit('room:state', this.lobbyState());
  }

  addMember(member: Member): void {
    this.members.set(member.id, member);
    if (!this.hostId) this.hostId = member.id;
  }

  attach(member: Member, socket: Socket): void {
    if (member.graceTimer) {
      clearTimeout(member.graceTimer);
      member.graceTimer = null;
    }
    if (member.socketId && member.socketId !== socket.id) {
      const old = this.io.sockets.sockets.get(member.socketId);
      if (old) {
        old.data.playerId = undefined;
        old.data.roomCode = undefined;
        old.leave(this.channel);
        old.emit('room:kicked', { reason: '다른 창에서 같은 플레이어로 접속했어요.' });
      }
    }
    member.socketId = socket.id;
    member.connected = true;
    socket.data.playerId = member.id;
    socket.data.roomCode = this.code;
    socket.join(this.channel);
    if (this.game && !this.game.isEnded()) this.game.reclaim(member.id, this.timings.now());
    this.ensureHost();
  }

  handleDisconnect(member: Member): void {
    member.connected = false;
    member.socketId = null;
    const now = this.timings.now();
    const inGame = this.game && !this.game.isEnded() && this.status === 'in-game';
    if (inGame) {
      this.game!.markDisconnected(member.id, now);
      member.graceTimer = setTimeout(() => {
        member.graceTimer = null;
        if (member.connected) return;
        if (this.game && !this.game.isEnded()) this.game.convertToBot(member.id, this.timings.now());
        else this.removeMember(member.id);
      }, this.timings.reconnectGraceMs);
    } else {
      member.graceTimer = setTimeout(() => {
        member.graceTimer = null;
        if (!member.connected) this.removeMember(member.id);
      }, this.timings.lobbyGraceMs);
    }
    this.ensureHost();
    this.broadcastLobby();
  }

  leave(memberId: string): void {
    const m = this.members.get(memberId);
    if (!m) return;
    if (m.socketId) {
      const s = this.io.sockets.sockets.get(m.socketId);
      if (s) {
        s.leave(this.channel);
        s.data.playerId = undefined;
        s.data.roomCode = undefined;
      }
    }
    if (this.game && !this.game.isEnded()) {
      // 게임 중에 나가면 즉시 AI가 이어받는다
      this.game.markDisconnected(memberId, this.timings.now());
      this.game.convertToBot(memberId, this.timings.now());
    }
    this.removeMember(memberId);
  }

  private removeMember(id: string): void {
    const m = this.members.get(id);
    if (!m) return;
    if (m.graceTimer) clearTimeout(m.graceTimer);
    this.members.delete(id);
    if (this.members.size === 0) {
      this.dispose();
      this.onEmpty(this);
      return;
    }
    this.ensureHost();
    this.broadcastLobby();
  }

  private ensureHost(): void {
    const host = this.members.get(this.hostId);
    if (host && host.connected) return;
    const next = [...this.members.values()].find((m) => m.connected);
    if (next) this.hostId = next.id;
    else if (!host && this.members.size > 0) this.hostId = [...this.members.keys()][0];
  }

  setDifficulty(requesterId: string, difficulty: Difficulty): AckResult {
    if (requesterId !== this.hostId) return { ok: false, error: '방장만 난이도를 바꿀 수 있어요.' };
    if (this.status === 'in-game') return { ok: false, error: '게임 중에는 바꿀 수 없어요.' };
    if (!['easy', 'normal', 'hard'].includes(difficulty)) return { ok: false, error: '잘못된 난이도예요.' };
    this.difficulty = difficulty;
    this.broadcastLobby();
    return { ok: true };
  }

  start(requesterId: string): AckResult {
    if (requesterId !== this.hostId) return { ok: false, error: '방장만 게임을 시작할 수 있어요.' };
    if (this.status === 'in-game') return { ok: false, error: '이미 게임이 진행 중이에요.' };
    const humans = [...this.members.values()].filter((m) => m.connected);
    if (humans.length < 1) return { ok: false, error: '실제 플레이어가 1명 이상 필요해요.' };

    // 접속이 끊긴 채 남아 있던 멤버는 새 게임에서 제외
    for (const m of [...this.members.values()]) if (!m.connected) this.removeMember(m.id);

    const now = this.timings.now();
    this.game = new Game({
      humans: humans.map((m) => ({ id: m.id, name: m.name })),
      difficulty: this.difficulty,
      now,
    });
    this.status = 'in-game';
    this.stateTime = now;
    this.nextTickAt = now + this.timings.tickMs;
    this.broadcastLobby();
    this.broadcastSnapshot();
    this.stopLoop();
    // OS 타이머는 setInterval(50) 이 실제로는 60ms 넘게 걸리기도 한다(Windows 는 약 15.6ms 단위).
    // 짧은 주기로 깨어나 실제 경과 시간만큼 고정 틱을 실행해 항상 초당 TICK_RATE 번을 지킨다.
    this.loop = setInterval(() => this.step(), Math.max(4, Math.floor(this.timings.tickMs / 5)));
    return { ok: true };
  }

  private step(): void {
    const game = this.game;
    if (!game) return this.stopLoop();
    const tickMs = this.timings.tickMs;
    const now = this.timings.now();
    if (now < this.nextTickAt) return;
    let ran = 0;
    while (now >= this.nextTickAt && ran < 4 && !game.isEnded()) {
      game.tick(this.nextTickAt);
      this.stateTime = this.nextTickAt;
      this.nextTickAt += tickMs;
      ran++;
    }
    // 서버가 오래 멈췄다면(디버거 등) 밀린 틱을 한꺼번에 몰아서 실행하지 않는다
    if (this.nextTickAt <= now) this.nextTickAt = now + tickMs;
    this.broadcastSnapshot();
    if (game.isEnded()) {
      this.stopLoop();
      this.status = 'ended';
      for (const m of [...this.members.values()]) {
        if (!m.connected && !m.graceTimer) this.removeMember(m.id);
        else if (!m.connected && m.graceTimer) {
          clearTimeout(m.graceTimer);
          m.graceTimer = setTimeout(() => {
            if (!m.connected) this.removeMember(m.id);
          }, this.timings.lobbyGraceMs);
        }
      }
      if (this.members.size > 0) this.broadcastLobby();
    }
  }

  /** 역할별로 다른 스냅샷을 보낸다 (여우에게는 덫 위치를 보내지 않는다) */
  broadcastSnapshot(): void {
    const game = this.game;
    if (!game) return;
    const now = this.stateTime;
    const events = game.drainEvents();
    const byRole = game.snapshotsByRole(now, events);
    for (const m of this.members.values()) {
      if (!m.socketId) continue;
      const role = game.players.get(m.id)?.role ?? 'mouse';
      this.io.to(m.socketId).emit('game:snapshot', byRole[role]);
    }
  }

  sendSnapshotTo(socket: Socket): void {
    const game = this.game;
    if (!game) return;
    const role = game.players.get(socket.data.playerId as string)?.role ?? 'mouse';
    socket.emit('game:snapshot', game.snapshot(this.stateTime, [], role));
  }

  private stopLoop(): void {
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
  }

  dispose(): void {
    this.stopLoop();
    for (const m of this.members.values()) if (m.graceTimer) clearTimeout(m.graceTimer);
  }
}
