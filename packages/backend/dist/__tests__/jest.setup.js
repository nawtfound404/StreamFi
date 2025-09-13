"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
afterAll(async () => {
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            await mongoose_1.default.connection.close();
        }
    }
    catch (_) { }
});
//# sourceMappingURL=jest.setup.js.map