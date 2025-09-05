"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutStatus = exports.TransactionStatus = exports.TransactionType = exports.StreamStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["STREAMER"] = "STREAMER";
    UserRole["AUDIENCE"] = "AUDIENCE";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var StreamStatus;
(function (StreamStatus) {
    StreamStatus["IDLE"] = "IDLE";
    StreamStatus["LIVE"] = "LIVE";
    StreamStatus["ERROR"] = "ERROR";
})(StreamStatus || (exports.StreamStatus = StreamStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DONATION"] = "DONATION";
    TransactionType["NFT_SALE"] = "NFT_SALE";
    TransactionType["PAYOUT"] = "PAYOUT";
    TransactionType["CREDIT_PURCHASE"] = "CREDIT_PURCHASE";
    TransactionType["REFUND"] = "REFUND";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["FAILED"] = "FAILED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["PENDING"] = "PENDING";
    PayoutStatus["APPROVED"] = "APPROVED";
    PayoutStatus["PAID"] = "PAID";
    PayoutStatus["REJECTED"] = "REJECTED";
})(PayoutStatus || (exports.PayoutStatus = PayoutStatus = {}));
//# sourceMappingURL=models.js.map