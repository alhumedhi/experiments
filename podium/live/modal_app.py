"""Podium photoreal audience: Modal backend.

  modal deploy podium/live/modal_app.py

Serves three things from one app:
  /ws           WebSocket. The browser sends each front-row person's reaction (head pose, gaze, smile, brows,
                blink, mouth) ~15 times a second; the GPU re-poses that person's portrait with LivePortrait and
                streams back 512px face crops as JPEG.
  /cast/...     The cast library (portraits, cut-outs, clips, manifest.json), read from the podium-cast volume.
  matte()       A batch job that cuts the background out of every generated clip and portrait, so people can
                be seated in the 3D room. make_cast.py calls it after generating the cast.
"""
import pathlib

import modal

LP_COMMIT = "9b294b3d0536135442ea73cb01e6cb3ca7029dd3"  # KwaiVGI/LivePortrait, pinned
HERE = pathlib.Path(__file__).parent

image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04", add_python="3.11")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    .pip_install("torch==2.5.1", "torchvision==0.20.1", index_url="https://download.pytorch.org/whl/cu124")
    .pip_install(
        "numpy==1.26.4", "opencv-python-headless==4.10.0.84", "scipy", "pyyaml", "imageio", "onnx",
        "onnxruntime-gpu==1.20.1", "scikit-image", "tyro", "rich", "pykalman", "requests", "tqdm",
        "albumentations", "huggingface_hub", "pillow", "fastapi[standard]", "rembg[gpu]==2.0.67",
    )
    .run_commands(
        f"git clone https://github.com/KwaiVGI/LivePortrait /opt/LivePortrait && cd /opt/LivePortrait && git checkout {LP_COMMIT}",
        "python -c \"from huggingface_hub import snapshot_download; snapshot_download('KlingTeam/LivePortrait', "
        "local_dir='/opt/LivePortrait/pretrained_weights', allow_patterns=['liveportrait/*','liveportrait/**','insightface/**'])\"",
    )
    .env({"LP_ROOT": "/opt/LivePortrait"})
    .add_local_file(HERE / "engine.py", "/root/engine.py")
    .add_local_file(HERE / "server.py", "/root/server.py")
)

app = modal.App("podium-live")
cast_vol = modal.Volume.from_name("podium-cast", create_if_missing=True)
CAST = pathlib.Path("/cast")

FPS = 18          # face frames per second sent to the browser
MAX_FACES = 4     # live faces one GPU drives comfortably at FPS


@app.cls(gpu="L4", image=image, volumes={"/cast": cast_vol}, scaledown_window=180, timeout=3600)
@modal.concurrent(max_inputs=8)  # cast-file requests share the container; each WebSocket renders its own faces
class Live:
    @modal.enter()
    def load(self):
        import sys
        sys.path.insert(0, "/root")
        from engine import FaceEngine
        self.engine = FaceEngine(device="cuda", half=True)

    @modal.asgi_app()
    def web(self):
        import sys
        sys.path.insert(0, "/root")
        from server import create_app
        return create_app(self.engine, CAST, fps=FPS, max_faces=MAX_FACES, before_load=cast_vol.reload)


# --------------------------------------------------------------------------- background removal
@app.function(gpu="T4", image=image, volumes={"/cast": cast_vol}, timeout=3600)
def matte(cast_name: str = "auditorium", model: str = "birefnet-general"):
    """Cut out every portrait and clip in a cast. Writes portrait_cut.png and <state>.alpha.mp4."""
    import json
    import subprocess

    import cv2
    import numpy as np
    from PIL import Image
    from rembg import new_session, remove

    cast_vol.reload()
    root = CAST / cast_name
    session = new_session(model)
    done = []
    for person in sorted(p for p in root.iterdir() if p.is_dir()):
        src = person / "portrait.png"
        if src.exists() and not (person / "portrait_cut.png").exists():
            remove(Image.open(src).convert("RGB"), session=session).save(person / "portrait_cut.png")
        for clip in sorted(c for c in person.glob("*.mp4") if not c.name.endswith(".alpha.mp4")):
            out = clip.with_name(clip.stem + ".alpha.mp4")  # picture on top, cut-out mask underneath
            if out.exists():
                continue
            cap = cv2.VideoCapture(str(clip))
            fps = cap.get(cv2.CAP_PROP_FPS) or 24
            w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            enc = subprocess.Popen(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h * 2}", "-r", str(fps),
                 "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "slow", "-movflags", "+faststart", str(out)],
                stdin=subprocess.PIPE)
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                rgba = np.array(remove(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), session=session))
                mask = np.repeat(rgba[..., 3:4], 3, axis=2)
                enc.stdin.write(np.vstack([rgba[..., :3], mask]).astype(np.uint8).tobytes())
            enc.stdin.close()
            enc.wait()
            done.append(str(out.relative_to(CAST)))
    cast_vol.commit()
    return done


@app.local_entrypoint()
def main(cast: str = "auditorium"):
    print(json_dumps(matte.remote(cast)))


def json_dumps(x):
    import json
    return json.dumps(x, indent=2)
