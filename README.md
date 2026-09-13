# Rubik's Cube Solver

A mobile-friendly 3×3 Rubik's Cube solver built with HTML, CSS and JavaScript.

## Features

- Manual 54-sticker color entry
- Camera-based cube face scanning with review/correction
- Fixed center stickers in manual entry
- Cube color-count validation
- Kociemba two-phase solving through `cube.js`
- Step-by-step move display
- Animated 3D solution viewer
- Previous/next move controls
- Copy solution button
- Reset and example scramble
- Responsive design for Android and desktop

## Camera scanner

Tap **Scan Cube**, allow camera access, and scan the six faces in order: **Up → Right → Front → Down → Left → Back**. The scanner samples the center of each sticker, shows the detected colors for review, and lets you tap any sticker to cycle its color before accepting the face.

Camera access uses the browser's standard `getUserMedia()` API and requires HTTPS or another secure context. citeturn0search0

## Run locally

Open `index.html` in a modern browser. The solver libraries are loaded from jsDelivr and Three.js from unpkg.

## GitHub Pages

Enable **Settings → Pages → Deploy from a branch → main / root** in the repository settings. GitHub Pages will then publish the static app.

## Move notation

- `R` = right face clockwise
- `R'` = right face counter-clockwise
- `R2` = right face 180 degrees

The same notation applies to U, F, D, L and B.
