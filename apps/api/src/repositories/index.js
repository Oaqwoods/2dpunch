import { contentRepository as inMemoryContentRepository } from './contentRepository.js';
import { userRepository as inMemoryUserRepository } from './userRepository.js';
import { supabaseContentRepository } from './supabaseContentRepository.js';
import { supabaseUserRepository } from './supabaseUserRepository.js';

const provider = (process.env.DATA_PROVIDER || 'memory').toLowerCase();

export const userRepository = provider === 'supabase' ? supabaseUserRepository : inMemoryUserRepository;
export const contentRepository = provider === 'supabase' ? supabaseContentRepository : inMemoryContentRepository;

export const activeDataProvider = provider;