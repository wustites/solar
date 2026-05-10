import asyncio
from pathlib import Path

import aiohttp.connector
import aiohttp.resolver
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICEOVER_DIR = ROOT / "public" / "voiceover"
TEXT_PATH = VOICEOVER_DIR / "narration.txt"
MEDIA_PATH = VOICEOVER_DIR / "solar-system-introduction.mp3"


async def main() -> None:
    # On some Windows setups, aiodns/pycares cannot reach the configured DNS server.
    # Edge TTS uses aiohttp internally, so force aiohttp through the system resolver.
    aiohttp.resolver.DefaultResolver = aiohttp.resolver.ThreadedResolver
    aiohttp.connector.DefaultResolver = aiohttp.resolver.ThreadedResolver

    text = TEXT_PATH.read_text(encoding="utf-8")
    communicate = edge_tts.Communicate(text, voice="en-US-AriaNeural", rate="-4%")

    VOICEOVER_DIR.mkdir(parents=True, exist_ok=True)
    with MEDIA_PATH.open("wb") as audio:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])


if __name__ == "__main__":
    asyncio.run(main())
