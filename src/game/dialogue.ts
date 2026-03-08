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
  cultist: ['НЕЧИСТЫЙ!!', 'БРАТЬЯ! ВРАГ ОРДЕНА!', 'БОРЕАЛИС ВИДИТ ТЕБЯ!', 'ЖЕРТВА ПРИШЛА САМА!', 'ВО ИМЯ ВЕЩЕСТВА!'],
  miner_cult: ['BERGET VARNAR!', 'INKRÄKTARE I DRIFTEN!', 'STÅLHANDSKE SKA HÄMNAS!', 'DU STÖR RITUALEN!', 'MALMEN ROPAR!'],
  svarta_sol: ['TARGET ACQUIRED.', 'HYPERBOREAN PROTOCOL.', 'RUNE BEARER — ENGAGE.', 'SOL INVICTUS.'],
};

// === LOST SIGHT ===
export const LOST_LINES: Record<string, string[]> = {
  scav:    ['ГДЕ?!', 'ПОТЕРЯЛ!', 'КУДА ДЕЛСЯ?!', 'ОН ПРОПАЛ!'],
  soldier: ['ПОТЕРЯЛ КОНТАКТ!', 'ЦЕЛЬ НЕ ВИЖУ!', 'ГДЕ ОН?!', 'ПРОЧЁСЫВАЕМ!'],
  heavy:   ['НЕ ВИЖУ...', 'ДАЛЕКО НЕ УЙДЁТ.', 'ИЩЕМ.'],
  redneck: ['Where\'d he go?!', 'LOST HIM!', 'Come out!'],
  shocker: ['ПОТЕРЯН!', 'ГДЕ ОН?!'],
  sniper:  ['...ушёл...'],
  cultist: ['ВЕЩЕСТВО УКАЖЕТ ПУТЬ...', 'ОН СБЕЖАЛ... ВРЕМЕННО.', 'БРАТЬЯ, ИЩИТЕ!'],
  miner_cult: ['BERGET GÖMMER HONOM...', 'HAN FÖRSVANN I TUNNELN!', 'SÖK I DRIFTERNA!'],
  svarta_sol: ['TARGET LOST.', 'SCANNING.', 'RUNE TRACE FADING.'],
};

// === INVESTIGATE (heard sound) ===
export const INVESTIGATE_LINES: Record<string, string[]> = {
  scav:    ['Что это?', 'Слышал?', 'Там кто-то!', 'Проверю...'],
  soldier: ['Шум! Проверить!', 'Слышите?', 'Движение!', 'Осмотреть!'],
  heavy:   ['Что за шум?', 'Иду проверить.', 'Тихо...'],
  redneck: ['What was that?', 'Hear somethin\'...', 'Somethin\' movin\'!'],
  shocker: ['Шум! Внимание!', 'Слышу!'],
  sniper:  [],
  cultist: ['Вещество дрожит...', 'Кто нарушил покой?', 'Братья, тихо...'],
  miner_cult: ['Hör du det?', 'Nåt rör sig...', 'I tunneln...'],
  svarta_sol: ['Movement detected.', 'Investigating.'],
};

// === PANIC ===
export const PANIC_LINES: Record<string, string[]> = {
  scav:    ['ААААА!!!', 'МАМА!!', 'НЕ НАДО!!', 'ПОМОГИТЕ!!', 'БЕЖИМ!!'],
  soldier: ['ОТСТУПАЕМ!!', 'НАС УБИВАЮТ!!', 'ПРИКРОЙТЕ!!', 'НЕ МОГУ!'],
  heavy:   ['ЧТО?! НЕТ!!', 'АААХ!!'],
  redneck: ['OH LORD!!', 'HELP ME!!', 'NOOO!!', 'MAMA!!'],
  shocker: ['РАЗРЯД!! АААА!!', 'СИСТЕМА СБОЙ!!'],
  cultist: ['БОРЕАЛИС НЕ СПАСЁТ?!', 'ВЕЩЕСТВО! ЗАЩИТИ!', 'НЕТ НЕТ НЕТ!'],
  miner_cult: ['BERGET SVIKER OSS!', 'STÅLHANDSKE! HJÄLP!', 'NEJ NEJ!'],
  svarta_sol: ['ABORT MISSION!', 'EXTRACTION NEEDED!'],
};

