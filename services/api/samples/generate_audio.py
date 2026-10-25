import os
import subprocess
import wave
from pathlib import Path

# Paths
SAMPLES_DIR = Path(__file__).resolve().parent
AUDIO_DIR = SAMPLES_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Dialogue 1: Core Benchmark (5 traps)
DIALOGUE_1 = [
    ("Daniel", "Good morning Elena! Daniel here. Thanks for jumping on the project sync."),
    ("Samantha", "Morning Daniel! Elena here. Let's run through the action items for the audio release."),
    ("Daniel", "Great. First, we could rewrite the entire audio streaming pipeline in Rust to maximize throughput. What do you think?"),
    ("Samantha", "That's overkill for our current volume. Let's stick with Python FastAPI for now. We won't do the Rust rewrite."),
    ("Samantha", "On the frontend side, can you build the interactive waveform audio player with timestamp jumping?"),
    ("Daniel", "Yes, I will take that on. I'll build the waveform and the scrub bar."),
    ("Samantha", "Can you deliver the waveform player by Tuesday at 10 AM?"),
    ("Daniel", "I have a dentist appointment on Tuesday morning. Let's make the deadline Wednesday at 3 PM instead."),
    ("Samantha", "Wednesday at 3 PM works for me. Let's lock that in."),
    ("Samantha", "I'll handle preparing the investor update slides tonight so we have them ready."),
    ("Daniel", "Sounds good, thanks Elena."),
    ("Daniel", "Also, someone needs to configure the MinIO CORS policy and range request headers so audio scrubbing works properly in the browser."),
    ("Samantha", "Agreed, that is critical. Nobody is assigned to that yet, so let's leave it unassigned for now and pick it up tomorrow."),
    ("Samantha", "Quick question: do we already have the production API keys for the Whisper transcription provider?"),
    ("Daniel", "I'm honestly not sure, we will need to ask DevOps about that."),
    ("Samantha", "Oh, before we wrap up: I just got a notification that the investor meeting was pushed to next month. So scratch the investor deck—I won't do the slides anymore."),
    ("Daniel", "Got it, slides are cancelled."),
    ("Samantha", "Awesome, let's get to work. Talk soon Daniel!"),
    ("Daniel", "Talk soon Elena, bye!"),
]

# Dialogue 2: Agreement Variant (Rust rewrite is accepted)
DIALOGUE_2 = [
    ("Daniel", "Good morning Elena! Daniel here. Thanks for jumping on the project sync."),
    ("Samantha", "Morning Daniel! Elena here. Let's run through the action items for the audio release."),
    ("Daniel", "Great. First, we could rewrite the entire audio streaming pipeline in Rust to maximize throughput. What do you think?"),
    ("Samantha", "You know what, I checked our benchmarks this morning and you are completely right. Let's do the Rust rewrite! Can you take that on?"),
    ("Daniel", "Awesome! Yes, I will take on the Rust rewrite."),
    ("Samantha", "On the frontend side, can you also build the interactive waveform audio player with timestamp jumping?"),
    ("Daniel", "Yes, I will take that on too. I'll build the waveform and the scrub bar."),
    ("Samantha", "Can you deliver the waveform player by Tuesday at 10 AM?"),
    ("Daniel", "I have a dentist appointment on Tuesday morning. Let's make the deadline Wednesday at 3 PM instead."),
    ("Samantha", "Wednesday at 3 PM works for me. Let's lock that in."),
    ("Samantha", "I'll handle preparing the investor update slides tonight so we have them ready."),
    ("Daniel", "Sounds good, thanks Elena."),
    ("Daniel", "Also, someone needs to configure the MinIO CORS policy and range request headers so audio scrubbing works properly in the browser."),
    ("Samantha", "Agreed, that is critical. Nobody is assigned to that yet, so let's leave it unassigned for now and pick it up tomorrow."),
    ("Samantha", "Quick question: do we already have the production API keys for the Whisper transcription provider?"),
    ("Daniel", "I'm honestly not sure, we will need to ask DevOps about that."),
    ("Samantha", "Oh, before we wrap up: I just got a notification that the investor meeting was pushed to next month. So scratch the investor deck—I won't do the slides anymore."),
    ("Daniel", "Got it, slides are cancelled."),
    ("Samantha", "Awesome, let's get to work. Talk soon Daniel!"),
    ("Daniel", "Talk soon Elena, bye!"),
]

