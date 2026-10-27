import { randomBytes, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { INPUT_REDUNDANCY, NAME_MAX_LENGTH, ROOM_CODE_LENGTH, TOTAL_PLAYERS } from '../../shared/constants';
import type { AckResult, Difficulty, InputPayload, JoinedPayload } from '../../shared/types';
import { DEFAULT_TIMINGS, Room, type Member, type RoomTimings } from './Room';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Ack<T extends object = object> = (res: AckResult<T>) => void;

function safeAck<T extends object>(ack: unknown): Ack<T> {
  return typeof ack === 'function' ? (ack as Ack<T>) : () => {};
}

export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX_LENGTH);
  return name.length > 0 ? name : null;
}

export interface GameServerOptions {
  transport: Server;
  roomCode?: string;
  timings?: Partial<RoomTimings>;
  staticDir?: string;
  corsOrigin?: string | string[];
}

export interface GameServer {

  io: Server;
  rooms: Map<string, Room>;
  close: () => Promise<void>;
}

export function createGameServer(opts: GameServerOptions): GameServer {
  const timings: RoomTimings = { ...DEFAULT_TIMINGS, ...opts.timings };
  const io = opts.transport;
  const rooms = new Map<string, Room>();

  function newCode(): string {
    if (opts.roomCode) {
      if (rooms.has(opts.roomCode)) throw new Error('이미 사용 중인 방 코드예요. 새 방을 만들어 주세요.');
      return opts.roomCode;
    }
    for (;;) {
      const bytes = randomBytes(ROOM_CODE_LENGTH);
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
      if (!rooms.has(code)) return code;
    }
  }

  function createRoom(): Room {
    const room = new Room(newCode(), io, timings, (r) => rooms.delete(r.code));
    rooms.set(room.code, room);
    return room;
  }

  function current(socket: Socket): { room: Room; member: Member } | null {
    const code = socket.data.roomCode as string | undefined;
    const id = socket.data.playerId as string | undefined;
    if (!code || !id) return null;
    const room = rooms.get(code);
    const member = room?.members.get(id);
    if (!room || !member || member.socketId !== socket.id) return null;
    return { room, member };
  }

  function leaveCurrent(socket: Socket): void {
    const cur = current(socket);
    if (cur) cur.room.leave(cur.member.id);
  }

  function joinAsNew(socket: Socket, room: Room, name: string): JoinedPayload {
    const member: Member = {
      id: `p-${randomUUID().slice(0, 8)}`,
      name,
      sessionId: randomUUID(),
      socketId: null,
      connected: true,
      graceTimer: null,
    };
    room.addMember(member);
    room.attach(member, socket);
    room.broadcastLobby();
    return { code: room.code, playerId: member.id, sessionId: member.sessionId, lobby: room.lobbyState() };
  }

  io.on('connection', (socket) => {
    socket.on('time:sync', (_clientTime: unknown, ack: unknown) => {
      safeAck<{ serverTime: number }>(ack)({ ok: true, serverTime: Date.now() });
    });

    socket.on('room:create', (payload: { name?: unknown } | undefined, ackRaw: unknown) => {
      const ack = safeAck<JoinedPayload>(ackRaw);
      const name = sanitizeName(payload?.name);
      if (!name) return ack({ ok: false, error: '닉네임을 입력해 주세요.' });
      leaveCurrent(socket);
      const room = createRoom();
      ack({ ok: true, ...joinAsNew(socket, room, name) });
    });

    socket.on('room:join', (payload: { name?: unknown; code?: unknown } | undefined, ackRaw: unknown) => {
      const ack = safeAck<JoinedPayload>(ackRaw);
      const name = sanitizeName(payload?.name);
      if (!name) return ack({ ok: false, error: '닉네임을 입력해 주세요.' });
      const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
      const room = rooms.get(code);
      if (!room) return ack({ ok: false, error: '방을 찾을 수 없어요. 코드를 확인해 주세요.' });
      if (room.status === 'in-game') return ack({ ok: false, error: '게임이 진행 중인 방이에요. 끝난 뒤 참가해 주세요.' });
      if (room.humanCount() >= TOTAL_PLAYERS) return ack({ ok: false, error: '방이 가득 찼어요.' });
      leaveCurrent(socket);
      ack({ ok: true, ...joinAsNew(socket, room, name) });
    });

    socket.on('room:rejoin', (payload: { code?: unknown; sessionId?: unknown } | undefined, ackRaw: unknown) => {
      const ack = safeAck<JoinedPayload>(ackRaw);
      const code = typeof payload?.code === 'string' ? payload.code.toUpperCase() : '';
      const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : '';
      const room = rooms.get(code);
      const member = room && [...room.members.values()].find((m) => m.sessionId === sessionId);
      if (!room || !member) return ack({ ok: false, error: '이전 방 정보가 만료되었어요.' });
      room.attach(member, socket);
      room.broadcastLobby();
      ack({ ok: true, code: room.code, playerId: member.id, sessionId: member.sessionId, lobby: room.lobbyState() });
      room.sendSnapshotTo(socket);
    });

    socket.on('room:leave', (_p: unknown, ackRaw: unknown) => {
      leaveCurrent(socket);
      safeAck(ackRaw)({ ok: true });
    });

    socket.on('room:difficulty', (payload: { difficulty?: Difficulty } | undefined, ackRaw: unknown) => {
      const ack = safeAck(ackRaw);
      const cur = current(socket);
      if (!cur) return ack({ ok: false, error: '방에 참가하지 않았어요.' });
      ack(cur.room.setDifficulty(cur.member.id, payload?.difficulty as Difficulty));
    });

    socket.on('game:start', (_p: unknown, ackRaw: unknown) => {
      const ack = safeAck(ackRaw);
      const cur = current(socket);
      if (!cur) return ack({ ok: false, error: '방에 참가하지 않았어요.' });
      ack(cur.room.start(cur.member.id));
    });

    socket.on('input', (payload: InputPayload | undefined) => {
      const cur = current(socket);
      if (!cur || !cur.room.game || !payload || typeof payload !== 'object') return;
      const prev = Array.isArray(payload.prev) ? payload.prev.slice(-INPUT_REDUNDANCY) : [];
      cur.room.game.queueInputs(cur.member.id, [
        ...prev.map((s) => ({ seq: Number(s?.seq), dx: Number(s?.dx), dy: Number(s?.dy), sprint: s?.sprint === true })),
        { seq: Number(payload.seq), dx: Number(payload.dx), dy: Number(payload.dy), sprint: payload.sprint === true },
      ]);
    });

    // 잡기(E): E 직전까지 보낸 이동 입력이 서버에 반영된 위치로 한 번만 판정 (보통 다음 틱, 최대 수십 ms)
    socket.on('action:catch', (payload: unknown, ackRaw: unknown) => {
      const ack = safeAck<{ mouseId: string }>(ackRaw);
      const cur = current(socket);
      if (!cur || !cur.room.game) return ack({ ok: false, error: '게임 중이 아니에요.' });
      const afterSeq = Number((payload as { afterSeq?: unknown } | undefined)?.afterSeq);
      cur.room.game.requestCatch(cur.member.id, afterSeq, Date.now(), ack);
    });

    /** 게임 액션 공통 처리: 방·게임 확인 후 서버 시각으로 판정 */
    const onGameAction = <T extends object>(
      event: string,
      run: (game: NonNullable<Room['game']>, playerId: string, now: number, payload: unknown) => AckResult<T>,
    ) => {
      socket.on(event, (payload: unknown, ackRaw: unknown) => {
        const ack = safeAck<T>(ackRaw);
        const cur = current(socket);
        if (!cur || !cur.room.game) return ack({ ok: false, error: '게임 중이 아니에요.' });
        ack(run(cur.room.game, cur.member.id, Date.now(), payload));
      });
    };

    onGameAction('action:holeEnter', (g, id, now) => g.tryEnterHole(id, now));
    onGameAction('action:holeExit', (g, id, now) => g.tryExitHole(id, now));
    onGameAction('action:holeRps', (g, id, now) => g.tryChallengeHole(id, now));
    onGameAction('action:howl', (g, id, now) => g.tryHowl(id, now));
    onGameAction('action:disguise', (g, id, now) => g.tryDisguise(id, now));
    onGameAction('action:dash', (g, id, now) => g.tryDash(id, now));
    onGameAction('action:selectItem', (g, id, now, p) => g.selectItem(id, (p as { item?: unknown } | undefined)?.item, now));
    onGameAction('action:useItem', (g, id, now) => g.useItem(id, now));
    onGameAction('action:spray', (g, id, now) => g.trySpray(id, now));
    onGameAction('action:rps', (g, id, now, p) => g.tryRpsChoice(id, (p as { choice?: unknown } | undefined)?.choice, now));

    socket.on('disconnect', () => {
      const cur = current(socket);
      if (cur) cur.room.handleDisconnect(cur.member);
    });
  });

  return {
    io,
    rooms,
    close: () =>
      new Promise<void>((resolve) => {
        for (const r of rooms.values()) r.dispose();
        rooms.clear();
        io.close(() => resolve());
      }),
  };
}
