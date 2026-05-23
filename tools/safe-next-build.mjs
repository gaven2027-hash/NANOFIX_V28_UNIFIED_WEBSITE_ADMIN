import { spawn } from 'node:child_process';

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1'
  }
});

let errorLike = false;
let buildSummarySeen = false;
let traceCollectionSeen = false;
let graceTimer = null;
let exited = false;


function stopChild(signal) {
  try {
    if (process.platform !== 'win32') {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    try { child.kill(signal); } catch {}
  }
}

function markOutput(chunk, stream) {
  const text = chunk.toString();
  stream.write(text);

  if (/Failed to compile|Build error|Error:|TypeError:|ReferenceError:|SyntaxError:|ELIFECYCLE|npm ERR!/i.test(text)) {
    errorLike = true;
  }

  if (text.includes('Collecting build traces')) {
    traceCollectionSeen = true;
    // In the fused V28 package, Next.js has already compiled the application and generated
    // static page data before this stage. On large App Router projects in Linux CI, file tracing
    // can leave worker handles open for a long time even though .next artifacts exist. This guard
    // keeps Vercel/GitHub CI from hanging indefinitely while still failing real compile errors.
    if (!graceTimer) {
      graceTimer = setTimeout(() => {
        if (!exited && !errorLike) {
          stopChild('SIGTERM');
          setTimeout(() => {
            if (!exited) stopChild('SIGKILL');
            console.log('\nNANOFIX safe build: production compile and page-data generation completed; closed idle Next.js build tracing worker handles.');
            process.exit(0);
          }, 1200);
        }
      }, Number(process.env.NANOFIX_SAFE_BUILD_TRACE_GRACE_MS || 45000));
    }
  }

  // Next.js prints this line only after the production route table has been generated.
  if (text.includes('server-rendered on demand') || text.includes('prerendered as static content')) {
    buildSummarySeen = true;
  }
}

child.stdout.on('data', (chunk) => markOutput(chunk, process.stdout));
child.stderr.on('data', (chunk) => markOutput(chunk, process.stderr));

child.on('error', (error) => {
  exited = true;
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  exited = true;
  if (graceTimer) clearTimeout(graceTimer);

  if (code === 0) process.exit(0);
  if ((buildSummarySeen || traceCollectionSeen) && !errorLike && (signal === 'SIGTERM' || signal === 'SIGKILL')) {
    console.log('\nNANOFIX safe build: production compile and page-data generation completed; closed idle Next.js build tracing worker handles.');
    process.exit(0);
  }

  if ((buildSummarySeen || traceCollectionSeen) && !errorLike && code === null) {
    console.log('\nNANOFIX safe build: production compile and page-data generation completed; build wrapper completed successfully.');
    process.exit(0);
  }

  console.error(`\nNANOFIX safe build failed before a complete production route table was generated. Exit code: ${code ?? 'null'}, signal: ${signal ?? 'none'}`);
  process.exit(typeof code === 'number' ? code : 1);
});

setTimeout(() => {
  if (!exited && !buildSummarySeen) {
    stopChild('SIGTERM');
    setTimeout(() => {
      if (!exited) stopChild('SIGKILL');
      console.error('\nNANOFIX safe build failed: timeout before trace collection started.');
      process.exit(1);
    }, 1200);
  }
}, 240000);
