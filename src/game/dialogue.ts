// Enemy dialogue lines organized by type and situation
// All regular enemies speak Russian, rednecks speak broken English

type EnemyDialogue = Record<string, string[]>;

// === ALERT — first spotting the player ===
export const ALERT_LINES: Record<string, string[]> = {
  scav:    ['А?! КТО ТАМ?!', 'СТОЙ!!', 'ЧТО ЗА...!', 'МУЖИКИ! СЮДА!', 'ВИДИШЬ ЕГО?!'],
  soldier: ['КОНТАКТ!', 'ВИЖУ ЦЕЛЬ!', 'ВРАГ ОБНАРУЖЕН!', 'ВНИМАНИЕ! ЧУЖОЙ!', 'НА ПОЗИЦИЮ!'],
  heavy:   ['ЦЕЛЬ ЗАМЕЧЕНА.', 'ОГОНЬ ПО ГОТОВНОСТИ.', 'НЕ УБЕЖИШЬ.', 'ИДЁТ РАБОТА.'],
  redneck: ['HEY! WHO\'S THERE?!', 'GET OFF MY LAND!', 'I SEE YA!', 'TRESPASSER!!'],
  shocker: ['⚡ ОБНАРУЖЕН!', 'ПОПАЛСЯ!', 'ЭЛЕКТРИЧЕСТВО НЕ ЖДЁТ!', 'ГОТОВ К РАЗРЯДУ!'],
  sniper:  ['...цель...', '...вижу...'],
};

// === LOST SIGHT ===
export const LOST_LINES: Record<string, string[]> = {
  scav:    ['ГДЕ?!', 'ПОТЕРЯЛ!', 'КУДА ДЕЛСЯ?!', 'ОН ПРОПАЛ!'],
  soldier: ['ПОТЕРЯЛ КОНТАКТ!', 'ЦЕЛЬ НЕ ВИЖУ!', 'ГДЕ ОН?!', 'ПРОЧЁСЫВАЕМ!'],
  heavy:   ['НЕ ВИЖУ...', 'ДАЛЕКО НЕ УЙДЁТ.', 'ИЩЕМ.'],
  redneck: ['Where\'d he go?!', 'LOST HIM!', 'Come out!'],
  shocker: ['ПОТЕРЯН!', 'ГДЕ ОН?!'],
  sniper:  ['...ушёл...'],
};

// === INVESTIGATE (heard sound) ===
export const INVESTIGATE_LINES: Record<string, string[]> = {
  scav:    ['Что это?', 'Слышал?', 'Там кто-то!', 'Проверю...'],
  soldier: ['Шум! Проверить!', 'Слышите?', 'Движение!', 'Осмотреть!'],
  heavy:   ['Что за шум?', 'Иду проверить.', 'Тихо...'],
  redneck: ['What was that?', 'Hear somethin\'...', 'Somethin\' movin\'!'],
  shocker: ['Шум! Внимание!', 'Слышу!'],
  sniper:  [],
};

// === PANIC ===
export const PANIC_LINES: Record<string, string[]> = {
  scav:    ['ААААА!!!', 'МАМА!!', 'НЕ НАДО!!', 'ПОМОГИТЕ!!', 'БЕЖИМ!!'],
  soldier: ['ОТСТУПАЕМ!!', 'НАС УБИВАЮТ!!', 'ПРИКРОЙТЕ!!', 'НЕ МОГУ!'],
  heavy:   ['ЧТО?! НЕТ!!', 'АААХ!!'],
  redneck: ['OH LORD!!', 'HELP ME!!', 'NOOO!!', 'MAMA!!'],
  shocker: ['РАЗРЯД!! АААА!!', 'СИСТЕМА СБОЙ!!'],
};

// === BERSERK ===
export const BERSERK_LINES: Record<string, string[]> = {
  scav:    ['ХВАТИТ!! УМРИ!!', 'ААААРРР!!', 'УБЬЮ!!'],
  soldier: ['ЗА РОДИНУ!!', 'Я УБЬЮ ТЕБЯ!!', 'ВПЕРЁД ДО КОНЦА!!'],
  heavy:   ['НИЧЕГО НЕ ЧУВСТВУЮ!!', 'ЯРОСТЬ!!', 'РАЗРУШУ ТЕБЯ!!'],
  redneck: ['THAT\'S IT!!', 'I\'LL KILL YA!!', 'RAAAH!!'],
  shocker: ['МАКСИМАЛЬНЫЙ РАЗРЯД!!', 'ПЕРЕГРУЗКА!!'],
};

