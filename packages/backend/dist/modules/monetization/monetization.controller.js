"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayouts = exports.getNfts = exports.getDonations = exports.getSummary = void 0;
const getSummary = (_req, res) => res.status(200).json({ totalDonations: 500, totalNftSales: 1200, totalPayouts: 800 });
exports.getSummary = getSummary;
const getDonations = (_req, res) => res.status(200).json([]);
exports.getDonations = getDonations;
const getNfts = (_req, res) => res.status(200).json([]);
exports.getNfts = getNfts;
const getPayouts = (_req, res) => res.status(200).json([]);
exports.getPayouts = getPayouts;
//# sourceMappingURL=monetization.controller.js.map