# Pipe Organ Anatomy

Interactive isometric SVG figure explaining how a pipe organ works, built with the [Anatomy](https://skills.wheresryan.sh/anatomy) skill kit.

## How it works

A pipe organ produces sound by directing pressurized air through pipes of different lengths. Each key opens a pallet valve beneath one pipe; air rushes up and resonates at a frequency determined by the pipe's length:

**f = v / 2L** (open pipe, v = 343 m/s)

Longer pipe → lower note. Shorter pipe → higher note.

The five pipes are tuned to C, D, E, G, A (pentatonic scale):

| Note | Frequency | Pipe length |
|------|-----------|-------------|
| C4 | 261.6 Hz | 65.6 cm |
| D4 | 293.7 Hz | 58.4 cm |
| E4 | 329.6 Hz | 52.0 cm |
| G4 | 392.0 Hz | 43.7 cm |
| A4 | 440.0 Hz | 39.0 cm |

## Usage

Open `index.html` in a browser. Drag across the keyboard to play each pipe.

## Build

```bash
node build.mjs          # dark theme
node build.mjs --light  # light theme
```

Requires the [Anatomy kit](https://skills.wheresryan.sh/anatomy/anatomy.zip).

## License

MIT
