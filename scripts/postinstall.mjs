import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

try {
    const src = join(process.cwd(), 'node_modules', '@hpcc-js', 'wasm', 'dist');
    const dest = join(process.cwd(), 'public', 'wasm');
    mkdirSync(dest, { recursive: true });
    if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
        console.log('Copied @hpcc-js/wasm assets to public/wasm');
    } else {
        console.warn('Warning: @hpcc-js/wasm dist not found. Skipping copy.');
    }
} catch (err) {
    console.warn('postinstall copy skipped:', err?.message || err);
}
