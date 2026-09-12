'use strict';
// Everyday vocabulary, not scores or diagnoses. IDs and recorded labels stay stable.
(function (root) {
  const quick = ['good', 'calm', 'joy', 'energy', 'tired', 'worry', 'sad', 'unsure'];
  const definitions = [
    ['ease', 'Тепло / спокойно', [
      ['good', 'Хорошо', 'Good', 'нормально неплохо okay fine'],
      ['calm', 'Спокойно', 'Calm', 'спокоен спокойствие relaxed'],
      ['joy', 'Радостно', 'Joyful', 'радость радуюсь счастье happy happiness'],
      ['grateful', 'Благодарность', 'Grateful', 'благодарен спасибо thankful gratitude'],
      ['relieved', 'Облегчение', 'Relieved', 'отпустило легче relief'],
      ['connected', 'Близость', 'Connected', 'близко вместе связь connection closeness'],
      ['safe', 'Безопасно', 'Safe', 'защищенность защищённо secure safety'],
      ['content', 'Довольно', 'Content', 'доволен довольна удовлетворение satisfied'],
      ['tender', 'Нежность', 'Tender', 'нежно ласка tenderness affection'],
      ['loved', 'Меня любят', 'Loved', 'любим любимая забота cared for'],
      ['love', 'Любовь', 'Loving', 'люблю влюблен влюблён love'],
      ['trust', 'Доверие', 'Trusting', 'доверяю доверять trust'],
      ['acceptance', 'Принятие', 'Accepting', 'принимаю примирение acceptance'],
      ['peaceful', 'Умиротворение', 'At peace', 'покой мирно гармония peaceful'],
      ['proud', 'Гордость', 'Proud', 'горжусь получилось достижение pride'],
      ['delighted', 'Восторг', 'Delighted', 'восхищение восхищен прекрасно delight']
    ]],
    ['energy', 'Силы / интерес', [
      ['energy', 'Есть силы', 'Energized', 'энергия бодро бодрость energetic'],
      ['interested', 'Интересно', 'Interested', 'интерес заинтересован interest'],
      ['inspired', 'Вдохновение', 'Inspired', 'вдохновлен вдохновлён inspiration'],
      ['focused', 'Сосредоточенно', 'Focused', 'собран концентрация concentrate focus'],
      ['curious', 'Любопытно', 'Curious', 'любопытство исследовать curiosity'],
      ['hopeful', 'Надежда', 'Hopeful', 'надеюсь оптимизм hope'],
      ['playful', 'Игриво', 'Playful', 'игра шутить весело playfulness'],
      ['determined', 'Решительно', 'Determined', 'решимость решился determination'],
      ['excited', 'Воодушевление', 'Excited', 'воодушевлен воодушевлён оживление excitement'],
      ['confident', 'Уверенность', 'Confident', 'уверен уверена могу confidence'],
      ['motivated', 'Есть желание', 'Motivated', 'мотивация хочу делать motivation willing'],
      ['enthusiastic', 'Энтузиазм', 'Enthusiastic', 'запал увлечен увлечён enthusiasm'],
      ['engaged', 'Вовлечённость', 'Engaged', 'вовлечен включился участие involved'],
      ['surprised', 'Удивление', 'Surprised', 'удивлен удивлён неожиданно surprise'],
      ['anticipation', 'Предвкушение', 'Anticipating', 'жду с радостью ожидание anticipation looking forward'],
      ['flow', 'В потоке', 'In flow', 'поток погружение увлекся увлёкся absorbed']
    ]],
    ['tension', 'Напряжение', [
      ['worry', 'Тревожно', 'Worried', 'тревога тревожусь переживаю anxiety anxious worry'],
      ['angry', 'Злость', 'Angry', 'злюсь сердит ярость anger mad'],
      ['irritated', 'Раздражение', 'Irritated', 'раздражен раздражён бесит annoyed irritation'],
      ['afraid', 'Страшно', 'Afraid', 'боюсь страх fearful scared'],
      ['restless', 'Беспокойно', 'Restless', 'не нахожу места беспокойство uneasy'],
      ['overwhelmed', 'Перегруз', 'Overwhelmed', 'слишком много не справляюсь overload'],
      ['stressed', 'Напряжённо', 'Tense', 'напряжение стресс напряженно stressed'],
      ['unsure', 'Неясно', 'Unsure', 'не знаю непонятно не понимаю не определился uncertain confused'],
      ['frustrated', 'Досада', 'Frustrated', 'не получается фрустрация frustration'],
      ['impatient', 'Нетерпение', 'Impatient', 'не терпится не могу ждать impatience'],
      ['resentful', 'Негодование', 'Resentful', 'несправедливо возмущение возмущен resentment indignation'],
      ['jealous', 'Зависть', 'Envious', 'завидую ревность jealous envy'],
      ['guilty', 'Вина', 'Guilty', 'виноват виновата виновен guilt'],
      ['ashamed', 'Стыд', 'Ashamed', 'стыдно неловко shame embarrassed'],
      ['vulnerable', 'Уязвимость', 'Vulnerable', 'уязвим беззащитно vulnerability exposed'],
      ['helpless', 'Беспомощность', 'Helpless', 'бессилие не могу повлиять helplessness powerless']
    ]],
    ['low', 'Мало сил', [
      ['tired', 'Усталость', 'Tired', 'устал устала усталый fatigue'],
      ['sad', 'Грустно', 'Sad', 'грусть грущу печально sadness'],
      ['lonely', 'Одиноко', 'Lonely', 'одиночество один одна loneliness alone'],
      ['lost', 'Растерянность', 'Lost', 'растерян потерян потерялся lost confused'],
      ['empty', 'Пустота', 'Empty', 'пусто ничего не чувствую numb emptiness'],
      ['hurt', 'Обидно', 'Hurt', 'обида обиделся обиделась wounded hurt feelings'],
      ['bored', 'Скучно', 'Bored', 'скука bored boredom'],
      ['sleepy', 'Сонно', 'Sleepy', 'сонливость хочу спать drowsy'],
      ['disappointed', 'Разочарование', 'Disappointed', 'разочарован ожидал другого disappointment'],
      ['grief', 'Печаль', 'Sorrowful', 'горе утрата скорбь grief sorrow'],
      ['longing', 'Тоска', 'Longing', 'скучаю тоскливо не хватает missing someone yearning'],
      ['nostalgic', 'Ностальгия', 'Nostalgic', 'вспоминаю прошлое nostalgia'],
      ['apathetic', 'Безразличие', 'Indifferent', 'все равно всё равно нет интереса апатия apathetic indifferent'],
      ['drained', 'Истощение', 'Drained', 'выжат нет сил обессилен exhausted depleted'],
      ['disconnected', 'Отстранённость', 'Detached', 'отстраненность отдельно отключился disconnected distant'],
      ['heavy', 'Тяжело', 'Heavy-hearted', 'тяжесть подавлен подавленно down heavy heart']
    ]]
  ];
  const idFor = id => quick.includes(id) ? id : `sstm:state:${id}`;
  const groups = definitions.map(([id, label, rows]) => ({ id, label, states: rows.map(r => idFor(r[0])) }));
  const entries = definitions.flatMap(([, , rows]) => rows.map(([id, label, en, aliases], i) => ({ id: idFor(id), label, en, aliases, version: quick.includes(id) ? 2 : i < 8 ? 3 : 4 })));
  const legacyDefaults = quick.map(id => { const o = entries.find(o => o.id === id); return { id, label: o.label }; });
  const defaults = [...legacyDefaults, ...entries.filter(o => !quick.includes(o.id)).map(({ id, label }) => ({ id, label }))];
  const api = { groups, entries, legacyDefaults, defaults };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SstmStateCatalog = api;
})(globalThis);
