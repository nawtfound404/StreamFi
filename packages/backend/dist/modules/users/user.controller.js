"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const getSettings = (_req, res) => res.status(200).json({ displayName: 'AliceStreamer', payoutEmail: 'alice-payout@example.com', about: 'Pro gamer' });
exports.getSettings = getSettings;
const updateSettings = (_req, res) => res.status(200).json({ ok: true });
exports.updateSettings = updateSettings;
//# sourceMappingURL=user.controller.js.map