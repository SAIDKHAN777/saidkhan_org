# Said Khan | 3D WebGL Audio-Reactive Portfolio (1:1 Exact Replica)

This project is a 1:1 pixel-perfect reverse-engineered clone of **Richard Mattka's award-winning 3D portfolio** (`https://richardmattka.com/`), tailored for **Said Khan (Full-stack Developer and Digital Marketer)**.

---

## 🌌 Exact 3D & Audio Architecture

1. **Raymarched 3D Shader Orb (`libs/shaders/orb1.js`)**:
   - The exact burning/plasma audio-reactive 3D orb rendered directly on the GPU using GLSL raymarching.
2. **Audio Engine (`libs/howler.min.js`)**:
   - Real-time Web Audio API frequency analysis driving the `audio1` uniform of the shader orb.
   - Ambient drone track (`assets/sounds/Knowing.mp3`), dance beat, and tactile UI click sound effects.
3. **Cinematic Views & Transitions (`js/views.js` & `libs/TweenMax.min.js`)**:
   - Seamless single-page application router supporting `home`, `work` (35 projects), `prototypes` (9 prototypes), `art` (16 fractal pieces), `press`, `info`, and `reel`.
4. **Interactive 3D Micro-UX**:
   - VanillaTilt card parallax and AOS scroll-triggered entrance animations.

---

## 🚀 How to Run Locally

```bash
cd /home/saidkhan/masterpiece-portfolio-site
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.
