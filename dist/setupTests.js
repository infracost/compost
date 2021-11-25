"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dotenv_1 = (0, tslib_1.__importDefault)(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
// Since a lot of functionality checks env variables, we clear them here
// to make sure they are set explicitly and avoid any potential conflicts.
// The original ones are available in global.env
global.env = process.env;
process.env = {};
