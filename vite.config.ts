import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative assets and hash routing support a static host at any subdirectory.
export default defineConfig({ base: './', plugins: [react()], test: { include: ['tests/**/*.test.ts'] } });
