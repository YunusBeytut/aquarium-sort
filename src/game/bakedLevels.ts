import bakedLevels from './levels.json';
import { type GeneratedLevel, registerBaked } from './levelGenerator';

// Hazır levelleri uygulama açılırken tanıtır (oyun ekranı açılırken değil).
registerBaked(bakedLevels as GeneratedLevel[]);
