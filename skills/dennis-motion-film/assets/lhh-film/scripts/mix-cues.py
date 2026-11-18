#!/usr/bin/env python3
"""Mix five short, frame-aligned original tones into the prepared 48 kHz stereo track.

Run from any directory with Python 3. The package-local FFmpeg measures 4x
oversampled peaks. The original assets/soundtrack.wav is only opened for reading.
"""
import argparse
from array import array
from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
FPS = 30
CHANNELS = 2
PER_FRAME = RATE // FPS
LEAD = round(.024 * RATE)
RELEASE = round(.088 * RATE)
HOLD = round(.008 * RATE)
CEILING = 10 ** (-1.5 / 20)
TAU = 2 * math.pi


@dataclass(frozen=True)
class Note:
    midi: int
    delay: float
    weight: float
    decay: float
    pan: float


@dataclass(frozen=True)
class Tone:
    duration: float
    base_peak: float
    max_peak: float
    duck_db: float
    notes: tuple


# A compact F-minor palette. The two check marks rise F–Ab. The final
# C–F response resolves the figure. Each voice uses a short rounded attack
# and independently decaying partials instead of a stock notification sample.
TONES = {
    'scan': Tone(.205, .130, .215, 1.9, (
        Note(84, .000, 1.00, .046, -.04), Note(89, .022, .19, .032, .12))),
    'summary': Tone(.295, .146, .225, 2.1, (
        Note(80, .000, .86, .067, -.09), Note(84, .031, .70, .062, .12),
        Note(87, .063, .27, .043, .03))),
    'check1': Tone(.190, .134, .207, 1.8, (
        Note(77, .000, 1.00, .045, -.06), Note(84, .006, .18, .033, .08))),
    'check2': Tone(.208, .137, .212, 1.8, (
        Note(80, .000, 1.00, .050, .06), Note(87, .010, .20, .036, -.08))),
    'submit': Tone(.322, .152, .230, 2.1, (
        Note(84, .000, .78, .047, -.08), Note(89, .072, 1.00, .064, .08),
        Note(84, .074, .24, .062, -.12))),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def db(amplitude):
    return round(20 * math.log10(max(float(amplitude), 1e-12)), 3)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def cosine_rise(value):
    return .5 - .5 * math.cos(math.pi * max(0, min(1, value)))


def pcm_from_bytes(raw):
    result = array('h')
    result.frombytes(raw)
    if sys.byteorder != 'little':
        result.byteswap()
    return result


def pcm_bytes(pcm):
    if sys.byteorder == 'little':
        return pcm.tobytes()
    copy = array('h', pcm)
    copy.byteswap()
    return copy.tobytes()


def read_pcm(path):
    with wave.open(str(path), 'rb') as source:
        expected = (CHANNELS, 2, RATE, 'NONE')
        actual = (source.getnchannels(), source.getsampwidth(),
                  source.getframerate(), source.getcomptype())
        require(actual == expected, f'Expected 48 kHz stereo signed 16-bit PCM, got {actual}')
        return pcm_from_bytes(source.readframes(source.getnframes()))


def write_pcm(path, pcm):
    with wave.open(str(path), 'wb') as output:
        output.setparams((CHANNELS, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(pcm_bytes(pcm))


def make_tone(tone):
    length = round(tone.duration * RATE)
    signal = array('d', [0]) * (length * CHANNELS)
    for note in tone.notes:
        begin = round(note.delay * RATE)
        freq = hz(note.midi)
        for index in range(begin, length):
            t = (index - begin) / RATE
            envelope = cosine_rise(t / .0024) * math.exp(-t / note.decay)
            envelope *= cosine_rise((length - 1 - index) / (RATE * .014))
            phase = TAU * freq * t
            sound = .90 * math.sin(phase)
            sound += .23 * math.exp(-t / .049) * math.sin(2.006 * phase + .23)
            sound += .095 * math.exp(-t / .035) * math.sin(3.012 * phase + .48)
            sound += .042 * math.exp(-t / .022) * math.sin(4.971 * phase + .17)
            mono = note.weight * envelope * sound
            signal[index * 2] += mono * (1 - note.pan)
            signal[index * 2 + 1] += mono * (1 + note.pan)
    peak = max(abs(v) for v in signal)
    return array('d', (v / peak for v in signal))


def band_power(stereo, frequencies):
    """Coherent Hann-window energy at the cue pitches across its early ring."""
    width = 1536
    limit = min(len(stereo) // 2, round(.18 * RATE))
    weights = [cosine_rise(2 * i / (width - 1)) if i <= (width - 1) / 2
               else cosine_rise(2 * (width - 1 - i) / (width - 1)) for i in range(width)]
    total = 0
    for freq in frequencies:
        coefficient = 2 * math.cos(TAU * freq / RATE)
        for begin in range(0, limit - width + 1, width // 2):
            a, b = 0.0, 0.0
            for i, window in enumerate(weights):
                position = 2 * (begin+i)
                sample = .5 * (stereo[position] + stereo[position+1]) * window
                a, b = sample + coefficient*a - b, a
            total += max(0.0, a*a + b*b - coefficient*a*b)
    return total


def peak_4x(ffmpeg, pcm):
    response = subprocess.run([
        ffmpeg, '-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', str(RATE),
        '-ac', '2', '-i', 'pipe:0', '-af', 'aresample=192000', '-c:a', 'pcm_f32le',
        '-f', 'f32le', 'pipe:1'], input=pcm_bytes(pcm), stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True)
    values = array('f')
    values.frombytes(response.stdout)
    if sys.byteorder != 'little':
        values.byteswap()
    return max(abs(v) for v in values)


def bed_gain(sample, cue_sample, cue_length, gain):
    if sample < cue_sample:
        weight = cosine_rise((sample - (cue_sample-LEAD)) / LEAD)
    elif sample < cue_sample + cue_length + HOLD:
        weight = 1
    else:
        weight = 1 - cosine_rise((sample-(cue_sample+cue_length+HOLD)) / RELEASE)
    return 1 - weight * (1 - gain)


def prepare_event(event, source, ffmpeg):
    name = event['tone']
    require(name in TONES, f'Unknown tone {name}')
    frame = event['frame']
    require(isinstance(frame, int) and frame >= 0, 'Cue frame must be a nonnegative integer')
    target = frame * PER_FRAME
    tone = TONES[name]
    unit = make_tone(tone)
    length = len(unit) // CHANNELS
    start, end = target - LEAD, target + length + HOLD + RELEASE
    require(start >= 0 and end*2 <= len(source), f'{name} exceeds the soundtrack')
    dry = array('d', (v / 32768 for v in source[target*2:(target+length)*2]))
    frequencies = tuple(dict.fromkeys(hz(n.midi) for n in tone.notes))
    dry_energy = band_power(dry, frequencies)
    tone_energy = band_power(unit, frequencies)
    gain = 10 ** (-tone.duck_db/20)

    # Aim for at least +6 dB in the cue's own pitch bands, bounded by a
    # moderate absolute peak so a sparse section never receives a loud chime.
    match_gain = (10**(.30)) * gain * math.sqrt(dry_energy / max(tone_energy, 1e-16))
    level = max(tone.base_peak, min(tone.max_peak, match_gain))
    fx = array('d', (v * level for v in unit))
    for bed, cue in zip(dry, fx):
        if abs(bed) > .0001:
            gain = min(gain, (math.copysign(CEILING, bed)-cue) / bed)
    require(gain > .63, f'{name} would require excessive music attenuation')

    def overlay(bed_level):
        block = array('h')
        for sample in range(start, end):
            gain_here = bed_gain(sample, target, length, bed_level)
            relative = sample-target
            for ch in (0, 1):
                addition = fx[2*relative+ch] * 32768 if 0 <= relative < length else 0
                value = round(source[2*sample+ch] * gain_here + addition)
                require(-32768 <= value <= 32767, f'{name} introduced a clipped sample')
                block.append(value)
        return block

    # Brief music-only ramps surround each alert, preserving the original PCM
    # elsewhere. Keep oversampled headroom for subsequent AAC encoding.
    block = overlay(gain)
    center = block[2*LEAD:2*(LEAD+length)]
    oversampled = peak_4x(ffmpeg, center)
    for _ in range(3):
        if oversampled <= 10**(-.55/20):
            break
        gain *= .968
        block = overlay(gain)
        center = block[2*LEAD:2*(LEAD+length)]
        oversampled = peak_4x(ffmpeg, center)
    require(oversampled <= 10**(-.45/20), f'{name} lacks resampled peak headroom')
    return dict(event=event, start=start, end=end, target=target, length=length,
                gain=gain, level=level, fx=fx, frequencies=frequencies,
                block=block, activeTruePeak=oversampled)


def verify_event(plan, original, mastered):
    target, start, length = plan['target'], plan['start'], plan['length']
    gain = plan['gain']
    first_cue = None
    worst_error = 0
    recovered = array('d')
    bed = array('d')
    for sample in range(start, plan['end']):
        relative = sample-target
        duck = bed_gain(sample, target, length, gain)
        for channel in (0, 1):
            position = 2*sample+channel
            dry_value = round(original[position] * duck)
            measured = mastered[position] - dry_value
            expected = round(32768 * plan['fx'][relative*2+channel]) if 0 <= relative < length else 0
            worst_error = max(worst_error, abs(measured-expected))
            if first_cue is None and abs(measured) >= 2:
                first_cue = sample
            if 0 <= relative < length:
                recovered.append(measured / 32768)
                bed.append(dry_value / 32768)
            else:
                require(measured == 0, 'Sound effect leaked outside its scheduled note window')
    require(worst_error <= 1, 'Encoded PCM residual differs from the designed tone')
    require(first_cue is not None and 0 <= first_cue-target < 24,
            'Measured attack differs from target by more than 0.5 ms')
    ratio = math.sqrt(band_power(recovered, plan['frequencies']) /
                      max(1e-18, band_power(bed, plan['frequencies'])))
    require(ratio > 1, f"{plan['event']['id']}: tone is masked at its target pitches")
    core = mastered[target*2:(target+length)*2]
    return {
        **plan['event'], 'targetSample': target, 'targetSeconds': target/RATE,
        'measuredFirstCueSample': first_cue, 'attackLatencySamples': first_cue-target,
        'measuredFrame': first_cue//PER_FRAME, 'sampleAlignedEnvelope': True,
        'toneSeconds': length/RATE, 'pitchHz': [round(f,2) for f in plan['frequencies']],
        'duckDb': round(-db(gain), 3), 'tonePeakDbfs': db(plan['level']),
        'activeMixSamplePeakDbfs': db(max(abs(v) for v in core)/32768),
        'activeMix4xPeakDbfs': db(plan['activeTruePeak']),
        'toneVsBedPitchBandDb': db(ratio), 'residualErrorMaxPcmSteps': worst_error,
        'affectedSampleRange': [start, plan['end']],
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cues', type=Path, default=ROOT/'analysis/progress-cues.json')
    ap.add_argument('--source', type=Path, default=ROOT/'assets/soundtrack.wav')
    ap.add_argument('--ending', type=Path, default=ROOT/'analysis/ending.json')
    ap.add_argument('--output', type=Path, default=ROOT/'assets/film-mix.wav')
    ap.add_argument('--report', type=Path, default=ROOT/'analysis/mix-review.json')
    ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG_PATH'))
    args = ap.parse_args()
    ffmpeg = args.ffmpeg or str(ROOT/'node_modules/ffmpeg-static'/('ffmpeg.exe' if os.name=='nt' else 'ffmpeg'))
    if not Path(ffmpeg).is_file():
        ffmpeg = shutil.which('ffmpeg') or ffmpeg
    sheet = json.loads(args.cues.read_text(encoding='utf8'))
    edit = json.loads(args.ending.read_text(encoding='utf8'))
    require(sheet.get('fps', FPS) == FPS, 'The cue sheet must use 30 fps')
    events = sorted(sheet['events'], key=lambda event: event['frame'])
    require(all(e['tone'] in TONES for e in events), 'Unknown confirmation tone')
    require(args.source.resolve() != args.output.resolve(), 'Use a separate output for the mix')
    dry = read_pcm(args.source)
    require(len(dry) == 2 * round(edit['duration'] * RATE), 'Music length must match the cut in ending.json')
    mixed = array('h', dry)
    plans = []
    previous_end = 0
    for event in events:
        plan = prepare_event(event, dry, ffmpeg)
        require(plan['start'] >= previous_end, 'The cue ranges overlap')
        mixed[plan['start']*2:plan['end']*2] = plan['block']
        previous_end = plan['end']
        plans.append(plan)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(args.output.name+'.writing')
    write_pcm(temporary, mixed)
    actual = read_pcm(temporary)
    require(len(actual)==len(dry), 'Master length differs from the original soundtrack')
    cursor = 0
    outside_samples = 0
    reviews = []
    for plan in plans:
        next_start = plan['start']*2
        require(actual[cursor:next_start] == dry[cursor:next_start],
                'Original PCM changed outside a cue window')
        outside_samples += next_start-cursor
        reviews.append(verify_event(plan, dry, actual))
        cursor = plan['end']*2
    require(actual[cursor:] == dry[cursor:], 'Original PCM changed after the last cue')
    outside_samples += len(dry)-cursor
    outro = round(edit['lockTime'] * RATE)
    require(actual[2*outro:] == dry[2*outro:], 'Natural outro changed')
    input_rails = dry.count(32767) + dry.count(-32768)
    output_rails = actual.count(32767) + actual.count(-32768)
    added_rails = sum(a in (-32768,32767) and a != b for a,b in zip(actual,dry))
    require(added_rails == 0, 'New full-scale samples were introduced')
    report = {
        'status':'PASS', 'sampleRate':RATE, 'channels':CHANNELS,
        'sampleFrames':len(actual)//2, 'duration':len(actual)/(2*RATE),
        'fps':FPS, 'samplesPerVideoFrame':PER_FRAME, 'sourceSpeed':edit.get('sourceSpeed',1),
        'sourceFile':args.source.name, 'masterFile':args.output.name,
        'sourceSha256':sha_file(args.source), 'masterSha256':sha_file(temporary),
        'cueSheetSha256':sha_file(args.cues), 'events':reviews,
        'outsideCueWindowsPcmIdentical':True,'outsideComparedChannelSamples':outside_samples,
        'naturalOutroPcmIdentical':True,'naturalOutroFromSample':outro,
        'naturalOutroFromSeconds':outro/RATE,
        'fullMasterSamplePeakDbfs':db(max(abs(min(actual)),abs(max(actual)))/32768),
        'inputFullScaleSamples':input_rails,'masterFullScaleSamples':output_rails,
        'newFullScaleSamples':added_rails,
        'measurements':'Target samples are frame × 1600. Attack detection uses actual output minus the gain-shaped source. Pitch-band ratios compare Hann-window energy at the cue pitches. Oversampled peak measurements use FFmpeg at 192 kHz.',
    }
    temporary.replace(args.output)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    report_tmp = args.report.with_name(args.report.name+'.writing')
    report_tmp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    report_tmp.replace(args.report)
    print(json.dumps({'status':report['status'],'masterSha256':report['masterSha256'],
        'sourceFrames':report['sampleFrames'],'outsideCueWindowsPcmIdentical':True,
        'naturalOutroPcmIdentical':True,'newFullScaleSamples':added_rails,
        'cues':[{'id':r['id'],'frame':r['frame'],'sample':r['targetSample'],
                 'firstSampleDelta':r['attackLatencySamples'],'duckDb':r['duckDb'],
                 'pitchBandDb':r['toneVsBedPitchBandDb'],'peak4xDb':r['activeMix4xPeakDbfs']}
                 for r in reviews]},ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
