"""Generate the photoreal cast with fal, then hand it to Modal.

  pip install fal-client modal
  export FAL_KEY=...                                  # fal.ai API key
  python make_cast.py --sample --yes                  # 3 portraits + 3 clips, to judge realism first
  python make_cast.py --yes                           # the full cast in cast.json
  python make_cast.py --upload --matte                # copy to the Modal volume and cut out backgrounds

Nothing is charged without --yes; without it the script only prints what it would generate and the estimate.
Files land in cast/<name>/<person>/portrait.png and <state>.mp4. Existing files are reused, never regenerated.
"""
import argparse
import concurrent.futures as cf
import json
import os
import pathlib
import sys
import urllib.request

HERE = pathlib.Path(__file__).parent
CLIP_PRICE_PER_SECOND = float(os.environ.get("CLIP_PRICE_PER_SECOND", "0.112"))  # Kling 3.0 Pro, audio off (fal, Oct 2026)
PORTRAIT_PRICE = float(os.environ.get("PORTRAIT_PRICE", "0.08"))                 # rough; check fal's pricing page


def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    with urllib.request.urlopen(url) as r, open(tmp, "wb") as f:
        f.write(r.read())
    tmp.rename(path)


def portrait_job(cfg, person, out):
    import fal_client
    path = out / person["id"] / "portrait.png"
    if path.exists():
        return f"kept {path}"
    res = fal_client.subscribe(cfg["portrait_model"], arguments={
        "prompt": cfg["portrait_prompt"].format(desc=person["desc"]),
        "aspect_ratio": "4:5", "resolution": "2K", "output_format": "png", "num_images": 1,
    })
    download(res["images"][0]["url"], path)
    return f"made {path}"


def clip_job(cfg, person, state, out):
    import fal_client
    path = out / person["id"] / f"{state}.mp4"
    if path.exists():
        return f"kept {path}"
    portrait = out / person["id"] / "portrait.png"
    url = fal_client.upload_file(str(portrait))
    res = fal_client.subscribe(cfg["video_model"], arguments={
        "start_image_url": url,
        "end_image_url": url,  # same first and last frame, so every clip loops and blends into the next
        "prompt": cfg["states"][state],
        "negative_prompt": cfg["negative_prompt"],
        "duration": cfg["clip_seconds"],
        "generate_audio": False,
    })
    download(res["video"]["url"], path)
    return f"made {path}"


def plan(cfg, sample):
    if sample:
        front, back = cfg["front"][:2], cfg["back"][:1]
        clips = [(back[0], "listen"), (back[0], "bored"), (front[0], "phone")]
    else:
        front, back = cfg["front"], cfg["back"]
        clips = [(p, s) for p in front for s in cfg["front_states"]] + [(p, s) for p in back for s in cfg["back_states"]]
    return front + back, clips


def write_manifest(cfg, out):
    def entry(p, states):
        have = [s for s in states if (out / p["id"] / f"{s}.mp4").exists()]
        return {"id": p["id"], "desc": p["desc"], "states": have}
    manifest = {
        "name": cfg["name"],
        "front": [entry(p, cfg["front_states"]) for p in cfg["front"] if (out / p["id"] / "portrait.png").exists()],
        "back": [entry(p, cfg["back_states"]) for p in cfg["back"] if (out / p["id"] / "portrait.png").exists()],
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cast", default=str(HERE / "cast.json"))
    ap.add_argument("--sample", action="store_true", help="3 portraits and 3 clips only")
    ap.add_argument("--yes", action="store_true", help="actually call fal (this costs money)")
    ap.add_argument("--upload", action="store_true", help="copy the cast to the Modal volume podium-cast")
    ap.add_argument("--matte", action="store_true", help="run the background-removal job on Modal")
    args = ap.parse_args()
    cfg = json.loads(pathlib.Path(args.cast).read_text())
    out = HERE / "cast" / cfg["name"]
    people, clips = plan(cfg, args.sample)

    new_portraits = [p for p in people if not (out / p["id"] / "portrait.png").exists()]
    new_clips = [(p, s) for p, s in clips if not (out / p["id"] / f"{s}.mp4").exists()]
    cost = len(new_portraits) * PORTRAIT_PRICE + len(new_clips) * int(cfg["clip_seconds"]) * CLIP_PRICE_PER_SECOND
    print(f"{len(new_portraits)} portraits and {len(new_clips)} clips to make, about ${cost:.2f} on fal.")

    if new_portraits or new_clips:
        if not args.yes:
            print("Dry run. Add --yes to generate.")
        else:
            if not os.environ.get("FAL_KEY"):
                sys.exit("Set FAL_KEY first.")
            with cf.ThreadPoolExecutor(4) as pool:
                for r in pool.map(lambda p: portrait_job(cfg, p, out), new_portraits):
                    print(r)
                for r in pool.map(lambda job: clip_job(cfg, job[0], job[1], out), new_clips):
                    print(r)

    manifest = write_manifest(cfg, out)
    print(f"Manifest: {len(manifest['front'])} front-row, {len(manifest['back'])} back-row people.")

    if args.upload:
        import modal
        vol = modal.Volume.from_name("podium-cast", create_if_missing=True)
        with vol.batch_upload(force=True) as batch:
            batch.put_directory(str(out), f"/{cfg['name']}")
        print("Uploaded to the Modal volume podium-cast.")
    if args.matte:
        import modal
        matte = modal.Function.from_name("podium-live", "matte")
        print("Cut out:", *matte.remote(cfg["name"]), sep="\n  ")


if __name__ == "__main__":
    main()
