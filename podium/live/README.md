# Photoreal audience (fal + Modal)

In photoreal mode there are no 3D people. In the auditorium and lecture hall:

- **Front row, live.** Each person is a photoreal portrait. A GPU on Modal re-poses that same photo about 18 times a second with [LivePortrait](https://github.com/KwaiVGI/LivePortrait), driven by the reactions the crowd model computes as you speak: head pose, gaze, smile, brows, blinks and yawns. Because every frame comes from the same photo, the face stays the same person. When they reach for a phone or clap, their body switches to a recorded clip.
- **Everyone else, recorded.** Photoreal clips (listen, engaged, bored, phone, confused, clap) generated once with fal and switched live as each person's state changes.

## Files

| File | What it does |
|---|---|
| `cast.json` | Who is in the cast, the portrait and clip prompts, and which fal models to use |
| `make_cast.py` | Generates portraits (`fal-ai/nano-banana-2`) and clips (`fal-ai/kling-video/v3/pro/image-to-video`), uploads to Modal, runs the cut-out job |
| `modal_app.py` | The Modal app: the live-face GPU server, the cast file server, and `matte`, which cuts people out of their backgrounds |
| `server.py` | The WebSocket and file server, shared by Modal and local CPU runs |
| `engine.py` | Re-poses a portrait from reaction parameters using LivePortrait's own retargeting edits |
| `live.js` | The browser side: seats clip people, composites the live faces, sends reactions to the server |

## Run it

```bash
pip install modal fal-client
modal token new                          # or set MODAL_TOKEN_ID / MODAL_TOKEN_SECRET
export FAL_KEY=...                       # fal.ai API key

cd podium/live
python make_cast.py --sample             # dry run: shows what it would make and the cost
python make_cast.py --sample --yes       # about $2: 3 portraits, 3 clips; look at them in cast/auditorium/
python make_cast.py --yes                # the full cast, about $39 (14 portraits, 68 five-second clips)

modal deploy modal_app.py                # prints the web URL, e.g. https://<you>--podium-live-live-web.modal.run
python make_cast.py --upload --matte     # copy the cast to Modal and cut everyone out
```

Then open Podium locally (`python3 -m http.server 8000` in `podium/`, in Chrome, Safari or Edge). In **Your room**, turn on **Photoreal people**, paste the Modal URL, and choose **Auditorium** or **Lecture hall**.

## Costs

- **Cast, once:** about $39 for the default cast at fal's listed $0.112 per second of clip. Change `CLIP_PRICE_PER_SECOND` if fal's price changes; the script prints its estimate before spending anything.
- **Live faces:** one Modal L4 GPU while a rehearsal is running. It shuts down 3 minutes after the last connection. One L4 drives the 4 front-row faces.

## Known limits

- The live faces run on Modal, so photoreal mode needs Podium running locally or on your own site. The claude.ai page can't connect to outside servers.
- Clips are MP4s with a stacked cut-out mask (picture on top, mask underneath), which play in Chrome, Safari and Edge.
- LivePortrait moves the head, face and shoulders. Bigger movements come from clips.
- Back-row identities repeat across a large hall, mirrored on alternate seats. Add more people to `cast.json` for more variety.
- **Licence:** LivePortrait's code is MIT, but the InsightFace face-detection models it uses are for non-commercial research only. Before selling this, swap the detector (MediaPipe works; see [ComfyUI-LivePortraitKJ](https://github.com/kijai/ComfyUI-LivePortraitKJ)).
- Use generated faces (as `cast.json` does), not photos of real people without their consent.

## What was tested here

The face engine was run on CPU against a test face: nod, turn, tilt, frown, smile, blink, yawn and gaze all work. The full chain was then run locally: the server, the WebSocket, live frames composited into the front row, and stacked-mask clips seated in the auditorium. Nothing has been run on Modal or fal yet, because those need your keys.
