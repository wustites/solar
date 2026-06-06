import asyncio
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "audio-sync.json"

# 每种语言的句子到段落映射
# 有些段落可能对应多个句子
SEGMENT_MAPPING = {
    "en": {
        "Sun": [0, 1],      # 句子1-2
        "Mercury": [2],      # 句子3
        "Venus": [3],        # 句子4
        "Earth": [4],        # 句子5
        "Mars": [5],         # 句子6
        "Jupiter": [6],      # 句子7
        "Saturn": [7],       # 句子8
        "Uranus": [8],       # 句子9
        "Neptune": [9],      # 句子10
        "Finale": [10]       # 句子11
    },
    "zh": {
        "Sun": [0, 1, 2],    # 从太阳开始 + 太阳是我们的恒星 + 它是一颗...
        "Mercury": [3, 4],    # 最靠近太阳的是水星 + 它是最小的行星
        "Venus": [5, 6],      # 接着是金星 + 它在我们的天空中
        "Earth": [7, 8],      # 然后是地球 + 我们的蓝色家园
        "Mars": [9, 10],      # 地球之外是火星 + 红色的火星
        "Jupiter": [11, 12],  # 再往外是木星 + 它是最大的行星
        "Saturn": [13, 14],   # 随后出现的是土星 + 它以宽阔的
        "Uranus": [15, 16],   # 接下来是天王星 + 这颗寒冷的
        "Neptune": [17, 18],  # 在主要行星的边缘 + 它深蓝而多风
        "Finale": [19, 20]    # 它们共同组成 + 一颗恒星
    },
    "ja": {
        "Sun": [0, 1, 2],    # 太陽から + 太陽は私たちの + その重力が
        "Mercury": [3, 4],    # 太陽に最も近い + 最も小さな惑星
        "Venus": [5, 6],      # 次は金星 + 空で明るく
        "Earth": [7, 8],      # そして地球 + 私たちの青い故郷
        "Mars": [9, 10],      # 地球の外に + 赤い惑星
        "Jupiter": [11, 12],  # さらに遠くに + 太陽系最大の
        "Saturn": [13, 14],   # そして土星が + 金色の巨大
        "Uranus": [15, 16],   # 次は天王星 + 冷たい青緑色
        "Neptune": [17, 18],  # 主要な惑星の + 遠く深い
        "Finale": [19, 20]    # これらが一緒に + 一つの恒星
    },
    "ko": {
        "Sun": [0, 1, 2],    # 태양에서부터 + 태양은 우리의 + 그 중력이
        "Mercury": [3, 4],    # 태양에 가장 가까운 + 가장 작은 행성
        "Venus": [5, 6],      # 다음은 금성입니다 + 하늘에서 밝게
        "Earth": [7, 8],      # 그리고 지구입니다 + 우리의 푸른 집
        "Mars": [9, 10],      # 지구 너머에는 + 붉은 행성
        "Jupiter": [11, 12],  # 더 먼 곳에는 + 가장 큰 행성
        "Saturn": [13, 14],   # 그 다음은 + 넓은 얼음 고리
        "Uranus": [15, 16],   # 다음은 왕성입니다 + 차가운 청록색
        "Neptune": [17, 18],  # 주요 행성의 + 멀리 있는
        "Finale": [19, 20]    # 그것들이 함께 + 하나의 별
    }
}


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


async def analyze_edge_tts_timing(text: str, voice: str, rate: str) -> Dict[str, Any]:
    """使用Edge TTS分析文本的时间信息"""
    import aiohttp.connector
    import aiohttp.resolver
    import edge_tts

    aiohttp.resolver.DefaultResolver = aiohttp.resolver.ThreadedResolver
    aiohttp.connector.DefaultResolver = aiohttp.resolver.ThreadedResolver

    communicate = edge_tts.Communicate(
        text,
        voice=voice,
        rate=rate,
        boundary="SentenceBoundary"
    )

    timing_data = []
    audio_chunks = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
        elif chunk["type"] in ["WordBoundary", "SentenceBoundary"]:
            timing_data.append({
                "type": chunk["type"],
                "offset": chunk["offset"] / 10_000_000,
                "duration": chunk["duration"] / 10_000_000,
                "text": chunk["text"]
            })

    total_duration = 0
    if timing_data:
        last_item = timing_data[-1]
        total_duration = last_item["offset"] + last_item["duration"]

    return {
        "timing": timing_data,
        "total_duration": total_duration,
        "audio_chunks": audio_chunks
    }


