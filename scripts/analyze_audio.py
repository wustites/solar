import subprocess
import json
import re
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parents[1]


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
    
    # 解析ffmpeg输出
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


def calculate_segment_times(silence_periods: List[Tuple[float, float]], total_duration: float, fps: int = 30) -> dict:
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
        # 如果边界点不足，均匀分配
        step = total_duration / len(segment_names)
        all_boundaries = [i * step for i in range(len(segment_names) + 1)]
    
    for i, name in enumerate(segment_names):
        start_sec = all_boundaries[i]
        end_sec = all_boundaries[i + 1]
        start_frame = round(start_sec * fps)
        end_frame = round(end_sec * fps)
        segments[name] = [start_frame, end_frame]
    
    return segments


def analyze_language(language: str, fps: int = 30) -> dict:
    """分析特定语言的音频文件"""
    audio_path = ROOT / "public" / "voiceover" / f"solar-system-{language}.mp3"
    
    if not audio_path.exists():
        print(f"Audio file not found: {audio_path}")
        return {}
    
    print(f"Analyzing {language} audio...")
    duration = get_audio_duration(audio_path)
    print(f"Duration: {duration:.2f} seconds")
    
    silence_periods = detect_silence(audio_path)
    print(f"Found {len(silence_periods)} silence periods")
    
    # 显示较长的静音部分（句子间隔）
    sentence_pauses = [s for s in silence_periods if s[1] - s[0] > 0.8]
    print(f"Found {len(sentence_pauses)} sentence pauses (>0.8s)")
    for i, (start, end) in enumerate(sentence_pauses):
        print(f"  {i+1}. {start:.2f}s - {end:.2f}s ({end-start:.2f}s)")
    
    segments = calculate_segment_times(silence_periods, duration, fps)
    
    return {
        "duration_seconds": duration,
        "duration_frames": round(duration * fps),
        "silence_periods": silence_periods,
        "segments": segments
    }


def main():
    languages = ['en', 'zh', 'ja', 'ko']
    results = {}
    
    for lang in languages:
        results[lang] = analyze_language(lang)
        print()
    
    # 保存结果到JSON文件
    output_path = ROOT / "audio_analysis.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"Analysis saved to {output_path}")


if __name__ == "__main__":
    main()