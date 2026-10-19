"""Live photoreal faces for the front row.

Each front-row person is one photoreal portrait. Every frame, LivePortrait re-poses that same photo from
reaction parameters the app computes (head pose, gaze, smile, brows, blinks, mouth), so the face never
drifts to a different person. Expression controls are LivePortrait's own image-retargeting edits
(src/gradio_pipeline.py), applied per frame instead of from sliders.

Licence note: LivePortrait's code is MIT, but the InsightFace detection models it uses for cropping are
for non-commercial research only. Swap in a commercial-safe detector (for example MediaPipe) before
shipping a product.
"""
import os
import sys

import cv2
import numpy as np
import torch

LP_ROOT = os.environ.get("LP_ROOT", "/opt/LivePortrait")
sys.path.insert(0, LP_ROOT)

from src.config.crop_config import CropConfig  # noqa: E402
from src.config.inference_config import InferenceConfig  # noqa: E402
from src.live_portrait_wrapper import LivePortraitWrapper  # noqa: E402
from src.utils.camera import get_rotation_matrix  # noqa: E402
from src.utils.cropper import Cropper  # noqa: E402
from src.utils.retargeting_utils import calc_eye_close_ratio, calc_lip_close_ratio  # noqa: E402

# Default reaction: looking at the speaker, neutral face.
NEUTRAL = dict(pitch=0.0, yaw=0.0, roll=0.0, smile=0.0, eyebrow=0.0, eye_x=0.0, eye_y=0.0, blink=0.0, mouth=0.0)


def _eyeball(d, x, y):
    if x > 0:
        d[0, 11, 0] += x * 0.0007
        d[0, 15, 0] += x * 0.001
    else:
        d[0, 11, 0] += x * 0.001
        d[0, 15, 0] += x * 0.0007
    d[0, 11, 1] += y * -0.001
    d[0, 15, 1] += y * -0.001
    blink = -y / 2.0
    d[0, 11, 1] += blink * -0.001
    d[0, 13, 1] += blink * 0.0003
    d[0, 15, 1] += blink * -0.001
    d[0, 16, 1] += blink * 0.0003


def _smile(d, s):
    d[0, 20, 1] += s * -0.01
    d[0, 14, 1] += s * -0.02
    d[0, 17, 1] += s * 0.0065
    d[0, 17, 2] += s * 0.003
    d[0, 13, 1] += s * -0.00275
    d[0, 16, 1] += s * -0.00275
    d[0, 3, 1] += s * -0.0035
    d[0, 7, 1] += s * -0.0035


def _eyebrow(d, e):
    if e > 0:  # raised
        d[0, 1, 1] += e * 0.001
        d[0, 2, 1] += e * -0.001
    else:  # drawn together: a frown
        d[0, 1, 0] += e * -0.001
        d[0, 2, 0] += e * 0.001
        d[0, 1, 1] += e * 0.0003
        d[0, 2, 1] += e * -0.0003


class FaceEngine:
    def __init__(self, device: str = "cuda", half: bool = True):
        cpu = device == "cpu"
        icfg = InferenceConfig()
        icfg.flag_force_cpu = cpu
        icfg.flag_use_half_precision = half and not cpu
        self.lp = LivePortraitWrapper(inference_cfg=icfg)
        ccfg = CropConfig()
        ccfg.flag_force_cpu = cpu
        self.cropper = Cropper(crop_cfg=ccfg, flag_force_cpu=cpu)
        self.faces = {}

    @torch.no_grad()
    def add_face(self, face_id: str, img_rgb: np.ndarray) -> dict:
        """Prepare a portrait once. Returns where the 512px face crop sits in the full portrait."""
        crop = self.cropper.crop_source_image(img_rgb, self.cropper.crop_cfg)
        if crop is None:
            raise ValueError(f"no face found in portrait {face_id}")
        lp = self.lp
        I_s = lp.prepare_source(crop["img_crop_256x256"])
        info = lp.get_kp_info(I_s)
        lmk = crop["lmk_crop"]
        self.faces[face_id] = dict(
            info=info,
            f_s=lp.extract_feature_3d(I_s),
            x_s=lp.transform_keypoint(info),
            lmk=lmk,
            eye0=float(calc_eye_close_ratio(lmk[None]).mean()),
            lip0=float(calc_lip_close_ratio(lmk[None])[0][0]),
        )
        M = crop["M_c2o"]  # 3x3, maps the 512 crop back into the portrait
        meta = dict(id=face_id, width=int(img_rgb.shape[1]), height=int(img_rgb.shape[0]),
                    crop=512, matrix=[float(v) for v in M[:2].reshape(-1)])
        self.faces[face_id]["meta"] = meta
        return meta

    @torch.no_grad()
    def render(self, face_id: str, p: dict) -> np.ndarray:
        """Re-pose the portrait. p: degrees for pitch/yaw/roll (relative to the photo), LivePortrait slider
        units for smile (-0.3..1.3), eyebrow (-30..30), eye_x/eye_y (-30..30), and 0..1 for blink and mouth.
        Returns the 512x512 RGB face crop."""
        F = self.faces[face_id]
        q = {**NEUTRAL, **p}
        lp, info = self.lp, F["info"]
        R_d = get_rotation_matrix(info["pitch"] + q["pitch"], info["yaw"] + q["yaw"], info["roll"] + q["roll"])
        delta = info["exp"].clone()
        if q["eye_x"] or q["eye_y"]:
            _eyeball(delta, q["eye_x"], q["eye_y"])
        if q["smile"]:
            _smile(delta, q["smile"])
        if q["eyebrow"]:
            _eyebrow(delta, q["eyebrow"])
        x_d = info["scale"] * (info["kp"] @ R_d + delta) + info["t"]
        x_s = F["x_s"]
        if q["blink"] > 0.01:
            eye = F["eye0"] * (1.0 - min(1.0, q["blink"]) * 0.95)
            x_d = x_d + lp.retarget_eye(x_s, lp.calc_combined_eye_ratio([[eye]], F["lmk"]))
        if q["mouth"] > 0.01:
            lip = F["lip0"] + min(1.0, q["mouth"]) * (0.8 - F["lip0"])
            x_d = x_d + lp.retarget_lip(x_s, lp.calc_combined_lip_ratio([lip], F["lmk"]))
        x_d = lp.stitching(x_s, x_d)
        out = lp.warp_decode(F["f_s"], x_s, x_d)
        return lp.parse_output(out["out"])[0]

    def render_jpeg(self, face_id: str, p: dict, quality: int = 82) -> bytes:
        img = self.render(face_id, p)
        ok, buf = cv2.imencode(".jpg", cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, quality])
        return buf.tobytes()
