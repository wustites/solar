import asyncio
import json
import subprocess
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "audio-sync.json"


def get_audio_duration(audio_path: Path) -> float:
    """获取音频文件时长（秒）"""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        str(audio_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def detect_silence(audio_path: Path, min_duration: float = 0.3, noise_level: str = "-30dB") -> List[Tuple[float, float]]:
    """检测音频中的静音部分"""
    cmd = [
        "ffmpeg",
        "-i", str(audio_path),
        "-af", f"silencedetect=n={noise_level}:d={min_duration}",
        "-f", "null",
        "-"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    silence_periods = []
    current_start = None
    
    for line in result.stderr.split('\n'):
        if 'silence_start' in line:
            match = re.search(r'silence_start:\s*([\d.]+)', line)
            if match:
                current_start = float(match.group(1))
        elif 'silence_end' in line and current_start is not None:
            match = re.search(r'silence_end:\s*([\d.]+)', line)
            if match:
                end = float(match.group(1))
                silence_periods.append((current_start, end))
                current_start = None
    
    return silence_periods


def calculate_segment_times_from_silence(silence_periods: List[Tuple[float, float]], total_duration: float, fps: int = 30) -> Dict[str, Dict[str, int]]:
    """根据静音时间段计算文本段落时间"""
    # 过滤出较长的静音部分（句子间隔）
    sentence_pauses = [s for s in silence_periods if s[1] - s[0] > 0.8]
    
    # 静音开始时间作为句子结束点
    sentence_ends = [s[0] for s in sentence_pauses]
    
    # 添加开始和结束时间
    all_boundaries = [0] + sentence_ends + [total_duration]
    
    # 计算每个句子的时间范围
    segments = {}
    segment_names = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Finale']
    
    # 确保有足够的边界点
    if len(all_boundaries) < len(segment_names) + 1:
        print(f"Warning: Expected {len(segment_names) + 1} boundaries, got {len(all_boundaries)}")
        step = total_duration / len(segment_names)
        all_boundaries = [i * step for i in range(len(segment_names) + 1)]
    
    for i, name in enumerate(segment_names):
        start_sec = all_boundaries[i]
        end_sec = all_boundaries[i + 1]
        start_frame = round(start_sec * fps)
        end_frame = round(end_sec * fps)
        segments[name] = {
            "start": start_frame,
            "end": end_frame
        }
    
    return segments


async def analyze_edge_tts_timing(text: str, voice: str, rate: str, boundary: str = "SentenceBoundary") -> Dict[str, Any]:
    """使用Edge TTS分析文本的时间信息
    
    Args:
        text: 要分析的文本
        voice: 语音名称
        rate: 语速
        boundary: 边界类型 - "SentenceBoundary" 或 "WordBoundary"
    """
    import aiohttp.connector
    import aiohttp.resolver
    import edge_tts

    # Windows DNS resolver workaround
    aiohttp.resolver.DefaultResolver = aiohttp.resolver.ThreadedResolver
    aiohttp.connector.DefaultResolver = aiohttp.resolver.ThreadedResolver

    communicate = edge_tts.Communicate(
        text,
        voice=voice,
        rate=rate,
        boundary=boundary
    )

    timing_data = []
    audio_chunks = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
        elif chunk["type"] in ["WordBoundary", "SentenceBoundary"]:
            timing_data.append({
                "type": chunk["type"],
                "offset": chunk["offset"] / 10_000_000,  # 转换为秒
                "duration": chunk["duration"] / 10_000_000,  # 转换为秒
                "text": chunk["text"]
            })

    # 计算总时长
    total_duration = 0
    if timing_data:
        last_item = timing_data[-1]
        total_duration = last_item["offset"] + last_item["duration"]

    return {
        "timing": timing_data,
        "total_duration": total_duration,
        "audio_chunks": audio_chunks
    }


def calculate_segment_times_from_edge_tts(timing_data: List[Dict[str, Any]], fps: int = 30) -> Dict[str, Dict[str, int]]:
    """根据Edge TTS时间数据计算段落时间"""
    segment_names = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Finale']
    
    # 确保有足够的句子
    if len(timing_data) < len(segment_names):
        print(f"Warning: Expected {len(segment_names)} sentences, got {len(timing_data)}")
        return {}
    
    segments = {}
    for i, name in enumerate(segment_names):
        if i < len(timing_data):
            start_sec = timing_data[i]["offset"]
            end_sec = timing_data[i]["offset"] + timing_data[i]["duration"]
            start_frame = round(start_sec * fps)
            end_frame = round(end_sec * fps)
            segments[name] = {
                "start": start_frame,
                "end": end_frame
            }
    
    return segments


async def analyze_language_with_edge_tts(language: str, voice: str, rate: str, fps: int = 30, boundary: str = "SentenceBoundary") -> Dict[str, Any]:
    """使用Edge TTS分析特定语言的音频文件
    
    Args:
        language: 语言代码
        voice: 语音名称
        rate: 语速
        fps: 帧率
        boundary: 边界类型 - "SentenceBoundary" 或 "WordBoundary"
    """
    text_path = ROOT / "public" / "voiceover" / f"narration.{language}.txt"
    audio_path = ROOT / "public" / "voiceover" / f"solar-system-{language}.mp3"
    
    if not text_path.exists():
        print(f"Text file not found: {text_path}")
        return {}
    
    text = text_path.read_text(encoding="utf-8")
    print(f"Analyzing {language} with Edge TTS ({boundary})...")
    print(f"Text length: {len(text)} characters")
    
    # 使用Edge TTS分析时间
    tts_result = await analyze_edge_tts_timing(text, voice, rate, boundary)
    
    print(f"Edge TTS duration: {tts_result['total_duration']:.2f} seconds")
    print(f"Found {len(tts_result['timing'])} {boundary} markers")
    
    # 计算段落时间
    segments = calculate_segment_times_from_edge_tts(tts_result['timing'], fps)
    
    # 如果有实际音频文件，获取其时长
    actual_duration = None
    if audio_path.exists():
        actual_duration = get_audio_duration(audio_path)
        print(f"Actual audio duration: {actual_duration:.2f} seconds")
    
    return {
        "audioFile": f"voiceover/solar-system-{language}.mp3",
        "durationSeconds": actual_duration or tts_result['total_duration'],
        "durationFrames": round((actual_duration or tts_result['total_duration']) * fps),
        "edgeTTSDuration": tts_result['total_duration'],
        "segments": segments,
        "timing": tts_result['timing']
    }


async def analyze_language_with_silence_detection(language: str, fps: int = 30) -> Dict[str, Any]:
    """使用静音检测分析特定语言的音频文件"""
    audio_path = ROOT / "public" / "voiceover" / f"solar-system-{language}.mp3"
    
    if not audio_path.exists():
        print(f"Audio file not found: {audio_path}")
        return {}
    
    print(f"Analyzing {language} audio with silence detection...")
    duration = get_audio_duration(audio_path)
    print(f"Duration: {duration:.2f} seconds")
    
    silence_periods = detect_silence(audio_path)
    print(f"Found {len(silence_periods)} silence periods")
    
    segments = calculate_segment_times_from_silence(silence_periods, duration, fps)
    
    return {
        "audioFile": f"voiceover/solar-system-{language}.mp3",
        "durationSeconds": duration,
        "durationFrames": round(duration * fps),
        "segments": segments
    }


def load_config() -> Dict[str, Any]:
    """加载现有配置文件"""
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "version": "1.0",
        "lastUpdated": "",
        "fps": 30,
        "languages": {}
    }


def save_config(config: Dict[str, Any]) -> None:
    """保存配置文件"""
    config["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"Configuration saved to {CONFIG_PATH}")


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync audio timing with text segments")
    parser.add_argument("--method", choices=["edge-tts", "silence"], default="edge-tts",
                       help="Analysis method: edge-tts (recommended) or silence detection")
    parser.add_argument("--boundary", choices=["SentenceBoundary", "WordBoundary"], default="SentenceBoundary",
                       help="Edge TTS boundary type: SentenceBoundary (default) or WordBoundary (more detailed)")
    parser.add_argument("--language", action="append", choices=["en", "zh", "ja", "ko"],
                       help="Language to analyze. Repeat for multiple. Defaults to all.")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second")
    
    args = parser.parse_args()
    
    languages = args.language or ["en", "zh", "ja", "ko"]
    fps = args.fps
    boundary = args.boundary
    
    # 加载现有配置
    config = load_config()
    config["fps"] = fps
    config["boundary"] = boundary
    
    # 语音配置
    voice_config = {
        "en": {"voice": "en-US-AriaNeural", "rate": "-4%"},
        "zh": {"voice": "zh-CN-XiaoxiaoNeural", "rate": "-4%"},
        "ja": {"voice": "ja-JP-NanamiNeural", "rate": "-4%"},
        "ko": {"voice": "ko-KR-SunHiNeural", "rate": "-4%"}
    }
    
    # 分析每种语言
    for lang in languages:
        if args.method == "edge-tts":
            lang_config = await analyze_language_with_edge_tts(
                lang,
                voice_config[lang]["voice"],
                voice_config[lang]["rate"],
                fps,
                boundary
            )
        else:
            lang_config = await analyze_language_with_silence_detection(lang, fps)
        
        if lang_config:
            config["languages"][lang] = lang_config
        print()
    
    # 保存配置
    save_config(config)
    
    # 显示摘要
    print("\n=== Audio Sync Summary ===")
    print(f"Method: {args.method}")
    if args.method == "edge-tts":
        print(f"Boundary: {boundary}")
    print(f"FPS: {fps}")
    print()
    for lang, lang_config in config["languages"].items():
        print(f"{lang}: {lang_config['durationSeconds']:.2f}s ({lang_config['durationFrames']} frames)")
        for seg_name, seg_times in lang_config["segments"].items():
            print(f"  {seg_name}: {seg_times['start']}-{seg_times['end']}")


if __name__ == "__main__":
    asyncio.run(main())