# Podium: public-speaking rehearsal stage (mockup)

Practise a talk in a simulated room. Pick a venue and an audience, put your speech in the teleprompter, and speak. The audience reacts in real time to your pace, volume, vocal variety, pauses, fillers, rambling, and jargon. When you finish you get a report.

## Run it

Mic and speech recognition need `localhost` or https, so serve the folder rather than opening the file directly:

```bash
cd podium
python3 -m http.server 8000
# open http://localhost:8000 in Chrome or Edge (they have the built-in speech recognition)
```

- **Start speaking** uses your microphone. The teleprompter follows your voice.
- **Run demo** plays a two-minute sample performance through the same analysis engine, with a deliberate ramble and a rushed paragraph, so you can watch the room react without a mic.
- Drag to look around. Click anyone to see their engagement, confusion, and what they're thinking.

## Files
- `index.html`: the whole mockup (Three.js from cdnjs, no build step).
- `ARCHITECTURE.md`: what it takes to make this hyper-realistic and production-grade, with the APIs and tools to use.
