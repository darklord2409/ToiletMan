#!/usr/bin/env python
"""Block until a TCP host:port is accepting connections.

Usage: python wait_for.py host:port [--timeout SECONDS]
"""
import socket
import sys
import time


def main() -> None:
    target = sys.argv[1]
    timeout = 30.0
    if "--timeout" in sys.argv:
        timeout = float(sys.argv[sys.argv.index("--timeout") + 1])

    host, port_str = target.rsplit(":", 1)
    port = int(port_str)

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"{host}:{port} is available.")
                return
        except OSError:
            time.sleep(1)

    print(f"Timed out waiting for {host}:{port}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
