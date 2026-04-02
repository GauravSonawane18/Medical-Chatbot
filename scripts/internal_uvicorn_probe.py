import json
import sys
import threading
import time
from pathlib import Path

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


def main() -> None:
    host = "127.0.0.1"
    port = 8010
    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    base_url = f"http://{host}:{port}"
    with httpx.Client(timeout=10.0) as client:
        for _ in range(50):
            try:
                response = client.get(f"{base_url}/health")
                if response.status_code == 200:
                    break
            except httpx.HTTPError:
                time.sleep(0.2)
        else:
            raise RuntimeError("Uvicorn server did not start in time.")

        health = client.get(f"{base_url}/health")
        docs = client.get(f"{base_url}/docs")
        print(
            json.dumps(
                {
                    "health_status": health.status_code,
                    "health_body": health.json(),
                    "docs_status": docs.status_code,
                },
                indent=2,
            )
        )

    server.should_exit = True
    thread.join(timeout=5)


if __name__ == "__main__":
    main()