// === FLEEING ===
export const FLEE_LINES: Record<string, string[]> = {
  scav:    ['ВАЛИМ!!', 'НЕ ЗА ЭТО ПЛАТЯТ!', 'ОТХОЖУ!', 'ХВАТИТ!'],
  soldier: ['ОТСТУПАЮ!', 'НУЖНА ПЕРЕГРУППИРОВКА!', 'НАЗАД!'],
  heavy:   ['ТАКТИЧЕСКОЕ ОТСТУПЛЕНИЕ...'],
  redneck: ['I\'m outta here!', 'Too much!', 'Nope!'],
  shocker: ['ПЕРЕЗАРЯДКА!'],
};

// === DEATH — last words ===
export const DEATH_LINES: Record<string, string[]> = {
  scav:    ['Ургх...', 'Мама...', 'Нет...', 'За что...', '...'],
  soldier: ['За... Родину...', 'Доложите...', 'Продолжайте... без меня...', 'Скажите... семье...'],
  heavy:   ['Невозможно...', 'Как...', 'Нет... я...'],
  redneck: ['Tell... my dog...', 'Not like this...', 'Dang...', 'Ugh...'],
  shocker: ['Кор... откаж...', 'Систе... ма...', 'Zzzt...'],
  sniper:  ['...тум...ан...'],
  boss:    [], // Boss has special death sequence
  dog:     ['*whimper*'],
};

// === BOSS DEATH MONOLOGUE — shown in sequence ===
export const BOSS_DEATH_MONOLOGUE = [
  'НЕТ... НЕВОЗМОЖНО...',
  'Я... КОМАНДАНТ ОСИПОВИЧ...',
  'НОВАЯ ЗЕМЛЯ... НЕ УМРЁТ...',
  '...ты... ещё пожалеешь...',
];

// === HOSPITAL BOSS DEATH MONOLOGUES ===
export const KRAVTSOV_DEATH_MONOLOGUE = [
  'МОИ ЭКСПЕРИМЕНТЫ... НЕТ...',
  'ВЫ НЕ ПОНИМАЕТЕ... Я БЫЛ ТАК БЛИЗКО...',
  'ПАЦИЕНТЫ... ОНИ БЫЛИ... МАТЕРИАЛОМ...',
  '...наука... не прощает...',
];

export const UZBEK_DEATH_MONOLOGUE = [
  'ААААРРРГХ...',
  '...свобода...?',
  '...так долго... в темноте...',
  '...спа...си...бо...',
];

// === NACHALNIK DEATH MONOLOGUE ===
export const NACHALNIK_DEATH_MONOLOGUE = [
  'КРЮК... ВЫСКОЛЬЗНУЛ...',
  'МОЯ ПРИСТАНЬ... МОЁ МОРЕ...',
  'НИКТО НЕ УПЛЫВЁТ... БЕЗ МОЕГО...',
  '...разрешения...',
];

// === NACHALNIK TAUNTS ===
export const NACHALNIK_TAUNTS: string[][] = [
  ['ПРОЧЬ ОТ МОЕЙ ПРИСТАНИ!', 'СЮДА ЖИВЫМ НЕ УЙДЁШЬ!', 'КРЮК ЖДЁТ СВЕЖЕГО МЯСА!', 'ТЫ ЗНАЕШЬ, КАКОЙ ЛОВ СЕГОДНЯ?'],
  ['ПОДОЙДИ БЛИЖЕ... КРЮКОМ ПОЙМАЮ!', 'МОРСКАЯ ПЕХОТА! ЗА МОЙ ПРИЧАЛ!', 'Я ЗДЕСЬ ХОЗЯИН!'],
  ['*размахивает крюком* ПОЙМАЮ!!', 'ПОСЛЕДНИЙ УЛОВ... ТВОЙ!', 'КРЮК ГОЛОДНЫЙ!'],
];

// === NACHALNIK PHASE MESSAGES ===
export const NACHALNIK_PHASES = [
  '',
  '⚠ НАЧАЛЬНИК ДОСТАЁТ БОЛЬШОЙ КРЮК!',
  '☠ НАЧАЛЬНИК В ЯРОСТИ — КРЮК СМЕРТОНОСЕН!',
];

