export type Language = 'en' | 'zh' | 'ja' | 'ko';

export type NarrationSegment = {
  name: string;
  start: number;
  end: number;
  title: string;
  description: string;
};

export type NarrationLocale = {
  id: Language;
  compositionId: string;
  outputName: string;
  durationInFrames: number;
  languageLabel: string;
  heroTitle: string;
  heroKicker: string;
  audioFile: string;
  segments: NarrationSegment[];
};

export const fps = 30;

// 从audio-sync.json加载音频同步配置
import audioSyncConfig from '../audio-sync.json';

type SegmentConfig = {
  start: number;
  end: number;
};

type LanguageConfig = {
  audioFile: string;
  durationSeconds: number;
  durationFrames: number;
  segments: Record<string, SegmentConfig>;
};

type AudioSyncConfig = {
  version: string;
  lastUpdated: string;
  fps: number;
  languages: Record<Language, LanguageConfig>;
};

const config = audioSyncConfig as AudioSyncConfig;

const segment = (
  name: string,
  title: string,
  description: string,
  language: Language
): NarrationSegment => {
  const languageConfig = config.languages[language];
  const segmentConfig = languageConfig.segments[name];
  
  return {
    name,
    start: segmentConfig.start,
    end: segmentConfig.end,
    title,
    description
  };
};



