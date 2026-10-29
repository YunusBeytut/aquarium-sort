import bakedLevels from './levels.json';
import { type GeneratedLevel, registerBaked } from './levelGenerator';
import { TUTORIAL_LEVELS } from './tutorialLevels';

// Hazır levelleri uygulama açılırken tanıtır (oyun ekranı açılırken değil).
// Dragon Arowana (id 19) levels.json'da yok. Dosya yeniden üretilene kadar bazı levellerde bir balık
// türü Arowana ile değiştirilir. Tür id'leri yalnızca etikettir, level çözülebilir kalır.
const AROWANA_ID = 19;
const POOL_SIZE = 17; // bulmaca havuzundaki balık sayısı (Arowana'nın levellerde görünme oranı: types / 17)

function withArowana(l: GeneratedLevel): GeneratedLevel {
    if (l.fishIds.includes(AROWANA_ID)) return l;
    const h = Math.imul(l.level, 2654435761) >>> 0;
    if (h % POOL_SIZE >= l.fishIds.length) return l;
    const from = l.fishIds[(h >>> 8) % l.fishIds.length];
    const swap = (id: number) => (id === from ? AROWANA_ID : id);
    return { ...l, fishIds: l.fishIds.map(swap), jars: l.jars.map((j) => j.map(swap)) };
}

registerBaked((bakedLevels as GeneratedLevel[]).map(withArowana));

// Elle hazırlanmış öğretici leveller, hazır listedeki aynı numaralı levellerin yerini alır.
// (Sonra kaydedildikleri için üzerine yazarlar.)
registerBaked(TUTORIAL_LEVELS);