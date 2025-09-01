"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.getNotifications = void 0;
const getNotifications = (_req, res) => res.status(200).json({ items: [] });
exports.getNotifications = getNotifications;
const markRead = (_req, res) => res.status(200).json({ ok: true });
exports.markRead = markRead;
//# sourceMappingURL=notification.controller.js.map