export const locales: Record<Language, NarrationLocale> = {
  en: {
    id: 'en',
    compositionId: 'SolarSystemEN',
    outputName: 'solar-system-en.mp4',
    durationInFrames: config.languages.en.durationFrames,
    languageLabel: 'English',
    heroTitle: 'Solar System',
    heroKicker: 'Remotion / Three.js',
    audioFile: config.languages.en.audioFile,
    segments: [
      segment('Sun', 'The Sun', 'A glowing star at the center, holding the solar system together with gravity.', 'en'),
      segment('Mercury', 'Mercury', 'The smallest planet, racing closest to the Sun across a scorched orbit.', 'en'),
      segment('Venus', 'Venus', 'A bright world wrapped in thick clouds and an intense greenhouse atmosphere.', 'en'),
      segment('Earth', 'Earth', 'Our blue home, with liquid water, a protective atmosphere, and one Moon.', 'en'),
      segment('Mars', 'Mars', 'The red planet, marked by dust, canyons, volcanoes, and ancient river valleys.', 'en'),
      segment('Jupiter', 'Jupiter', 'The giant of the planets, massive enough to shape the paths around it.', 'en'),
      segment('Saturn', 'Saturn', 'A golden gas giant encircled by broad, icy rings.', 'en'),
      segment('Uranus', 'Uranus', 'A cold blue-green planet tilted dramatically onto its side.', 'en'),
      segment('Neptune', 'Neptune', 'A deep blue world with fierce winds, orbiting in the distant dark.', 'en'),
      segment('Finale', 'The Solar System', 'One star, eight planets, and countless smaller worlds moving together in space.', 'en')
    ]
  },
  zh: {
    id: 'zh',
    compositionId: 'SolarSystemZH',
    outputName: 'solar-system-zh.mp4',
    durationInFrames: config.languages.zh.durationFrames,
    languageLabel: '中文',
    heroTitle: '太阳系',
    heroKicker: 'Remotion / Three.js',
    audioFile: config.languages.zh.audioFile,
    segments: [
      segment('Sun', '太阳', '位于中心的发光恒星，用引力维系着整个太阳系。', 'zh'),
      segment('Mercury', '水星', '最小的行星，沿着靠近太阳的炽热轨道快速运行。', 'zh'),
      segment('Venus', '金星', '天空中明亮的行星，被厚厚云层和强烈温室效应包围。', 'zh'),
      segment('Earth', '地球', '我们的蓝色家园，拥有液态水、大气层和一颗月球。', 'zh'),
      segment('Mars', '火星', '红色行星，拥有尘暴、峡谷、火山和古老河谷。', 'zh'),
      segment('Jupiter', '木星', '太阳系最大的行星，质量巨大，影响着周围天体的轨道。', 'zh'),
      segment('Saturn', '土星', '金色的气态巨行星，周围环绕着宽阔的冰质光环。', 'zh'),
      segment('Uranus', '天王星', '寒冷的蓝绿色冰巨星，几乎侧躺着绕太阳运行。', 'zh'),
      segment('Neptune', '海王星', '遥远深蓝的行星，拥有猛烈的风，在黑暗边缘运行。', 'zh'),
      segment('Finale', '太阳系', '一颗恒星、八大行星，以及无数卫星、光环、小行星和彗星。', 'zh')
    ]
  },
  ja: {
    id: 'ja',
    compositionId: 'SolarSystemJA',
    outputName: 'solar-system-ja.mp4',
    durationInFrames: config.languages.ja.durationFrames,
    languageLabel: '日本語',
    heroTitle: '太陽系',
    heroKicker: 'Remotion / Three.js',
    audioFile: config.languages.ja.audioFile,
    segments: [
      segment('Sun', '太陽', '中心で輝く恒星で、その重力が太陽系全体をつなぎとめています。', 'ja'),
      segment('Mercury', '水星', '最も小さな惑星で、太陽に最も近い軌道を素早く回ります。', 'ja'),
      segment('Venus', '金星', '空で明るく見える惑星で、厚い雲と強い温室効果に包まれています。', 'ja'),
      segment('Earth', '地球', '私たちの青い故郷で、液体の水、大気、そして一つの月があります。', 'ja'),
      segment('Mars', '火星', '赤い惑星で、砂嵐、峡谷、火山、古い川の跡があります。', 'ja'),
      segment('Jupiter', '木星', '太陽系最大の惑星で、周囲の軌道にも大きな影響を与えます。', 'ja'),
      segment('Saturn', '土星', '金色の巨大ガス惑星で、広い氷の環に囲まれています。', 'ja'),
      segment('Uranus', '天王星', '冷たい青緑色の氷巨大惑星で、大きく傾いた姿勢で公転します。', 'ja'),
      segment('Neptune', '海王星', '遠く深い青色の惑星で、強い風が吹く暗い外縁を回っています。', 'ja'),
      segment('Finale', '太陽系', '一つの恒星、八つの惑星、そして月、環、小惑星、彗星が共に動いています。', 'ja')
    ]
  },
  ko: {
    id: 'ko',
    compositionId: 'SolarSystemKO',
    outputName: 'solar-system-ko.mp4',
    durationInFrames: config.languages.ko.durationFrames,
    languageLabel: '한국어',
    heroTitle: '태양계',
    heroKicker: 'Remotion / Three.js',
    audioFile: config.languages.ko.audioFile,
    segments: [
      segment('Sun', '태양', '중심에서 빛나는 별로, 중력으로 태양계 전체를 붙잡고 있습니다.', 'ko'),
      segment('Mercury', '수성', '가장 작은 행성으로, 태양에 가장 가까운 뜨거운 궤도를 빠르게 돕니다.', 'ko'),
      segment('Venus', '금성', '하늘에서 밝게 보이는 행성으로, 두꺼운 구름과 강한 온실 효과에 둘러싸여 있습니다.', 'ko'),
      segment('Earth', '지구', '우리의 푸른 집으로, 액체 물과 대기, 그리고 하나의 달을 가지고 있습니다.', 'ko'),
      segment('Mars', '화성', '붉은 행성으로, 먼지 폭풍과 협곡, 화산, 오래된 강의 흔적이 있습니다.', 'ko'),
      segment('Jupiter', '목성', '태양계에서 가장 큰 행성으로, 주변 천체의 궤도에도 큰 영향을 줍니다.', 'ko'),
      segment('Saturn', '토성', '넓은 얼음 고리로 둘러싸인 황금빛 가스 거대 행성입니다.', 'ko'),
      segment('Uranus', '천왕성', '차가운 청록색 얼음 거대 행성으로, 크게 기울어진 채 태양을 돕니다.', 'ko'),
      segment('Neptune', '해왕성', '멀리 있는 짙푸른 행성으로, 강한 바람이 부는 어두운 외곽을 돕니다.', 'ko'),
      segment('Finale', '태양계', '하나의 별, 여덟 행성, 그리고 수많은 달과 고리, 소행성, 혜성이 함께 움직입니다.', 'ko')
    ]
  }
};

export const languages = Object.keys(locales) as Language[];
