"""Erzeugt die eigene Retro-Musik von PreitenWars (Chiptune, keine fremden Assets).

    python scripts/gen-retro-music.py

Schreibt nach resources/sounds/music/ und resources/sounds/effects/.
"""
import math
import os
import random
import struct
import wave

SR = 22050
ROOT = os.path.join(os.path.dirname(__file__), "..", "resources", "sounds")
NOTE = {n: i for i, n in enumerate("C C# D D# E F F# G G# A A# B".split())}


def freq(name):
    # "A4", "C#5" ...
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + (o - 4) * 12 - 9) / 12)


def square(ph, duty=0.5):
    return 1.0 if (ph % 1.0) < duty else -1.0


def tri(ph):
    p = ph % 1.0
    return 4 * p - 1 if p < 0.5 else 3 - 4 * p


class Track:
    def __init__(self, seconds):
        self.buf = [0.0] * int(SR * seconds)

    def tone(self, t0, dur, f, vol, wave_fn, vib=0.0, attack=0.005, release=0.06):
        start, n = int(t0 * SR), int(dur * SR)
        ph = 0.0
        for i in range(n):
            j = start + i
            if j >= len(self.buf):
                break
            t = i / SR
            env = min(1.0, t / attack) * min(1.0, (dur - t) / release) if dur > release else 1.0
            env = max(0.0, env)
            ff = f * (1 + vib * math.sin(2 * math.pi * 5.5 * t) * min(1.0, t * 4))
            ph += ff / SR
            self.buf[j] += wave_fn(ph) * vol * env

    def noise(self, t0, dur, vol, decay):
        start, n = int(t0 * SR), int(dur * SR)
        for i in range(n):
            j = start + i
            if j >= len(self.buf):
                break
            self.buf[j] += (random.random() * 2 - 1) * vol * math.exp(-i / SR * decay)

    def kick(self, t0, vol=0.55):
        start, n = int(t0 * SR), int(0.18 * SR)
        ph = 0.0
        for i in range(n):
            j = start + i
            if j >= len(self.buf):
                break
            t = i / SR
            ph += (150 * math.exp(-t * 25) + 45) / SR
            self.buf[j] += math.sin(2 * math.pi * ph) * vol * math.exp(-t * 14)

    def save(self, path):
        peak = max(1e-6, max(abs(x) for x in self.buf))
        g = 0.85 / peak
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with wave.open(path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x * g)) * 32767)) for x in self.buf))
        print("geschrieben:", os.path.normpath(path))


def song(path, bpm, chords, melody, bass_oct, lead_duty, swing_hat=False):
    beat = 60.0 / bpm
    bars = len(chords)
    tr = Track(bars * 4 * beat + 0.05)
    for b, chord in enumerate(chords):
        t_bar = b * 4 * beat
        notes = chord.split("-")
        # Bass: Grundton auf Achteln, Oktavsprung
        for k in range(8):
            n = notes[0] + str(bass_oct + (1 if k % 2 else 0))
            tr.tone(t_bar + k * beat / 2, beat / 2 * 0.9, freq(n), 0.32, tri)
        # Arpeggio (16tel) – typischer Konsolen-Sound
        for k in range(16):
            n = notes[k % len(notes)] + "5"
            tr.tone(t_bar + k * beat / 4, beat / 4 * 0.8, freq(n), 0.07, lambda p: square(p, 0.125))
        # Drums
        for k in range(4):
            tr.kick(t_bar + k * beat) if k % 2 == 0 else tr.noise(t_bar + k * beat, 0.16, 0.28, 18)
        for k in range(8):
            off = beat / 2 * k + (beat * 0.08 if swing_hat and k % 2 else 0)
            tr.noise(t_bar + off, 0.04, 0.08, 90)
    # Melodie: Liste (Startbeat, Dauer in Beats, Note)
    for st, du, n in melody:
        tr.tone(st * beat, du * beat * 0.95, freq(n), 0.2, lambda p: square(p, lead_duty), vib=0.006)
        tr.tone(st * beat + beat * 0.75, du * beat * 0.9, freq(n), 0.05, lambda p: square(p, lead_duty))  # Echo
    tr.save(path)


def seq(start_beat, pattern):
    """'E5:1 G5:0.5 ...' -> Melodie-Events ab start_beat; '-' = Pause."""
    out, t = [], start_beat
    for tok in pattern.split():
        n, d = tok.split(":")
        d = float(d)
        if n != "-":
            out.append((t, d, n))
        t += d
    return out


random.seed(64)

# Menü: fröhlich, C-Dur, 116 BPM
menu_chords = ["C-E-G", "A-C-E", "F-A-C", "G-B-D"] * 4
menu_mel = []
phrase_a = "E5:1 G5:0.5 C6:1.5 B5:0.5 A5:0.5 G5:1 E5:1 F5:0.5 A5:1 G5:1.5 - :1".replace("- :1", "-:1")
phrase_b = "C6:0.5 B5:0.5 A5:1 G5:1 E5:0.5 F5:0.5 G5:2 D5:1 E5:0.5 F5:0.5 D5:1.5 -:0.5 G4:1"
for rep in range(4):
    menu_mel += seq(rep * 16, phrase_a if rep % 2 == 0 else phrase_b)
song(os.path.join(ROOT, "music", "menu-theme.wav"), 116, menu_chords, menu_mel, 2, 0.25, swing_hat=True)

# Gameplay: treibend, A-Moll, 138 BPM
game_chords = ["A-C-E", "F-A-C", "D-F-A", "E-G#-B"] * 4
game_mel = []
g_a = "A5:0.5 A5:0.5 C6:0.5 A5:0.5 E5:1 D5:0.5 E5:0.5 F5:1 E5:0.5 D5:0.5 C5:1 B4:1"
g_b = "E5:1 A5:1 G5:0.5 F5:0.5 E5:1 D5:1 F5:1 E5:0.5 D5:0.5 B4:1 G#4:1"
for rep in range(4):
    game_mel += seq(rep * 16, g_a if rep % 2 == 0 else g_b)
song(os.path.join(ROOT, "music", "gameplay.wav"), 138, game_chords, game_mel, 2, 0.5)

# Start-Jingle: aufsteigendes Arpeggio + Akkord
tr = Track(1.6)
for i, n in enumerate(["C5", "E5", "G5", "C6", "E6", "G6"]):
    tr.tone(i * 0.07, 0.12, freq(n), 0.25, lambda p: square(p, 0.25))
for n in ["C5", "G5", "C6", "E6"]:
    tr.tone(0.45, 1.0, freq(n), 0.16, lambda p: square(p, 0.5), vib=0.01, release=0.5)
tr.kick(0.45, 0.6)
tr.save(os.path.join(ROOT, "effects", "game-start-alert.wav"))
