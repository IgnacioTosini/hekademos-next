import { spawnSync } from 'node:child_process';

const task = process.argv[2];
const argumentsByTask = {
    install: ['install'],
    build: ['run', 'build:vercel'],
};
const args = argumentsByTask[task];

if (!args) {
    console.error('Uso: node scripts/vercel-npm.mjs install|build');
    process.exitCode = 1;
} else {
    const environment = { ...process.env };
    for (const key of Object.keys(environment)) {
        if (key.toLowerCase() === 'npm_config_cache_dir') delete environment[key];
    }

    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...args] : args;
    const result = spawnSync(command, commandArgs, {
        env: environment,
        stdio: 'inherit',
    });
    if (result.error) {
        console.error(`No se pudo ejecutar npm: ${result.error.message}`);
        process.exitCode = 1;
    } else {
        process.exitCode = result.status ?? 1;
    }
}