// === BERSERK ===
export const BERSERK_LINES: Record<string, string[]> = {
  scav:    ['ХВАТИТ!! УМРИ!!', 'ААААРРР!!', 'УБЬЮ!!'],
  soldier: ['ЗА РОДИНУ!!', 'Я УБЬЮ ТЕБЯ!!', 'ВПЕРЁД ДО КОНЦА!!'],
  heavy:   ['НИЧЕГО НЕ ЧУВСТВУЮ!!', 'ЯРОСТЬ!!', 'РАЗРУШУ ТЕБЯ!!'],
  redneck: ['THAT\'S IT!!', 'I\'LL KILL YA!!', 'RAAAH!!'],
  shocker: ['МАКСИМАЛЬНЫЙ РАЗРЯД!!', 'ПЕРЕГРУЗКА!!'],
  cultist: ['ВЕЩЕСТВО ДАЁТ СИЛУ!!', 'КРОВЬ ДЛЯ БОРЕАЛИСА!!', 'Я ВИЖУ СВЕТ!!'],
  miner_cult: ['BERGET GER MIG KRAFT!!', 'MALMEN BRINNER I MINA ÅDROR!!', 'DU DÖR HÄR NERE!!'],
  svarta_sol: ['FULL ASSAULT.', 'NO QUARTER.', 'THULE DEMANDS BLOOD.'],
};

// === FLEEING ===
export const FLEE_LINES: Record<string, string[]> = {
  scav:    ['ВАЛИМ!!', 'НЕ ЗА ЭТО ПЛАТЯТ!', 'ОТХОЖУ!', 'ХВАТИТ!'],
  soldier: ['ОТСТУПАЮ!', 'НУЖНА ПЕРЕГРУППИРОВКА!', 'НАЗАД!'],
  heavy:   ['ТАКТИЧЕСКОЕ ОТСТУПЛЕНИЕ...'],
  redneck: ['I\'m outta here!', 'Too much!', 'Nope!'],
  shocker: ['ПЕРЕЗАРЯДКА!'],
  cultist: ['ОТСТУПАЮ К АЛТАРЮ!', 'ВЕЩЕСТВО НЕ ДОПУСТИТ!'],
  miner_cult: ['TILLBAKA TILL DRIFTEN!', 'BERGET SKYDDAR MIG!'],
  svarta_sol: ['TACTICAL WITHDRAWAL.', 'REPOSITIONING.'],
};

// === TACTICAL CALLOUTS — combat communication ===
export const RELOAD_LINES: Record<string, string[]> = {
  scav:    ['ПЕРЕЗАРЯДКА!', 'ПОДОЖДИ!'],
  soldier: ['ПЕРЕЗАРЯЖАЮСЬ!', 'ПРИКРОЙ — МАГАЗИН!', 'МЕНЯЮ!'],
  heavy:   ['ПЕРЕЗАРЯЖАЮ...', 'ЛЕНТА КОНЧИЛАСЬ.'],
  redneck: ['RELOADIN\'!', 'COVER ME!'],
  shocker: ['ПЕРЕЗАРЯДКА БАТАРЕИ!'],
  cultist: ['РИТУАЛ ОБНОВЛЕНИЯ!', 'ПЕРЕЗАРЯДКА!'],
  miner_cult: ['LADDAR OM!', 'TÄCK MIG!'],
  svarta_sol: ['RELOADING.', 'MAG CHANGE.'],
};

export const FLANKING_LINES: Record<string, string[]> = {
  scav:    ['ЗАХОЖУ СБОКУ!', 'ОБХОЖУ!'],
  soldier: ['ФЛАНГ! ОБХОЖУ!', 'ИДУ В ОБХОД!', 'СПРАВА ЗАХОЖУ!'],
  heavy:   ['ОБХОЖУ.', 'ЗАЙДУ СБОКУ.'],
  redneck: ['GOIN\' AROUND!', 'FLANKIN\'!'],
  shocker: ['ОБХОЖУ С ФЛАНГА!'],
  cultist: ['ДОРОГА ТЕНИ!', 'ОБХОЖУ!'],
  miner_cult: ['FLANKERAR!', 'GÅR RUNT!'],
  svarta_sol: ['FLANKING.', 'REPOSITIONING LEFT.'],
};