# Dialogue 3: Inconclusive Dialogue (Exploratory brainstorming without commitments)
DIALOGUE_3 = [
    ("Daniel", "Hey Elena, Daniel here. We need to figure out our Q3 roadmap."),
    ("Samantha", "Hi Daniel, Elena here. Honestly, leadership hasn't given us budget clarity yet."),
    ("Daniel", "Right. Maybe we could look into adding WebSockets for live collaborative editing? Or maybe mobile apps?"),
    ("Samantha", "I don't know, WebSockets might be too complex, and mobile apps are expensive. Let's definitely not commit to either of those today."),
    ("Daniel", "What about redesigning the onboarding flow?"),
    ("Samantha", "Let's put that on ice until we see next month's retention metrics. We really shouldn't make any decisions right now."),
    ("Daniel", "Fair enough. So we're just waiting on management's budget announcement before agreeing on any action items?"),
    ("Samantha", "Exactly. No tasks or deadlines today. Let's reconvene next week."),
]


def create_silence_chunk(duration_sec: float, output_path: Path, sample_rate: int = 44100):
    """Creates a short silent WAV chunk."""
    num_frames = int(duration_sec * sample_rate)
    with wave.open(str(output_path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00" * (num_frames * 2))


def generate_conversation_audio(dialogue, output_wav: Path):
    """Generates a multi-speaker audio WAV using macOS 'say' and merges into output_wav."""
    print(f"Generating {output_wav.name}...")
    temp_dir = SAMPLES_DIR / "temp_audio"
    temp_dir.mkdir(exist_ok=True)

    wav_chunks = []
    silence_path = temp_dir / "silence.wav"
    create_silence_chunk(0.6, silence_path)

    for idx, (voice, text) in enumerate(dialogue):
        aiff_path = temp_dir / f"chunk_{idx}.aiff"
        chunk_wav = temp_dir / f"chunk_{idx}.wav"

        # 1. Use macOS 'say' command to synthesize voice
        cmd_say = ["say", "-v", voice, text, "-o", str(aiff_path)]
        subprocess.run(cmd_say, check=True)

        # 2. Convert to standard 16-bit 44.1kHz mono WAV
        cmd_convert = ["afconvert", "-f", "WAVE", "-d", "LEI16@44100", "-c", "1", str(aiff_path), str(chunk_wav)]
        subprocess.run(cmd_convert, check=True)

        wav_chunks.append(chunk_wav)
        wav_chunks.append(silence_path)

    # 3. Concatenate all WAV chunks into final audio file
    with wave.open(str(output_wav), "wb") as outfile:
        outfile.setnchannels(1)
        outfile.setsampwidth(2)
        outfile.setframerate(44100)

        for chunk_file in wav_chunks:
            with wave.open(str(chunk_file), "rb") as infile:
                outfile.writeframes(infile.readframes(infile.getnframes()))

    # Clean up temporary files
    for p in temp_dir.glob("*"):
        p.unlink()
    temp_dir.rmdir()

    duration_sec = output_wav.stat().st_size / (44100 * 2)
    print(f"✅ Generated {output_wav.name} ({duration_sec:.1f}s, {output_wav.stat().st_size / 1024:.1f} KB)")


def main():
    generate_conversation_audio(DIALOGUE_1, AUDIO_DIR / "conversation_01_core.wav")
    generate_conversation_audio(DIALOGUE_2, AUDIO_DIR / "conversation_02_variant.wav")
    generate_conversation_audio(DIALOGUE_3, AUDIO_DIR / "conversation_03_ambiguous.wav")
    print("\nAll 3 benchmark audio files successfully generated in samples/audio/!")


if __name__ == "__main__":
    main()