def calculate_segment_times(timing_data: List[Dict], segment_mapping: Dict, fps: int = 30) -> Dict[str, Dict[str, int]]:
    """根据句子时间计算段落时间"""
    segments = {}
    
    for segment_name, sentence_indices in segment_mapping.items():
        # 获取该段落对应的所有句子
        sentences = [timing_data[i] for i in sentence_indices if i < len(timing_data)]
        
        if not sentences:
            continue
        
        # 段落开始时间 = 第一个句子的开始时间
        start_sec = sentences[0]["offset"]
        # 段落结束时间 = 最后一个句子的结束时间
        last_sentence = sentences[-1]
        end_sec = last_sentence["offset"] + last_sentence["duration"]
        
        segments[segment_name] = {
            "start": round(start_sec * fps),
            "end": round(end_sec * fps)
        }
    
    return segments


async def analyze_language(language: str, voice: str, rate: str, fps: int = 30) -> Dict[str, Any]:
    """分析特定语言的音频文件"""
    text_path = ROOT / "public" / "voiceover" / f"narration.{language}.txt"
    audio_path = ROOT / "public" / "voiceover" / f"solar-system-{language}.mp3"
    
    if not text_path.exists():
        print(f"Text file not found: {text_path}")
        return {}
    
    text = text_path.read_text(encoding="utf-8")
    print(f"Analyzing {language}...")
    print(f"Text length: {len(text)} characters")
    
    tts_result = await analyze_edge_tts_timing(text, voice, rate)
    
    print(f"Edge TTS duration: {tts_result['total_duration']:.2f} seconds")
    print(f"Found {len(tts_result['timing'])} sentences")
    
    # 显示句子
    for i, item in enumerate(tts_result['timing']):
        try:
            text_preview = item['text'][:60]
            print(f"  {i}: [{item['offset']:.2f}s] {text_preview}...")
        except UnicodeEncodeError:
            print(f"  {i}: [{item['offset']:.2f}s] (text contains non-ASCII characters)")
    
    # 获取段落映射
    mapping = SEGMENT_MAPPING.get(language, SEGMENT_MAPPING["en"])
    
    # 计算段落时间
    segments = calculate_segment_times(tts_result['timing'], mapping, fps)
    
    # 获取实际音频时长
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


def load_config() -> Dict[str, Any]:
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
    config["lastUpdated"] = datetime.now().isoformat()
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"Configuration saved to {CONFIG_PATH}")


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync audio timing with text segments")
    parser.add_argument("--language", action="append", choices=["en", "zh", "ja", "ko"],
                       help="Language to analyze. Repeat for multiple. Defaults to all.")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second")
    
    args = parser.parse_args()
    
    languages = args.language or ["en", "zh", "ja", "ko"]
    fps = args.fps
    
    config = load_config()
    config["fps"] = fps
    
    voice_config = {
        "en": {"voice": "en-US-AriaNeural", "rate": "-4%"},
        "zh": {"voice": "zh-CN-XiaoxiaoNeural", "rate": "-4%"},
        "ja": {"voice": "ja-JP-NanamiNeural", "rate": "-4%"},
        "ko": {"voice": "ko-KR-SunHiNeural", "rate": "-4%"}
    }
    
    for lang in languages:
        lang_config = await analyze_language(
            lang,
            voice_config[lang]["voice"],
            voice_config[lang]["rate"],
            fps
        )
        if lang_config:
            config["languages"][lang] = lang_config
        print()
    
    save_config(config)
    
    print("\n=== Audio Sync Summary ===")
    for lang, lang_config in config["languages"].items():
        print(f"\n{lang}: {lang_config['durationSeconds']:.2f}s ({lang_config['durationFrames']} frames)")
        for seg_name, seg_times in lang_config["segments"].items():
            start_sec = seg_times['start'] / fps
            end_sec = seg_times['end'] / fps
            print(f"  {seg_name}: {seg_times['start']}-{seg_times['end']} ({start_sec:.2f}s-{end_sec:.2f}s)")


if __name__ == "__main__":
    asyncio.run(main())