export const SUPPRESSING_LINES: Record<string, string[]> = {
  scav:    ['ПАЛЮ!', 'СТРЕЛЯЮ!'],
  soldier: ['ОГОНЬ НА ПОДАВЛЕНИЕ!', 'ПРИКРЫВАЮ!', 'ДАВЛЮ ОГНЁМ!'],
  heavy:   ['ОГОНЬ!', 'НЕПРЕРЫВНЫЙ ОГОНЬ!'],
  redneck: ['KEEPIN\' HIM DOWN!', 'STAY DOWN!'],
  shocker: ['ПОДАВЛЕНИЕ!'],
  cultist: ['СВЕТ БОРЕАЛИСА!', 'ОГНЕННЫЙ РИТУАЛ!'],
  miner_cult: ['ELDGIVNING!', 'UNDERTRYCKER!'],
  svarta_sol: ['SUPPRESSIVE FIRE.', 'COVERING.'],
};

export const ALLY_DOWN_LINES: Record<string, string[]> = {
  scav:    ['МУЖИК УПАЛ!', 'НАШИХ УБИЛИ!', 'ТВОЮ МАТЬ!'],
  soldier: ['ПОТЕРИ! БОЕЦ УБИТ!', 'ДВУХСОТЫЙ!', 'ЧЕЛОВЕК ВНИЗ!', 'ОГОНЬ! ОТОМСТИМ!'],
  heavy:   ['ПОТЕРИ.', 'ОН УБИЛ НАШЕГО.', 'МЕСТЬ.'],
  redneck: ['THEY GOT BILLY!', 'MAN DOWN!', 'HE\'S DEAD!'],
  shocker: ['ОБЪЕКТ УНИЧТОЖЕН!', 'ПОТЕРЯ ЮНИТА!'],
  cultist: ['БРАТ ПАЛ!', 'ЖЕРТВА ПРИНЯТА!', 'ОТОМСТИМ ЗА БРАТА!'],
  miner_cult: ['KAMRAT NERE!', 'HAN DÖDADE EN AV OSS!', 'HÄMND!'],
  svarta_sol: ['MAN DOWN.', 'CASUALTY.', 'AVENGE.'],
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
  cultist: ['Вещество... прими меня...', 'Бореалис... вижу свет...', 'Братья...', 'Алтарь... зовёт...'],
  miner_cult: ['Berget... tar mig hem...', 'Stålhandske... jag kommer...', 'Malmen... glödde...', 'Djupet...'],
  svarta_sol: ['Mission... failed...', 'Sol... Invictus...', 'The runes...', 'Thule...'],
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
  '⚠ NACHALNIK ДОСТАЁТ БОЛЬШОЙ КРЮК!',
  '☠ NACHALNIK В ЯРОСТИ — КРЮК СМЕРТОНОСЕН!',
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
  scav:    ['*зевает*', '*бормочет*', 'Когда смена...', 'Жрать охота...', 'Холодно...', '*ковыряет нос*', 'Скука...', 'Тут гудит...', 'Слышишь? Из-под пола...', 'Вещество... опять вижу сны...', 'Зарплату задерживают...', 'Может свалить?..', 'Я не за это подписался...', '*дрожит*'],
  soldier: ['Чисто.', 'Позиция удерживается.', 'Всё тихо.', '*проверяет оружие*', 'Ожидание...', 'Командант опять ночью ходит...', 'В лаборатории свет горел всю ночь...', 'Говорят, Кедр пропал полностью...', 'Опять эти звуки снизу...', '*чистит автомат*', 'Пять минут до смены.', 'Сектор чист, жду приказ.'],
  heavy:   ['*трескает суставы*', '*тяжёлое дыхание*', 'Готов.', 'Пусть придут.', 'Стена гудит... интересно...', '*разминает шею*', 'Мне скучно. Хочу стрелять.', 'Я здесь главный.'],
  redneck: ['*spits*', '*whistles*', 'Nice day...', 'C\'mere boy!', '*scratches*', 'Somethin\' ain\'t right in them tunnels...', 'Dogs been howlin\' all night...', '*hums a tune*', 'Ain\'t nobody comin\' out here...', 'My granddaddy warned me about this place...'],
  shocker: ['*жужжание*', '*щелчок*', 'Заряд: 100%', '*гудит*', 'Батареи от Вещества... не разряжаются...', '*искры*', 'Кожа горит...', 'Чувствую ток... везде...', 'Мне нравится боль.'],
  sniper:  [], // snipers are silent
  cultist: ['*бормочет молитву*', 'Вещество гудит сегодня...', 'Братья скоро соберутся...', '*рисует символы на стене*', 'Бореалис... я слышу тебя...', 'Жертва будет принесена в полночь...', '*покачивается в трансе*', 'Сияние... скоро...'],
  miner_cult: ['*knackar på bergväggen*', 'Stålhandske talar till mig...', 'Malmen glöder ikväll...', '*mumlar en sång*', 'Kristallerna... pulserar...', 'Vi grävde för djupt...', '*stirrar in i väggen*', 'Absorption... snart...'],
  svarta_sol: ['*checks equipment*', '*adjusts scope*', 'Perimeter secure.', '*examines rune stone*', 'Hyperborean readings nominal.', '*silent hand signal*'],
};

