#!/usr/bin/env python3
"""Fit the established source rhythm, then measure the finished soundtrack.

Prepare a 48 kHz stereo PCM master, then run python3 scripts/analyze.py.
NumPy and FFmpeg are required. The package-local ffmpeg-static is used by default.
analysis/ending.json supplies the edited duration and the final-frame lock time.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import wave
import numpy as np

BASE = Path(__file__).resolve().parent.parent
FIT_SECONDS = 60.1
RATE = 24000
STEP = 120
WINDOW = 2048
FPS = 30
DESIGN_STARTS = [0, 5, 10, 13, 17, 21, 25, 29, 33, 43, 49, 53, 57]


def capture(command):
    result = subprocess.run([str(v) for v in command], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, check=True)
    return result.stdout


def spectra(samples, normalization=None):
    blocks = np.lib.stride_tricks.sliding_window_view(samples, WINDOW)[::STEP]
    magnitude = abs(np.fft.rfft(blocks * np.hanning(WINDOW), axis=1))
    hz = np.fft.rfftfreq(WINDOW, 1 / RATE)
    energy = []
    scales = []
    for band_index, (low, high) in enumerate([(35, 190), (190, 2400), (2400, 11000)]):
        a = np.log1p(8 * magnitude[:, (hz >= low) & (hz < high)])
        delta = np.maximum(np.diff(a, axis=0), 0).mean(axis=1)
        scale = (float(np.percentile(delta, 95)) if normalization is None
                 else normalization[band_index])
        scales.append(max(scale, 1e-9))
        energy.append(delta / scales[-1])
    clock = (np.arange(len(energy[0])) * STEP + WINDOW / 2 + STEP) / RATE
    combined = .45 * energy[0] + .30 * energy[1] + .25 * energy[2]
    return clock, np.asarray(energy), combined, scales


def estimate(clock, bands, signal):
    # Search both tempo and phase. The source time axis remains untouched.
    active = np.maximum(signal - np.median(signal), 0)
    best = (-1, 0, 0)
    for bpm in np.arange(65, 180.001, .05):
        period = 60 / bpm
        bins = ((clock % period) / period * 96).astype(int)
        histogram = np.bincount(bins, weights=active, minlength=96)
        score = sum(np.roll(histogram, n) for n in [-2, -1, 0, 1, 2])
        k = int(np.argmax(score))
        value = float(score[k]) / max(float(active.sum()), 1e-9)
        if value > best[0]:
            best = (value, float(bpm), (k + .5) / 96 * period)
    period, phase = 60 / best[1], best[2]
    events = []
    for n in range(int((clock[-1] - phase) / period)):
        region = np.where(abs(clock - (phase + n * period)) < .07)[0]
        k = int(region[np.argmax(signal[region])])
        events.append([n, clock[k], signal[k], *bands[:, k]])
    observed = np.array(events)
    good = (observed[:, 2] > 1.05) & (observed[:, 0] > 3)
    for _ in range(5):
        linear = np.polyfit(observed[good, 0], observed[good, 1], 1, w=observed[good, 2])
        errors = observed[:, 1] - np.polyval(linear, observed[:, 0])
        good = (observed[:, 2] > 1.05) & (abs(errors) < .022) & (observed[:, 0] > 3)
    period, phase = float(linear[0]), float(linear[1])
    low_accents = [float(observed[observed[:, 0] % 4 == offset, 3].mean()) for offset in range(4)]
    accent = int(np.argmax(low_accents))
    diagnostics = {'coarseBpm': best[1], 'periodicScore': best[0],
                   'fittedStrongOnsets': int(good.sum()),
                   'fitResidualMs': float(np.std(errors[good]) * 1000),
                   'fourBeatLowFrequencyMeans': low_accents,
                   'downbeatOffset': accent,
                   'tempoConfidence': 'high',
                   'meterConfidence': '4/4 grid inferred from recurring bass accents'}
    return period, phase, accent, diagnostics


def local_peak(clock, signal, center, radius=.045):
    candidates = np.where(abs(clock - center) <= radius)[0]
    local = candidates[(signal[candidates] >= signal[np.maximum(candidates - 1, 0)]) &
                       (signal[candidates] >= signal[np.minimum(candidates + 1, len(signal) - 1)])]
    if len(local):
        candidates = local
    if not len(candidates):
        return center, 0
    k = int(candidates[np.argmax(signal[candidates])])
    return float(clock[k]), float(signal[k])


def make_cuts(clock, signal, period, phase, duration):
    details = []
    for target in [*DESIGN_STARTS, duration]:
        if target in [0, duration]:
            details.append({'nominal': target, 'time': target, 'frame': round(target * FPS),
                            'observedOnset': None, 'gridSubdivision': None})
            continue
        number = round((target - phase) / period)
        ideal = phase + number * period
        subdivision = 1
        if abs(ideal - target) > .25:
            # Use a real eighth-note onset when the nearest quarter note is outside tolerance.
            number = round((target - phase) / period * 2) / 2
            ideal = phase + number * period
            subdivision = 2
        onset, strength = local_peak(clock, signal, ideal, radius=.035)
        frame = round(onset * FPS)
        if abs(frame / FPS - target) > .25:
            raise ValueError(f'No eligible drum onset within ±0.25 sec of scene {target}')
        details.append({'nominal': target, 'time': frame / FPS, 'frame': frame,
                        'observedOnset': onset, 'gridTime': ideal,
                        'gridSubdivision': subdivision, 'onsetStrength': strength})
    return details


def decode_mono(ffmpeg, file, seconds=None):
    args = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', file]
    if seconds is not None:
        args.extend(['-t', str(seconds)])
    args.extend(['-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'])
    return np.frombuffer(capture(args), '<f4')


def soundtrack_format(path):
    with wave.open(str(path), 'rb') as audio:
        sample_rate = audio.getframerate()
        frames = audio.getnframes()
        return {
            'sampleRate': sample_rate, 'channels': audio.getnchannels(),
            'sampleWidthBits': audio.getsampwidth() * 8,
            'samplesPerChannel': frames, 'duration': frames / sample_rate,
        }


def measure_beats(duration, period, phase, accent, track_clock, track_flux,
                  ref_clock, ref_flux, peak_scale):
    beats = []
    grid_count = int(np.ceil((duration - phase) / period))
    for index in range(grid_count):
        ideal = phase + index * period
        detected, strength = local_peak(track_clock, track_flux, ideal)
        relative_strength = strength / peak_scale

        # The final recording contains a natural decay. A projected quarter note
        # without an audible attack remains part of the grid, not a visual pulse.
        if ideal >= FIT_SECONDS and relative_strength < .10:
            continue

        measured_frame = round(detected * FPS)
        edit_frame = measured_frame
        if ideal < FIT_SECONDS:
            # The original approved edit quantized this part from the direct
            # source decode. Keep that frame; still measure the actual final WAV.
            reference_time, _ = local_peak(ref_clock, ref_flux, ideal)
            edit_frame = round(reference_time * FPS)
        beat = {'index': index, 'time': round(detected, 9),
                'gridTime': round(ideal, 9), 'frame': edit_frame,
                'strength': round(min(relative_strength, 1), 6),
                'downbeat': bool(index % 4 == accent)}
        if measured_frame != edit_frame:
            beat['measuredFrame'] = measured_frame
        beats.append(beat)
    return beats, grid_count


def per_frame_peak(samples, frame_count):
    boundaries = np.rint(np.arange(frame_count + 1) * RATE / FPS).astype(int)
    if len(samples) != boundaries[-1]:
        raise ValueError(f'Expected {boundaries[-1]} decoded analysis samples, got {len(samples)}')
    peaks = [float(np.max(np.abs(samples[a:b]))) for a, b in zip(boundaries[:-1], boundaries[1:])]
    scale = max(float(np.percentile(peaks, 99)), 1e-9)
    return [round(min(peak / scale, 1), 6) for peak in peaks]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=BASE / 'assets/soundtrack.wav')
    parser.add_argument('--soundtrack', type=Path, default=BASE / 'assets/soundtrack.wav')
    parser.add_argument('--ending', type=Path, default=BASE / 'analysis/ending.json')
    parser.add_argument('--output', type=Path, default=BASE / 'analysis/beats.json')
    parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG_PATH'))
    args = parser.parse_args()
    binary = args.ffmpeg or str(BASE / 'node_modules/ffmpeg-static'
                                / ('ffmpeg.exe' if os.name == 'nt' else 'ffmpeg'))
    if not Path(binary).exists():
        binary = shutil.which('ffmpeg') or binary

    edit = json.loads(args.ending.read_text(encoding='utf8'))
    duration = float(edit['duration'])
    lock_time = float(edit['lockTime'])
    frame_count = round(duration * FPS)
    if abs(frame_count / FPS - duration) > 1e-8:
        raise ValueError('The edited duration must end on a 30 fps frame boundary')
    if 'frameCount' in edit and edit['frameCount'] != frame_count:
        raise ValueError('ending.json duration and frameCount differ')
    if not DESIGN_STARTS[-1] <= lock_time <= duration:
        raise ValueError('The final hold must fall within the last scene')
    fmt = soundtrack_format(args.soundtrack)
    if abs(fmt['duration'] - duration) > .5 / fmt['sampleRate']:
        raise ValueError('The soundtrack length differs from ending.json. Rebuild the soundtrack first.')

    # Keep the tempo, phase and the 13 approved scene starts reproducible from
    # exactly the same 60.1-second source window, independently of the new outro.
    reference = decode_mono(binary, args.source, FIT_SECONDS)
    ref_clock, ref_bands, ref_flux, scales = spectra(reference)
    period, phase, accent, diagnostics = estimate(ref_clock, ref_bands, ref_flux)
    first_downbeat = phase + accent * period
    origin = first_downbeat % (4 * period) - 4 * period
    cut_details = make_cuts(ref_clock, ref_flux, period, phase, duration)

    # Use the prepared WAV for all finished-film waveform samples and pulse
    # measurements, including both sides of the splice and the original decay.
    soundtrack = decode_mono(binary, args.soundtrack)
    track_clock, _, track_flux, _ = spectra(soundtrack, normalization=scales)
    peak_scale = max(float(np.percentile(ref_flux, 97)), 1e-9)
    beats, grid_count = measure_beats(duration, period, phase, accent,
                                    track_clock, track_flux, ref_clock, ref_flux, peak_scale)
    bar_count = max(32, int(np.ceil((duration - origin) / (4 * period))))
    bars = [{'number': n + 1, 'start': origin + n * 4 * period,
             'end': origin + (n + 1) * 4 * period,
             'inFilm': bool(origin + n * 4 * period < duration)} for n in range(bar_count)]

    data = {
        'bpm': 60 / period, 'phase': phase, 'beatPeriod': period,
        'barPeriod': 4 * period, 'firstDownbeat': first_downbeat,
        'duration': duration, 'lockTime': lock_time, 'fps': FPS, 'frameCount': frame_count,
        'sourceSpeed': edit.get('sourceSpeed', 1), 'sourceStart': 0,
        'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
        'sourceFile': args.source.name, 'soundtrack': 'assets/soundtrack.wav',
        'soundtrackSha256': hashlib.sha256(args.soundtrack.read_bytes()).hexdigest(),
        'soundtrackFormat': fmt, 'sourceEdit': edit.get('crossfade'),
        'sourceEditSampleRate': edit.get('sampleRate', fmt['sampleRate']),
        'plannedBars': bar_count, 'usedBarEquivalent': duration / (4 * period), 'bars': bars,
        'beats': beats, 'waveform': per_frame_peak(soundtrack, frame_count),
        'sceneCuts': [cut['time'] for cut in cut_details],
        'sceneCutFrames': [cut['frame'] for cut in cut_details], 'sceneCutDetails': cut_details,
        'analysis': {'sampleRate': RATE, 'window': WINDOW, 'hop': STEP,
                     'bandsHz': [[35, 190], [190, 2400], [2400, 11000]],
                     'fitSource': args.source.name, 'fitWindowSeconds': FIT_SECONDS,
                     'measurementSource': 'assets/soundtrack.wav', 'gridBeatCount': grid_count,
                     'outroMinimumRelativeOnset': .10,
                     'method': 'Source-window tempo/phase fit and scene cues; final soundtrack onset and frame-peak measurement',
                     **diagnostics},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(args.output.name + '.writing')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    temporary.replace(args.output)
    print(json.dumps({'duration': duration, 'frameCount': frame_count, 'bpm': data['bpm'],
                      'beatCount': len(beats), 'waveformFrames': len(data['waveform']),
                      'sceneCutFrames': data['sceneCutFrames'], 'sourceEdit': data['sourceEdit']},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
