# Podium: public-speaking rehearsal stage

Practise a talk in front of a realistic audience. Choose a room and who's in it, load your speech into the teleprompter, and speak. The audience reacts as you go:

- They nod when you stress a point and lean in after a good pause.
- They frown or tilt their heads at jargon or when you rush.
- They drift or check their phones when you ramble.

When you finish, you get a full analysis of how the room followed you.

## Run it

The page loads 3D models and uses the microphone, so serve the folder rather than opening the file directly:

```bash
cd podium
python3 -m http.server 8000
# open http://localhost:8000 in Chrome or Edge (they include speech recognition)
```

- **Start rehearsal** listens to your microphone. The teleprompter follows your voice.
- **Watch a demo** plays a two-minute sample talk, including a ramble and a rushed section, so you can see the room react without a mic.
- **Import** loads a speech from a .txt, .md, .docx or .pdf file. You can also drop a file anywhere on the page.
- **Your own room**: add a photo of the room you'll speak in and the audience is seated inside it. On claude.ai, Claude reads the photo to line everyone up. Locally, use the Eye level, First row and Seating width sliders.
- **Mood → Brutal**: bore them for a few seconds and phones come out, and they spread to neighbours. A lively stretch can win some back.
- When you finish, Claude's coaching runs automatically on claude.ai.
- The settings button opens the room settings. The teleprompter button toggles the teleprompter. The eye button, or the **H** key, hides the whole interface.
- Drag to look around. Click anyone to see their name and how closely they're following you.

## Files
- `index.html`: the app (Three.js r128 from jsDelivr, no build step).
- `rig.js`: seats the avatars, plays their motion capture, and layers reactions on top (gaze, blinks, brows, smile, nods, lean, phone, crossed arms, clapping).
- `anims/`: seated motion-capture clips from Rocketbox for men (`m.json`) and women (`f.json`), in a compact keyframe format.
- `tools/`: the scripts that converted the Rocketbox FBX files (they expect a Rocketbox checkout at `/tmp/rb`).
- `avatars/`: 26 people from the [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) library (MIT licence, see `avatars/LICENSE-Rocketbox.md`). They are converted to compressed glTF with 1024px face textures, about 700 KB each.
- `ARCHITECTURE.md`: what it would take to go from here to photoreal humans, and the production APIs for real-time listening.
