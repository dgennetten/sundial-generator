import { spawnSync } from 'child_process';

function run(cmd, args) {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n❌ Failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

console.log('🚀 Build and deploy starting...\n');
run('npm', ['run', 'build']);
run('node', ['deploy-sftp.js']);
console.log('\n🎉 Build and deploy completed successfully!');
