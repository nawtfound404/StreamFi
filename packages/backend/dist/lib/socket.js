"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocket = setSocket;
exports.emitToStream = emitToStream;
exports.getRoomSize = getRoomSize;
exports.emitToStreamRooms = emitToStreamRooms;
let _io = null;
function setSocket(io) {
    _io = io;
}
function emitToStream(streamId, event, payload) {
    try {
        if (_io)
            _io.to(streamId).emit(event, payload);
    }
    catch {
        // noop
    }
}
/** Return the number of sockets currently in the given room (0 if none). */
function getRoomSize(room) {
    try {
        const size = _io?.sockets?.adapter?.rooms?.get(room)?.size;
        return typeof size === 'number' ? size : 0;
    }
    catch {
        return 0;
    }
}
/** Emit to both the stream's id and key rooms if provided. */
function emitToStreamRooms(params, event, payload) {
    const { id, key } = params;
    try {
        if (!_io)
            return;
        if (id)
            _io.to(id).emit(event, payload);
        if (key && key !== id)
            _io.to(key).emit(event, payload);
    }
    catch {
        // noop
    }
}
//# sourceMappingURL=socket.js.map