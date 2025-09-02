"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocket = setSocket;
exports.emitToStream = emitToStream;
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
//# sourceMappingURL=socket.js.map