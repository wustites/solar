import argparse
import asyncio
import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT / "voiceover.config.json"


def load_config(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def selected_provider(config: dict[str, Any], cli_provider: str | None) -> str:
    provider = cli_provider or os.getenv("TTS_PROVIDER") or config.get("provider")
    if provider not in config["providers"]:
        known = ", ".join(sorted(config["providers"]))
        raise ValueError(f"Unknown TTS provider '{provider}'. Expected one of: {known}")
    return provider


def get_api_key(provider_config: dict[str, Any]) -> str:
    env_name = provider_config.get("apiKeyEnv", "GOOGLE_TTS_API_KEY")
    if api_key := os.getenv(env_name):
        return api_key.strip()

    key_file = ROOT / provider_config.get("apiKeyFile", "google-tts.key")
    if not key_file.exists():
        raise FileNotFoundError(
            f"GCP TTS needs an API key. Set {env_name} or create {key_file}."
        )

    return key_file.read_text(encoding="utf-8").strip()


def read_voiceover_text(voiceover_dir: Path, language: str) -> str:
    text_path = voiceover_dir / f"narration.{language}.txt"
    return text_path.read_text(encoding="utf-8")


async def generate_edge_tts(
    language: str,
    provider_config: dict[str, Any],
    voiceover_dir: Path,
) -> None:
    import aiohttp.connector
    import aiohttp.resolver
    import edge_tts

    # On some Windows setups, aiodns/pycares cannot reach the configured DNS server.
    # Edge TTS uses aiohttp internally, so force aiohttp through the system resolver.
    aiohttp.resolver.DefaultResolver = aiohttp.resolver.ThreadedResolver
    aiohttp.connector.DefaultResolver = aiohttp.resolver.ThreadedResolver

    voice_config = provider_config["voices"][language]
    text = read_voiceover_text(voiceover_dir, language)
    media_path = voiceover_dir / f"solar-system-{language}.mp3"
    communicate = edge_tts.Communicate(
        text,
        voice=voice_config["voice"],
        rate=voice_config.get("rate", "+0%"),
    )

    with media_path.open("wb") as audio:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])


def generate_gcp_tts(
    language: str,
    provider_config: dict[str, Any],
    voiceover_dir: Path,
) -> None:
    api_key = get_api_key(provider_config)
    voice_config = provider_config["voices"][language]
    text = read_voiceover_text(voiceover_dir, language)
    media_path = voiceover_dir / f"solar-system-{language}.mp3"

    payload = {
        "input": {"text": text},
        "voice": {
            "languageCode": voice_config["languageCode"],
            "name": voice_config["voice"],
        },
        "audioConfig": {
            "audioEncoding": provider_config.get("audioEncoding", "MP3"),
        },
    }

    request = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize?"
        + urllib.parse.urlencode({"key": api_key}),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GCP TTS request failed for {language}: {detail}") from error

    media_path.write_bytes(base64.b64decode(result["audioContent"]))


async def generate_language(
    provider: str,
    language: str,
    provider_config: dict[str, Any],
    voiceover_dir: Path,
) -> None:
    if provider == "edge-tts":
        await generate_edge_tts(language, provider_config, voiceover_dir)
        return

    if provider == "gcp":
        await asyncio.to_thread(generate_gcp_tts, language, provider_config, voiceover_dir)
        return

    raise ValueError(f"Unsupported provider: {provider}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate localized voiceover MP3 files.")
    parser.add_argument(
        "--config",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to voiceover JSON config.",
    )
    parser.add_argument(
        "--provider",
        choices=("edge-tts", "gcp"),
        help="TTS provider override. Defaults to TTS_PROVIDER or config provider.",
    )
    parser.add_argument(
        "--language",
        action="append",
        choices=("en", "zh", "ja", "ko"),
        help="Language to generate. Repeat to generate multiple. Defaults to all configured languages.",
    )
    args = parser.parse_args()

    config = load_config(Path(args.config))
    provider = selected_provider(config, args.provider)
    provider_config = config["providers"][provider]
    languages = args.language or config.get("languages", ["en", "zh", "ja", "ko"])
    voiceover_dir = ROOT / config.get("voiceoverDir", "public/voiceover")
    voiceover_dir.mkdir(parents=True, exist_ok=True)

    for language in languages:
        await generate_language(provider, language, provider_config, voiceover_dir)
        print(f"Generated {language} with {provider}")


if __name__ == "__main__":
    asyncio.run(main())