// === MAP-SPECIFIC IDLE LINES — override for Swedish map ===
export const IDLE_LINES_SWEDISH: Record<string, string[]> = {
  redneck: ['*spottar*', '*visslar*', 'Fint väder...', 'Kom hit, pojk!', '*kliar sig*', 'Nåt rör sig i gruvan...', 'Hundarna skäller igen...', 'Berget sjunger på nätterna...', 'Stålhandske försvann här, vet du det?', 'Dom borde aldrig öppnat den där driften...', '*nynnar*', 'Farfar varnade mig...'],
  soldier: ['ПОЗИЦИЯ.', 'Шведы закрыли шахту... теперь наша.', 'Камни тут тёплые... странно...', 'Компас крутится... опять...', 'Полковник Варга сказал — молчать о кристаллах...'],
  scav:    ['Jag vill härifrån...', '*darrar*', 'Hör du berget?', 'Lamporna flimrar hela tiden...', 'Гудит... всё время гудит...', 'Jag har inte sovit på tre dagar...'],
  heavy:   ['Стены двигаются? Нет... показалось.', '*тяжёлое дыхание*', 'Готов.', 'Шведская руда... тяжелее обычной.'],
};

// === MAP-SPECIFIC ALERT LINES — Swedish map ===
export const ALERT_LINES_SWEDISH: Record<string, string[]> = {
  redneck: ['VEM FAN ÄR DET?!', 'FÖRSVINN HÄRIFRÅN!', 'JAG SER DIG!', 'INKRÄKTARE!!', 'HÄR ÄR DET PRIVAT!', 'DU BORDE INTE VARA HÄR!'],
};

// === MAP-SPECIFIC DEATH LINES — Swedish rednecks ===
export const DEATH_LINES_SWEDISH: Record<string, string[]> = {
  redneck: ['Berget... tar mig...', 'Nej...', 'Hunden...', '*sista andetaget*', 'Gruvan... förlåt...'],
};

