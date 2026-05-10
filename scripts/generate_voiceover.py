import asyncio
from pathlib import Path

import aiohttp.connector
import aiohttp.resolver
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICEOVER_DIR = ROOT / "public" / "voiceover"

VOICEOVERS = {
    "en": {"voice": "en-US-AriaNeural", "rate": "-4%"},
    "zh": {"voice": "zh-CN-XiaoxiaoNeural", "rate": "-4%"},
    "ja": {"voice": "ja-JP-NanamiNeural", "rate": "-4%"},
    "ko": {"voice": "ko-KR-SunHiNeural", "rate": "-4%"},
}


async def generate(language: str, voice: str, rate: str) -> None:
    text_path = VOICEOVER_DIR / f"narration.{language}.txt"
    media_path = VOICEOVER_DIR / f"solar-system-{language}.mp3"
    text = text_path.read_text(encoding="utf-8")
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate)

    with media_path.open("wb") as audio:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])


async def main() -> None:
    # On some Windows setups, aiodns/pycares cannot reach the configured DNS server.
    # Edge TTS uses aiohttp internally, so force aiohttp through the system resolver.
    aiohttp.resolver.DefaultResolver = aiohttp.resolver.ThreadedResolver
    aiohttp.connector.DefaultResolver = aiohttp.resolver.ThreadedResolver

    VOICEOVER_DIR.mkdir(parents=True, exist_ok=True)
    for language, config in VOICEOVERS.items():
        await generate(language, config["voice"], config["rate"])


if __name__ == "__main__":
    asyncio.run(main())
