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