// === HOSPITAL BOSS TAUNTS ===
export const KRAVTSOV_TAUNTS: string[][] = [
  ['НЕ ТРОГАЙ МОИ ОБРАЗЦЫ!', 'ТЫ ИСПОРТИШЬ ЭКСПЕРИМЕНТ!', 'ОХРАНА! В ЛАБОРАТОРИЮ!', 'Я ДОКТОР КРАВЦОВ! УБИРАЙСЯ!', 'ЕЩЁ ОДИН ПОДОПЫТНЫЙ...'],
  ['ТЫ СТАНЕШЬ СЛЕДУЮЩИМ ОБРАЗЦОМ!', 'НУЖНА НОВАЯ ИНЪЕКЦИЯ!', 'МУТАГЕН ГОТОВ!', 'НЕ МЕШАЙ НАУКЕ!'],
  ['КРОВЬ... НУЖНА КРОВЬ!', 'ЭКСПЕРИМЕНТ... ДОЛЖЕН... ПРОДОЛЖАТЬСЯ!', 'Я НЕ ОСТАНОВЛЮСЬ!'],
];

export const UZBEK_TAUNTS: string[][] = [
  ['ААААА!!', '*рычание*', 'ВЫПУСТИТЕ!!', '*скрежет*', 'ТЕМНО... ТАК ТЕМНО...'],
  ['ГОЛОДЕН!!', '*вой*', 'БОЛЬШЕ НЕ БУДУ... ТИХИМ!', 'СВОБОООДА!!'],
  ['*нечеловеческий крик*', 'УБЬЮ... ВСЕХ...', '*хрип*'],
];

// === HOSPITAL BOSS PHASE MESSAGES ===
export const KRAVTSOV_PHASES = [
  '',
  '⚠ ДОКТОР КРАВЦОВ ВВОДИТ МУТАГЕН!',
  '☠ КРАВЦОВ В БЕЗУМИИ — БЕРЕГИСЬ!',
];
export const UZBEK_PHASES = [
  '',
  '⚠ УЗБЕК ВЫРЫВАЕТСЯ ИЗ ОКОВ!',
  '☠ УЗБЕК В ЯРОСТИ — ОН НЕВЕРОЯТНО БЫСТР!',
];

// === IDLE CHATTER — type-specific ambient lines ===
export const IDLE_LINES: Record<string, string[]> = {
  scav:    ['*зевает*', '*бормочет*', 'Когда смена...', 'Жрать охота...', 'Холодно...', '*ковыряет нос*', 'Скука...'],
  soldier: ['Чисто.', 'Позиция удерживается.', 'Всё тихо.', '*проверяет оружие*', 'Ожидание...'],
  heavy:   ['*трескает суставы*', '*тяжёлое дыхание*', 'Готов.', 'Пусть придут.'],
  redneck: ['*spits*', '*whistles*', 'Nice day...', 'C\'mere boy!', '*scratches*'],
  shocker: ['*жужжание*', '*щелчок*', 'Заряд: 100%', '*гудит*'],
  sniper:  [], // snipers are silent
};

// === TAKING DAMAGE (non-lethal hit) ===
export const HIT_LINES: Record<string, string[]> = {
  scav:    ['АЙ!', 'ПОПАЛИ!', 'ЧЁРТ!', 'АУЧ!'],
  soldier: ['РАНЕН!', 'ПОПАДАНИЕ!', 'ДЕРЖУСЬ!', 'ЗАДЕЛО!'],
  heavy:   ['ЦАРАПИНА.', 'БОЛЬШЕ ОГНЯ!', 'ЭТО ВСЁ?'],
  redneck: ['OW!', 'That hurt!', 'Son of a—!', 'OUCH!'],
  shocker: ['ПОВРЕЖДЕНИЕ!', 'АЙ!'],
  sniper:  [],
  boss:    ['ХА! ЩЕКОТНО!', 'МАЛО!', 'ЕЩЁ!', 'ЭТО ВСЁ?!'],
};

// Helper to pick a random line
export function pickLine(pool: Record<string, string[]>, type: string): string | null {
  const lines = pool[type];
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}