// === TAKING DAMAGE (non-lethal hit) ===
export const HIT_LINES: Record<string, string[]> = {
  scav:    ['АЙ!', 'ПОПАЛИ!', 'ЧЁРТ!', 'АУЧ!', 'БОЛЬНО!!', 'НЕТ НЕТ НЕТ!', 'МАМА!!'],
  soldier: ['РАНЕН!', 'ПОПАДАНИЕ!', 'ДЕРЖУСЬ!', 'ЗАДЕЛО!', 'ПРИКРОЙТЕ!', 'МЕДИК!'],
  heavy:   ['ЦАРАПИНА.', 'БОЛЬШЕ ОГНЯ!', 'ЭТО ВСЁ?', 'ХА!', 'СЛАБО.'],
  redneck: ['OW!', 'That hurt!', 'Son of a—!', 'OUCH!', 'You\'ll pay for that!', 'MY ARM!'],
  shocker: ['ПОВРЕЖДЕНИЕ!', 'АЙ!', 'ПЕРЕГРУЗКА!', '*шипение*'],
  sniper:  ['...цк...'],
  boss:    ['ХА! ЩЕКОТНО!', 'МАЛО!', 'ЕЩЁ!', 'ЭТО ВСЁ?!', 'СИЛЬНЕЕ!'],
  cultist: ['БОЛЬ — ЭТО ДАРЕНИЕ!', 'ВЕЩЕСТВО ЛЕЧИТ!', 'АЙ! НЕЧИСТЫЙ!', 'КРОВЬ ДЛЯ АЛТАРЯ!'],
  miner_cult: ['AJ! BERGET GER MIG STYRKA!', 'SMÄRTA ÄR MALM!', 'DU SKADAR INTE DJUPET!'],
  svarta_sol: ['HIT!', 'ARMOR HOLDING.', 'MINOR WOUND.', 'CONTINUING.'],
};

// === COMBAT CALLOUTS — shouted during active firefight ===
export const COMBAT_LINES: Record<string, string[]> = {
  scav:    ['*паника*', 'ОН СТРЕЛЯЕТ!', 'КУДА?!', 'ПРЯЧЬСЯ!', 'БЕЖИМ ОТСЮДА!'],
  soldier: ['ПЕРЕЗАРЯДКА!', 'ПРИКРЫВАЮ!', 'ФЛАНГ СЛЕВА!', 'ГРАНАТУ!', 'НЕ ВЫСОВЫВАЙСЯ!', 'СМЕНА ПОЗИЦИИ!', 'ПОДАВЛЯЮЩИЙ ОГОНЬ!'],
  heavy:   ['СТОЮ НАСМЕРТЬ.', 'ПОДАВЛЯЮ!', 'БЛИЖЕ... ЕЩЁ БЛИЖЕ...', 'ЗА СТЕНОЙ!'],
  redneck: ['YEEHAW!', 'EAT LEAD!', 'THAT\'S MY PROPERTY!', 'GIT!', 'STAY DOWN!'],
  shocker: ['РАЗРЯД ГОТОВ!', 'БЛИЖЕ... ДА... БЛИЖЕ!', 'ПОЧУВСТВУЙ ТОК!', '*маниакальный смех*'],
  sniper:  [],
  cultist: ['ВО ИМЯ БОРЕАЛИСА!', 'ЖЕРТВОПРИНОШЕНИЕ!', 'КРОВЬ НЕЧИСТОГО!', 'ВЕЩЕСТВО ВЕДЁТ ПУЛЮ!', 'АЛТАРЬ ТРЕБУЕТ!'],
  miner_cult: ['FÖR STÅLHANDSKE!', 'MALMEN SJUNGER!', 'DU ÄR OFFRET!', 'BERGET KROSSAR DIG!'],
  svarta_sol: ['SUPPRESSING.', 'FLANKING.', 'TARGET ENGAGED.', 'FIRE AND MANEUVER.', 'CLOSING IN.'],
};

// === GRUVRÅ DEATH MONOLOGUE ===
export const GRUVRA_DEATH_MONOLOGUE = [
  'BERGET... FALLER...',
  'NI KAN INTE... TA MALMEN...',
  'ORT OCH STOLL... FÖRLÅT MIG...',
  '...djupet... kallar...',
];

// === GRUVRÅ TAUNTS ===
export const GRUVRA_TAUNTS: string[][] = [
  ['BERGET ÄR MITT!', 'NI BORDE ALDRIG KOMMIT HIT!', 'GRUVAN SLUKAR ALLA!', 'HÖR NI BERGET RYTA?!'],
  ['STENARNA FALLER PÅ ER!', 'ORT! STOLL! KROSSA DEM!', 'NI ÄR INSTÄNGDA!'],
  ['*BERGET SKAKAR* ALLA DÖR HÄR NERE!!', 'INGEN KOMMER UPP LEVANDE!', 'SISTA SKIFTET!'],
];

