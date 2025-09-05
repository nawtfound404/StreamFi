import type { Server } from 'socket.io';

let _io: Server | null = null;

export function setSocket(io: Server) {
  _io = io;
}

export function emitToStream(streamId: string, event: string, payload: any) {
  try {
    if (_io) _io.to(streamId).emit(event, payload);
  } catch {
    // noop
  }
}

/** Return the number of sockets currently in the given room (0 if none). */
export function getRoomSize(room: string): number {
  try {
    const size = _io?.sockets?.adapter?.rooms?.get(room)?.size;
    return typeof size === 'number' ? size : 0;
  } catch {
    return 0;
  }
}

/** Emit to both the stream's id and key rooms if provided. */
export function emitToStreamRooms(params: { id?: string; key?: string }, event: string, payload: any) {
  const { id, key } = params;
  try {
    if (!_io) return;
    if (id) _io.to(id).emit(event, payload);
    if (key && key !== id) _io.to(key).emit(event, payload);
  } catch {
    // noop
  }
}
