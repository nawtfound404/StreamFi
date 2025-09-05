"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.loginUser = exports.signupUser = exports.findUserByEmail = exports.createUser = exports.generateToken = void 0;
// packages/backend/src/modules/auth/auth.service.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongo_1 = require("../../lib/mongo");
const environment_1 = require("../../config/environment");
const models_1 = require("../../types/models");
/**
 * Generates JWT for a user
 */
const generateToken = (user) => {
    const payload = {
        id: user.id,
        role: user.role,
    };
    const options = {
        expiresIn: environment_1.env.jwt.expiresIn,
    };
    return jsonwebtoken_1.default.sign(payload, environment_1.env.jwt.secret, options);
};
exports.generateToken = generateToken;
/**
 * Create a user (used by signup)
 */
const createUser = async (userData) => {
    const { email, password, name } = userData;
    if (!email || !password) {
        throw new Error('Email and password are required.');
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    await (0, mongo_1.connectMongo)();
    const doc = await mongo_1.UserModel.create({ email, password: hashedPassword, name, role: models_1.UserRole.AUDIENCE });
    const user = { id: doc._id.toString(), email: doc.email, name: doc.name, displayName: doc.displayName, role: doc.role };
    return user;
};
exports.createUser = createUser;
/**
 * Helper: find user by email
 */
const findUserByEmail = async (email) => {
    await (0, mongo_1.connectMongo)();
    return mongo_1.UserModel.findOne({ email }).lean();
};
exports.findUserByEmail = findUserByEmail;
/**
 * Controller-facing: register a new user and return token + user
 */
const signupUser = async (payload) => {
    // optionally validate payload here
    if (!payload.email) {
        throw new Error('Email is required.');
    }
    const existing = await (0, exports.findUserByEmail)(payload.email);
    if (existing) {
        throw new Error('Email already in use.');
    }
    const user = await (0, exports.createUser)(payload);
    const token = (0, exports.generateToken)({ id: user._id?.toString?.() || user.id, role: user.role });
    // remove sensitive fields before returning
    const safeUser = {
        id: user._id?.toString?.() || user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
    };
    return { user: safeUser, token };
};
exports.signupUser = signupUser;
/**
 * Controller-facing: login with email/password, return token + user
 */
const loginUser = async (email, password) => {
    if (!email || !password) {
        throw new Error('Email and password required.');
    }
    const user = await (0, exports.findUserByEmail)(email);
    if (!user || !user.password) {
        throw new Error('Invalid credentials.');
    }
    const isValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isValid) {
        throw new Error('Invalid credentials.');
    }
    const token = (0, exports.generateToken)({ id: user._id.toString(), role: user.role });
    const safeUser = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
    };
    return { user: safeUser, token };
};
exports.loginUser = loginUser;
/**
 * Controller-facing: fetch user by id (safe shape)
 */
const getUserById = async (id) => {
    await (0, mongo_1.connectMongo)();
    const user = await mongo_1.UserModel.findById(id).select('email name displayName role').lean();
    if (!user) {
        throw new Error('User not found');
    }
    return { id, email: user.email, name: user.name, displayName: user.displayName, role: user.role };
};
exports.getUserById = getUserById;
//# sourceMappingURL=auth.service.js.map