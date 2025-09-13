"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReady = exports.markReady = void 0;
let ready = false;
const markReady = () => { ready = true; };
exports.markReady = markReady;
const isReady = () => ready;
exports.isReady = isReady;
//# sourceMappingURL=state.js.map