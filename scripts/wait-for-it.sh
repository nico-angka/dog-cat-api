#!/bin/bash
# =============================================================================
# wait-for-it.sh - Wait for a service to become available
# =============================================================================
# Usage: ./scripts/wait-for-it.sh [options] -- [command]
#
# Options:
#   -h, --host HOST        Host to check (default: localhost)
#   -p, --port PORT        Port to check (default: 3000)
#   -t, --timeout SECONDS  Timeout in seconds (default: 30)
#   -q, --quiet            Don't output any status messages
#   --help                 Show this help message
#
# Examples:
#   ./scripts/wait-for-it.sh -h localhost -p 3000
#   ./scripts/wait-for-it.sh -t 60 -- npm start
#   ./scripts/wait-for-it.sh --host db --port 5432 -- node server.js

set -e

# Default values
HOST="localhost"
PORT="3000"
TIMEOUT="30"
QUIET=0
COMMAND=""

# =============================================================================
# Parse arguments
# =============================================================================
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -q|--quiet)
            QUIET=1
            shift
            ;;
        --help)
            head -n 18 "$0" | tail -n 16
            exit 0
            ;;
        --)
            shift
            COMMAND="$*"
            break
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Logging function
# =============================================================================
log() {
    if [[ $QUIET -eq 0 ]]; then
        echo "$@"
    fi
}

# =============================================================================
# Wait for service
# =============================================================================
log "Waiting for $HOST:$PORT (timeout: ${TIMEOUT}s)..."

start_time=$(date +%s)
end_time=$((start_time + TIMEOUT))

while true; do
    current_time=$(date +%s)

    if [[ $current_time -ge $end_time ]]; then
        log "Timeout reached. Service $HOST:$PORT is not available."
        exit 1
    fi

    # Try to connect using different methods
    if command -v nc &> /dev/null; then
        # Use netcat if available
        if nc -z "$HOST" "$PORT" 2>/dev/null; then
            log "Service $HOST:$PORT is available!"
            break
        fi
    elif command -v curl &> /dev/null; then
        # Fall back to curl
        if curl -s --connect-timeout 1 "http://$HOST:$PORT/health" &>/dev/null; then
            log "Service $HOST:$PORT is available!"
            break
        fi
    elif command -v wget &> /dev/null; then
        # Fall back to wget
        if wget -q --spider --timeout=1 "http://$HOST:$PORT/health" 2>/dev/null; then
            log "Service $HOST:$PORT is available!"
            break
        fi
    else
        # Use bash built-in /dev/tcp
        if (echo > /dev/tcp/"$HOST"/"$PORT") 2>/dev/null; then
            log "Service $HOST:$PORT is available!"
            break
        fi
    fi

    remaining=$((end_time - current_time))
    log "Waiting... (${remaining}s remaining)"
    sleep 1
done

# =============================================================================
# Execute command if provided
# =============================================================================
if [[ -n "$COMMAND" ]]; then
    log "Executing: $COMMAND"
    exec $COMMAND
fi
