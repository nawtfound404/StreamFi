"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.signup = exports.login = void 0;
const authService = __importStar(require("./auth.service"));
const logger_1 = require("../../utils/logger");
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const signup = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;
        // Structured debug log (safe fields only). Remove or gate for production if noisy.
        logger_1.logger.info({ email }, 'signup_request');
        const result = await authService.signupUser({ email, password, name });
        logger_1.logger.info({ email, userId: result.user.id }, 'signup_success');
        res.status(201).json(result);
    }
    catch (error) {
        logger_1.logger.warn({ err: error?.message, email: (req.body?.email) }, 'signup_failed');
        next(error);
    }
};
exports.signup = signup;
const getMe = async (req, res, next) => {
    try {
        const user = await authService.getUserById(req.user.id);
        res.status(200).json({ user });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map