import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any

ROOT = Path(__file__).resolve().parents[1]


async def analyze_edge_tts_timing(text: str, voice: str = "en-US-AriaNeural", rate: str = "-4%") -> List[Dict[str, Any]]:
    """使用Edge TTS分析文本的时间信息"""
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
        boundary="SentenceBoundary"  # 获取句子边界
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


async def analyze_narration_file(language: str, voice: str, rate: str) -> Dict[str, Any]:
    """分析narration文件的时间信息"""
    text_path = ROOT / "public" / "voiceover" / f"narration.{language}.txt"
    
    if not text_path.exists():
        print(f"Text file not found: {text_path}")
        return {}
    
    text = text_path.read_text(encoding="utf-8")
    print(f"Analyzing {language} narration...")
    print(f"Text length: {len(text)} characters")
    
    result = await analyze_edge_tts_timing(text, voice, rate)
    
    print(f"Total duration: {result['total_duration']:.2f} seconds")
    print(f"Found {len(result['timing'])} boundary markers")
    
    # 显示时间信息
    for i, item in enumerate(result['timing']):
        print(f"  {i+1}. [{item['offset']:.2f}s - {item['offset'] + item['duration']:.2f}s] {item['type']}: {item['text'][:50]}...")
    
    return result


async def main():
    # 测试英文
    print("=== English Analysis ===")
    en_result = await analyze_narration_file(
        "en",
        "en-US-AriaNeural",
        "-4%"
    )
    
    print("\n=== Chinese Analysis ===")
    zh_result = await analyze_narration_file(
        "zh",
        "zh-CN-XiaoxiaoNeural",
        "-4%"
    )
    
    # 保存结果
    output_path = ROOT / "edge_tts_timing.json"
    output_data = {
        "en": {
            "voice": "en-US-AriaNeural",
            "rate": "-4%",
            "total_duration": en_result.get("total_duration", 0),
            "timing": en_result.get("timing", [])
        },
        "zh": {
            "voice": "zh-CN-XiaoxiaoNeural",
            "rate": "-4%",
            "total_duration": zh_result.get("total_duration", 0),
            "timing": zh_result.get("timing", [])
        }
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nTiming data saved to {output_path}")


if __name__ == "__main__":
    asyncio.run(main())