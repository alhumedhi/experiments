"""The web side of the live audience, shared by Modal (GPU) and a local run (CPU, for testing).

  WebSocket /ws
    browser -> {"type":"hello","cast":"auditorium","faces":["front_1","front_2"]}
    server  -> {"type":"faces","fps":18,"faces":[{"id","width","height","crop","matrix"}...]}
    browser -> {"type":"pose","faces":{"front_1":{"pitch":4,"yaw":-6,"smile":.4,...}}}   (~15 Hz)
    server  -> binary frames: 1 byte face index + a 512x512 JPEG face crop                (~fps per face)
  GET /cast/...  the cast library (manifest.json, portraits, cut-outs, clips)

Run locally:  LP_ROOT=/path/to/LivePortrait CAST_DIR=./cast python server.py
"""
import asyncio
import json
import os
import pathlib
import time

import cv2


def create_app(engine, cast_root: pathlib.Path, fps: float = 18, max_faces: int = 4, before_load=None):
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles

    api = FastAPI()
    api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

    @api.get("/health")
    def health():
        return {"ok": True, "faces_loaded": len(engine.faces)}

    @api.websocket("/ws")
    async def ws(sock: WebSocket):
        await sock.accept()
        tasks = []
        try:
            hello = json.loads(await sock.receive_text())
            cast_name = str(hello.get("cast", "auditorium")).replace("/", "").replace("..", "")
            ids = [str(i).replace("/", "").replace("..", "") for i in hello.get("faces", [])][:max_faces]
            if before_load:
                before_load()
            metas = []
            for fid in ids:
                key = f"{cast_name}/{fid}"
                if key not in engine.faces:
                    img = cv2.imread(str(cast_root / cast_name / fid / "portrait.png"), cv2.IMREAD_COLOR)
                    if img is None:
                        await sock.send_text(json.dumps({"type": "error", "message": f"No portrait for {fid}."}))
                        continue
                    await asyncio.to_thread(engine.add_face, key, cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                metas.append({**engine.faces[key]["meta"], "id": fid})
            await sock.send_text(json.dumps({"type": "faces", "fps": fps, "faces": metas}))
            live = [m["id"] for m in metas]
            pose = {fid: {} for fid in live}

            async def receive():
                while True:
                    msg = json.loads(await sock.receive_text())
                    if msg.get("type") == "pose":
                        for fid, p in (msg.get("faces") or {}).items():
                            if fid in pose:
                                pose[fid] = {k: float(v) for k, v in p.items()}

            async def render():
                frame = 1.0 / fps
                while True:
                    t0 = time.perf_counter()
                    for idx, fid in enumerate(live):
                        jpg = await asyncio.to_thread(engine.render_jpeg, f"{cast_name}/{fid}", pose[fid])
                        await sock.send_bytes(bytes([idx]) + jpg)
                    await asyncio.sleep(max(0.0, frame - (time.perf_counter() - t0)))

            tasks = [asyncio.create_task(receive()), asyncio.create_task(render())]
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        except WebSocketDisconnect:
            pass
        finally:
            for t in tasks:
                t.cancel()

    cast_root.mkdir(parents=True, exist_ok=True)
    api.mount("/cast", StaticFiles(directory=str(cast_root)), name="cast")
    return api


if __name__ == "__main__":
    import uvicorn

    from engine import FaceEngine

    device = os.environ.get("DEVICE", "cpu")
    app = create_app(FaceEngine(device=device, half=device != "cpu"), pathlib.Path(os.environ.get("CAST_DIR", "cast")),
                     fps=float(os.environ.get("FPS", "18")))
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8790")))