// === GRUVRÅ PHASE MESSAGES ===
export const GRUVRA_PHASES = [
  '',
  '⚠ GRUVRÅ FRAMKALLAR ETT RAS!',
  '☠ GRUVRÅ ÄR I URSINNE — GRUVAN KOLLAPSAR!',
];

// Helper to pick a random line
export function pickLine(pool: Record<string, string[]>, type: string): string | null {
  const lines = pool[type];
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

// ═══════════════════════════════════════════════════
// AMBIENT ATMOSPHERE — periodic messages per map
// ═══════════════════════════════════════════════════
export const AMBIENT_MESSAGES: Record<string, string[]> = {
  objekt47: [
    '🌬️ The Arctic wind howls through the compound...',
    '📻 Static crackles from an abandoned radio nearby...',
    '💡 A fluorescent light flickers in the corridor ahead...',
    '🧲 Your compass needle trembles — magnetic interference from below...',
    '👁️ You feel watched. The ventilation shafts seem to breathe...',
    '📡 A distant antenna dish rotates slowly, searching...',
    '🔊 From deep underground — a low, rhythmic hum. Like a heartbeat.',
    '❄️ Frost crystals form on the bunker walls. It\'s not that cold...',
    '🐾 Boot prints in the frozen mud lead to the southern perimeter... and stop.',
    '💀 Dog tags hang from a wire. Tarnished. The names are worn away.',
  ],
  fishing_village: [
    '🌊 Waves crash against the pier. The sound masks everything...',
    '🐟 The stench of dead fish hangs in the salt air...',
    '⛵ A fishing boat rocks against its moorings. The hull is stained dark...',
    '🔔 A rusted bell clangs in the wind. No one answers.',
    '🏚️ Through a cabin window — a table set for dinner. Covered in dust.',
    '🐕 Somewhere in the forest, a dog howls. Then silence.',
    '🌙 The northern lights flicker above — green and cold.',
    '🪝 Scratch marks on the dock planks. Deep. Like a hook dragged across.',
    '📦 Lead-lined containers stacked behind the warehouse. The labels say "FISH."',
    '🌊 The tide is coming in. The beach mines will be hidden soon...',
  ],
  hospital: [
    '🏥 A door swings shut somewhere. The echo lingers...',
    '💉 Broken syringes crunch underfoot. The glass is stained green...',
    '🔦 Your flashlight catches something on the wall — nail marks. Deep.',
    '📋 A patient chart on the floor: "Subject 7 — DO NOT RELEASE."',
    '🩸 The floor is sticky. Not water.',
    '😰 A sound from the basement — like chains dragging across concrete.',
    '💊 Pills scattered across the hallway. Someone left in a hurry.',
    '🧪 The east wing lab glows faintly green. Even with the power off.',
    '👤 For a moment, you see a figure in the window. When you look again — empty.',
    '📢 The PA system clicks on briefly: static, then a whisper, then silence.',
    '🌡️ The temperature drops as you move deeper. Your breath fogs.',
  ],
  mining_village: [
    '⛏️ The mine entrance yawns open. A draft of warm air rises from below...',
    '🧲 Your compass spins freely. The magnetic anomaly is stronger here...',
    '🪨 A rumble from deep underground. Not an earthquake. Something else.',
    '🕯️ The mine lamps flicker in sequence — west to east. Like breathing.',
    '🔊 Infrasound. You can\'t hear it, but your chest vibrates. 18 Hz.',
    '🌑 The black crystals in the tunnel walls seem to pulse faintly...',
    '👤 Carved into the rock: "STÅLHANDSKE VAR HÄR 1955"',
    '🏚️ An abandoned cabin. Inside — a compass with a bent needle pointing down.',
    '⚠️ The concrete seal on Drift 7 is warm to the touch. 30°C.',
    '💎 The black ore glints in your flashlight. For a moment, it looked like an eye.',
    '🌬️ From 420 meters below — a sound like stone grinding. The mountain speaks.',
  ],
};
