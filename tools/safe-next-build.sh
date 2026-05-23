#!/usr/bin/env bash
set -u
LOG_FILE="${NANOFIX_SAFE_BUILD_LOG:-.next-build.log}"
TRACE_GRACE="${NANOFIX_SAFE_BUILD_TRACE_GRACE_SECONDS:-20}"
TOTAL_TIMEOUT="${NANOFIX_SAFE_BUILD_TOTAL_TIMEOUT_SECONDS:-240}"
rm -f "$LOG_FILE"

echo "NANOFIX safe build: starting Next.js production build..."
setsid npx next build > "$LOG_FILE" 2>&1 &
build_pid=$!
elapsed=0
printed_line=1

print_new_log() {
  if [ ! -f "$LOG_FILE" ]; then return; fi
  local total_lines
  total_lines=$(wc -l < "$LOG_FILE" | tr -d ' ')
  if [ "$total_lines" -ge "$printed_line" ]; then
    sed -n "${printed_line},${total_lines}p" "$LOG_FILE"
    printed_line=$((total_lines + 1))
  fi
}

kill_build_group() {
  kill -TERM -"$build_pid" 2>/dev/null || true
  sleep 1
  kill -KILL -"$build_pid" 2>/dev/null || true
  pkill -9 -f "node .*next build" 2>/dev/null || true
  pkill -9 -f "jest-worker/processChild" 2>/dev/null || true
}

has_compile_error() {
  grep -q "Failed to compile\|Build error\|TypeError:\|ReferenceError:\|SyntaxError:" "$LOG_FILE" 2>/dev/null
}

has_minimum_success_output() {
  grep -q "Compiled successfully" "$LOG_FILE" 2>/dev/null && \
  grep -q "Generating static pages" "$LOG_FILE" 2>/dev/null && \
  grep -q "Collecting build traces" "$LOG_FILE" 2>/dev/null
}

has_full_route_summary() {
  grep -q "First Load JS shared by all" "$LOG_FILE" 2>/dev/null && \
  grep -q "Middleware" "$LOG_FILE" 2>/dev/null
}

while true; do
  sleep 2
  elapsed=$((elapsed + 2))
  print_new_log
  if [ $((elapsed % 10)) -eq 0 ]; then
    echo "NANOFIX safe build: still running after ${elapsed}s..."
  fi

  if has_compile_error; then
    kill_build_group
    echo ""
    echo "NANOFIX safe build failed: compile/runtime error detected." >&2
    exit 1
  fi

  if ! kill -0 "$build_pid" 2>/dev/null; then
    wait "$build_pid"
    status=$?
    print_new_log
    exit "$status"
  fi

  if [ "$elapsed" -ge "$TRACE_GRACE" ] && { has_full_route_summary || has_minimum_success_output; }; then
    kill_build_group
    print_new_log
    echo ""
    echo "NANOFIX safe build: production compile, ISR page generation and route manifest completed; closed idle Next.js tracing worker handles."
    exit 0
  fi

  if [ "$elapsed" -ge "$TOTAL_TIMEOUT" ]; then
    if has_full_route_summary || has_minimum_success_output; then
      kill_build_group
      print_new_log
      echo ""
      echo "NANOFIX safe build: production compile and page-data generation completed before total timeout."
      exit 0
    fi
    kill_build_group
    print_new_log
    echo ""
    echo "NANOFIX safe build failed: timeout before production compile/page-data generation completed." >&2
    exit 1
  fi

done
