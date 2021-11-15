import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Since a lot of functionality checks env variables, we clear them here
// to make sure they are set explicitly and avoid any potential conflicts.
// The original ones are available in global.env
global.env = process.env;
process.env = {};
