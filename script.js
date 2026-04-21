let fullDictionary = [];
let activeLevel = 1;
let learnedIds = new Set();
let yellowCards = new Map();
let redCards = new Map();

// Фразовые карточки (теперь независимо от уровня)
let phrasesDatabase = [];
let learnedPhrasesIds = new Set();
let yellowPhrases = new Map();
let redPhrases = new Map();
let phraseQueue = [];
let wordsSinceLastPhrase = 0;
let isPhraseCard = false;
let currentPhraseCard = null;

let currentCard = null;
let currentLevelWords = [];
let currentCardIndex = 0;
let isFlipped = false;
let touchStartX = 0;
let isSwiping = false;

// ========== РАСШИРЕННАЯ БАЗА ФРАЗ ==========
const phrasesList = [
  // Приветствия и вежливость
  { phrase: "你好", pinyin: "nǐ hǎo", meaning: "Здравствуйте", breakdown: "你 (ты) + 好 (хорошо)" },
  { phrase: "您好", pinyin: "nín hǎo", meaning: "Здравствуйте (уважительно)", breakdown: "您 (Вы уваж.) + 好 (хорошо)" },
  { phrase: "大家好", pinyin: "dà jiā hǎo", meaning: "Здравствуйте всем", breakdown: "大家 (все) + 好 (хорошо)" },
  { phrase: "早上好", pinyin: "zǎo shang hǎo", meaning: "Доброе утро", breakdown: "早上 (утро) + 好 (хорошо)" },
  { phrase: "下午好", pinyin: "xià wǔ hǎo", meaning: "Добрый день", breakdown: "下午 (после полудня) + 好" },
  { phrase: "晚上好", pinyin: "wǎn shang hǎo", meaning: "Добрый вечер", breakdown: "晚上 (вечер) + 好" },
  { phrase: "晚安", pinyin: "wǎn ān", meaning: "Спокойной ночи", breakdown: "晚 (вечер) + 安 (спокойствие)" },
  { phrase: "再见", pinyin: "zài jiàn", meaning: "До свидания", breakdown: "再 (снова) + 见 (видеть)" },
  { phrase: "拜拜", pinyin: "bài bài", meaning: "Пока", breakdown: "от английского bye-bye" },
  { phrase: "谢谢", pinyin: "xiè xie", meaning: "Спасибо", breakdown: "谢 (благодарить) + 谢" },
  { phrase: "非常感谢", pinyin: "fēi cháng gǎn xiè", meaning: "Большое спасибо", breakdown: "非常 (очень) + 感谢 (благодарность)" },
  { phrase: "不客气", pinyin: "bù kè qi", meaning: "Пожалуйста (ответ на спасибо)", breakdown: "不 (не) + 客气 (вежливый)" },
  { phrase: "对不起", pinyin: "duì bu qǐ", meaning: "Извините", breakdown: "对 (правильно) + 不起 (не получается)" },
  { phrase: "没关系", pinyin: "méi guān xi", meaning: "Ничего страшного", breakdown: "没 (нет) + 关系 (связи)" },
  { phrase: "请", pinyin: "qǐng", meaning: "Пожалуйста (просьба)", breakdown: "просьба/приглашение" },
  
  // Вопросы и ответы
  { phrase: "你好吗", pinyin: "nǐ hǎo ma", meaning: "Как дела?", breakdown: "你 (ты) + 好 (хорошо) + 吗 (вопрос)" },
  { phrase: "我很好", pinyin: "wǒ hěn hǎo", meaning: "У меня всё хорошо", breakdown: "我 (я) + 很 (очень) + 好 (хорошо)" },
  { phrase: "你叫什么名字", pinyin: "nǐ jiào shén me míng zi", meaning: "Как тебя зовут?", breakdown: "你 (ты) + 叫 (звать) + 什么 (что) + 名字 (имя)" },
  { phrase: "我叫...", pinyin: "wǒ jiào...", meaning: "Меня зовут...", breakdown: "我 (я) + 叫 (звать)" },
  { phrase: "你多大", pinyin: "nǐ duō dà", meaning: "Сколько тебе лет?", breakdown: "你 (ты) + 多大 (сколько лет)" },
  { phrase: "你从哪里来", pinyin: "nǐ cóng nǎ li lái", meaning: "Откуда ты?", breakdown: "你 (ты) + 从 (из) + 哪里 (где) + 来 (приходить)" },
  { phrase: "我来自...", pinyin: "wǒ lái zì...", meaning: "Я из...", breakdown: "我 (я) + 来自 (происходить из)" },
  { phrase: "你会说英语吗", pinyin: "nǐ huì shuō yīng yǔ ma", meaning: "Ты говоришь по-английски?", breakdown: "你 (ты) + 会 (уметь) + 说 (говорить) + 英语 (английский) + 吗" },
  { phrase: "我听不懂", pinyin: "wǒ tīng bu dǒng", meaning: "Я не понимаю (на слух)", breakdown: "我 (я) + 听 (слушать) + 不 (не) + 懂 (понимать)" },
  { phrase: "我看不懂", pinyin: "wǒ kàn bu dǒng", meaning: "Я не понимаю (читая)", breakdown: "我 (я) + 看 (смотреть/читать) + 不 + 懂" },
  { phrase: "你明白吗", pinyin: "nǐ míng bai ma", meaning: "Ты понимаешь?", breakdown: "你 (ты) + 明白 (понимать) + 吗" },
  { phrase: "我明白了", pinyin: "wǒ míng bai le", meaning: "Я понял", breakdown: "我 (я) + 明白 (понял) + 了 (завершение)" },
  { phrase: "我不知道", pinyin: "wǒ bù zhī dào", meaning: "Я не знаю", breakdown: "我 (я) + 不 (не) + 知道 (знать)" },
  { phrase: "也许吧", pinyin: "yě xǔ ba", meaning: "Может быть", breakdown: "也许 (возможно) + 吧 (предположение)" },
  { phrase: "当然", pinyin: "dāng rán", meaning: "Конечно", breakdown: "当 (должен) + 然 (так)" },
  
  // Направления и ориентация
  { phrase: "在左边", pinyin: "zài zuǒ biān", meaning: "Слева", breakdown: "在 (находиться) + 左 (левый) + 边 (сторона)" },
  { phrase: "在右边", pinyin: "zài yòu biān", meaning: "Справа", breakdown: "在 + 右 (правый) + 边" },
  { phrase: "在前面", pinyin: "zài qián miàn", meaning: "Спереди", breakdown: "在 + 前 (перед) + 面 (сторона)" },
  { phrase: "在后面", pinyin: "zài hòu miàn", meaning: "Сзади", breakdown: "在 + 后 (зад) + 面" },
  { phrase: "在上面", pinyin: "zài shàng miàn", meaning: "Сверху", breakdown: "在 + 上 (верх) + 面" },
  { phrase: "在下面", pinyin: "zài xià miàn", meaning: "Снизу", breakdown: "在 + 下 (низ) + 面" },
  { phrase: "在里面", pinyin: "zài lǐ miàn", meaning: "Внутри", breakdown: "在 + 里 (внутри) + 面" },
  { phrase: "在外面", pinyin: "zài wài miàn", meaning: "Снаружи", breakdown: "在 + 外 (снаружи) + 面" },
  { phrase: "在旁边", pinyin: "zài páng biān", meaning: "Рядом", breakdown: "在 + 旁 (рядом) + 边" },
  { phrase: "对面", pinyin: "duì miàn", meaning: "Напротив", breakdown: "对 (напротив) + 面 (сторона)" },
  { phrase: "一直走", pinyin: "yī zhí zǒu", meaning: "Идите прямо", breakdown: "一 (один) + 直 (прямой) + 走 (идти)" },
  { phrase: "向左转", pinyin: "xiàng zuǒ zhuǎn", meaning: "Поверните налево", breakdown: "向 (направление) + 左 (левый) + 转 (поворачивать)" },
  { phrase: "向右转", pinyin: "xiàng yòu zhuǎn", meaning: "Поверните направо", breakdown: "向 + 右 (правый) + 转" },
  { phrase: "往前走", pinyin: "wǎng qián zǒu", meaning: "Идите вперёд", breakdown: "往 (направление) + 前 (вперёд) + 走" },
  { phrase: "往回走", pinyin: "wǎng huí zǒu", meaning: "Идите назад", breakdown: "往 + 回 (назад) + 走" },
  { phrase: "第一个路口", pinyin: "dì yī gè lù kǒu", meaning: "Первый перекрёсток", breakdown: "第 (порядок) + 一 (один) + 个 (сч.слово) + 路口 (перекрёсток)" },
  { phrase: "在拐角处", pinyin: "zài guǎi jiǎo chù", meaning: "На углу", breakdown: "在 + 拐角 (угол) + 处 (место)" },
  
  // В магазине и ресторане
  { phrase: "多少钱", pinyin: "duō shao qián", meaning: "Сколько стоит?", breakdown: "多少 (сколько) + 钱 (деньги)" },
  { phrase: "太贵了", pinyin: "tài guì le", meaning: "Слишком дорого", breakdown: "太 (слишком) + 贵 (дорогой) + 了" },
  { phrase: "便宜一点", pinyin: "pián yi yī diǎn", meaning: "Немного дешевле", breakdown: "便宜 (дешёвый) + 一点 (немного)" },
  { phrase: "我要这个", pinyin: "wǒ yào zhè ge", meaning: "Я хочу это", breakdown: "我 + 要 (хотеть) + 这个 (это)" },
  { phrase: "我可以试试吗", pinyin: "wǒ kě yǐ shì shi ma", meaning: "Можно примерить?", breakdown: "我 + 可以 (можно) + 试试 (попробовать) + 吗" },
  { phrase: "有...吗", pinyin: "yǒu...ma", meaning: "Есть...?", breakdown: "有 (иметь) + 吗" },
  { phrase: "我要买单", pinyin: "wǒ yào mǎi dān", meaning: "Я хочу заплатить (счёт)", breakdown: "我要 (я хочу) + 买单 (оплатить счёт)" },
  { phrase: "菜单", pinyin: "cài dān", meaning: "Меню", breakdown: "菜 (блюдо) + 单 (список)" },
  { phrase: "服务员", pinyin: "fú wù yuán", meaning: "Официант", breakdown: "服务 (обслуживание) + 员 (работник)" },
  { phrase: "这个很好吃", pinyin: "zhè ge hěn hǎo chī", meaning: "Это очень вкусно", breakdown: "这个 (это) + 很 (очень) + 好吃 (вкусно)" },
  { phrase: "我不吃辣", pinyin: "wǒ bù chī là", meaning: "Я не ем острое", breakdown: "我 + 不 + 吃 (есть) + 辣 (острое)" },
  
  // Разговорные фразы
  { phrase: "加油", pinyin: "jiā yóu", meaning: "Держись!/Давай!", breakdown: "加 (добавлять) + 油 (масло) — 'поддать газу'" },
  { phrase: "慢慢来", pinyin: "màn man lái", meaning: "Не торопись", breakdown: "慢慢 (медленно) + 来 (делать)" },
  { phrase: "没关系", pinyin: "méi guān xi", meaning: "Ничего/Неважно", breakdown: "没 (нет) + 关系 (связи)" },
  { phrase: "没问题", pinyin: "méi wèn tí", meaning: "Нет проблем", breakdown: "没 + 问题 (проблема)" },
  { phrase: "真的吗", pinyin: "zhēn de ma", meaning: "Правда?", breakdown: "真的 (правда) + 吗" },
  { phrase: "太好了", pinyin: "tài hǎo le", meaning: "Отлично!", breakdown: "太 + 好 + 了" },
  { phrase: "糟糕", pinyin: "zāo gāo", meaning: "Плохо!/Ой!", breakdown: "糟糕 (плохо/провал)" },
  { phrase: "小心", pinyin: "xiǎo xīn", meaning: "Осторожно!", breakdown: "小 (маленький) + 心 (сердце) — 'будь внимателен'" },
  { phrase: "快点", pinyin: "kuài diǎn", meaning: "Быстрее!", breakdown: "快 (быстрый) + 点 (немного)" },
  { phrase: "等一下", pinyin: "děng yī xià", meaning: "Подожди минутку", breakdown: "等 (ждать) + 一下 (немного)" },
  { phrase: "不好意思", pinyin: "bù hǎo yì si", meaning: "Извините/Неудобно", breakdown: "不 + 好意思 (неудобно)" },
  { phrase: "辛苦了", pinyin: "xīn kǔ le", meaning: "Хорошо поработали (спасибо за труд)", breakdown: "辛苦 (тяжёлый труд) + 了" },
  
  // Время
  { phrase: "现在几点", pinyin: "xiàn zài jǐ diǎn", meaning: "Который час?", breakdown: "现在 (сейчас) + 几点 (сколько часов)" },
  { phrase: "早上", pinyin: "zǎo shang", meaning: "Утром", breakdown: "早 (ранний) + 上 (верх)" },
  { phrase: "下午", pinyin: "xià wǔ", meaning: "Днём", breakdown: "下 (низ) + 午 (полдень)" },
  { phrase: "晚上", pinyin: "wǎn shang", meaning: "Вечером", breakdown: "晚 (поздний) + 上" },
  { phrase: "今天", pinyin: "jīn tiān", meaning: "Сегодня", breakdown: "今 (сейчас) + 天 (день)" },
  { phrase: "明天", pinyin: "míng tiān", meaning: "Завтра", breakdown: "明 (светлый/следующий) + 天" },
  { phrase: "昨天", pinyin: "zuó tiān", meaning: "Вчера", breakdown: "昨 (предыдущий) + 天" },
  { phrase: "现在", pinyin: "xiàn zài", meaning: "Сейчас", breakdown: "现 (сейчас) + 在 (быть в процессе)" },
  { phrase: "马上", pinyin: "mǎ shàng", meaning: "Сразу/Сейчас", breakdown: "马 (лошадь) + 上 (на) — 'верхом'" }
];

// Загрузка словаря
async function loadDictionary() {
  try {
    const response = await fetch('hsk.json');
    fullDictionary = await response.json();
    
    const savedLearned = localStorage.getItem('chincards_learned');
    if (savedLearned) learnedIds = new Set(JSON.parse(savedLearned));
    
    const savedYellow = localStorage.getItem('chincards_yellow');
    if (savedYellow) {
      const parsed = JSON.parse(savedYellow);
      yellowCards = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    const savedRed = localStorage.getItem('chincards_red');
    if (savedRed) {
      const parsed = JSON.parse(savedRed);
      redCards = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    // Инициализируем фразы с ID
    for (let i = 0; i < phrasesList.length; i++) {
      const phrase = { ...phrasesList[i] };
      phrase.id = `phrase_${i}`;
      phrase.isPhrase = true;
      phrasesDatabase.push(phrase);
    }
    
    const savedPhrasesLearned = localStorage.getItem('chincards_phrases_learned');
    if (savedPhrasesLearned) learnedPhrasesIds = new Set(JSON.parse(savedPhrasesLearned));
    
    const savedPhrasesYellow = localStorage.getItem('chincards_phrases_yellow');
    if (savedPhrasesYellow) {
      const parsed = JSON.parse(savedPhrasesYellow);
      yellowPhrases = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    const savedPhrasesRed = localStorage.getItem('chincards_phrases_red');
    if (savedPhrasesRed) {
      const parsed = JSON.parse(savedPhrasesRed);
      redPhrases = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    console.log(`Загружено: слов ${fullDictionary.length}, фраз ${phrasesDatabase.length}`);
    initForLevel(activeLevel);
  } catch (err) {
    console.error('Ошибка загрузки', err);
  }
}

function saveAllData() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  localStorage.setItem('chincards_yellow', JSON.stringify(Array.from(yellowCards.entries()).map(([id, date]) => ({ id, until: date.toISOString() }))));
  localStorage.setItem('chincards_red', JSON.stringify(Array.from(redCards.entries()).map(([id, date]) => ({ id, until: date.toISOString() }))));
  localStorage.setItem('chincards_phrases_learned', JSON.stringify([...learnedPhrasesIds]));
  localStorage.setItem('chincards_phrases_yellow', JSON.stringify(Array.from(yellowPhrases.entries()).map(([id, date]) => ({ id, until: date.toISOString() }))));
  localStorage.setItem('chincards_phrases_red', JSON.stringify(Array.from(redPhrases.entries()).map(([id, date]) => ({ id, until: date.toISOString() }))));
}

function getAvailablePhrases() {
  return phrasesDatabase.filter(p => 
    !learnedPhrasesIds.has(p.id) && 
    !yellowPhrases.has(p.id) && 
    !redPhrases.has(p.id)
  );
}

function checkReturnedCards() {
  const now = new Date();
  for (let [id, untilDate] of yellowCards) if (untilDate <= now) yellowCards.delete(id);
  for (let [id, untilDate] of redCards) if (untilDate <= now) redCards.delete(id);
  for (let [id, untilDate] of yellowPhrases) if (untilDate <= now) yellowPhrases.delete(id);
  for (let [id, untilDate] of redPhrases) if (untilDate <= now) redPhrases.delete(id);
  saveAllData();
}

function getNextReturnDate(status) {
  const now = new Date();
  let daysToAdd = status === 'yellow' ? 2 : (status === 'red' ? 7 : Math.floor(Math.random() * 30 + 21));
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysToAdd);
  return nextDate;
}

function initForLevel(level) {
  activeLevel = level;
  checkReturnedCards();
  
  const allLevelWords = fullDictionary.filter(w => w.level == level);
  currentLevelWords = allLevelWords.filter(w => !learnedIds.has(w.id) && !yellowCards.has(w.id) && !redCards.has(w.id));
  
  currentLevelWords = shuffleArray([...currentLevelWords]);
  currentCardIndex = 0;
  wordsSinceLastPhrase = 0;
  isPhraseCard = false;
  
  const availablePhrases = getAvailablePhrases();
  phraseQueue = shuffleArray([...availablePhrases]);
  
  updateAllStats();
  loadNextCard();
}

function loadNextCard() {
  const availablePhrases = getAvailablePhrases();
  
  if (wordsSinceLastPhrase >= 5 && availablePhrases.length > 0 && currentLevelWords.length > 0) {
    if (phraseQueue.length === 0) phraseQueue = shuffleArray([...availablePhrases]);
    currentPhraseCard = phraseQueue.shift();
    isPhraseCard = true;
    currentCard = currentPhraseCard;
    wordsSinceLastPhrase = 0;
  } else if (currentLevelWords.length > 0) {
    if (currentCardIndex >= currentLevelWords.length) currentCardIndex = 0;
    currentCard = currentLevelWords[currentCardIndex];
    isPhraseCard = false;
    wordsSinceLastPhrase++;
  } else if (availablePhrases.length > 0) {
    if (phraseQueue.length === 0) phraseQueue = shuffleArray([...availablePhrases]);
    currentPhraseCard = phraseQueue.shift();
    isPhraseCard = true;
    currentCard = currentPhraseCard;
    wordsSinceLastPhrase = 0;
  } else {
    currentCard = null;
    isPhraseCard = false;
  }
  
  isFlipped = false;
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  
  updateCardDisplay();
  updateCardColor();
}

function updateCardColor() {
  const card = document.getElementById('flashcard');
  if (!card || !currentCard) return;
  
  const cardFront = card.querySelector('.card-front');
  const cardBack = card.querySelector('.card-back');
  
  cardFront.classList.remove('yellow-card', 'red-card', 'phrase-card');
  cardBack.classList.remove('yellow-card', 'red-card', 'phrase-card');
  
  if (currentCard.isPhrase) {
    cardFront.classList.add('phrase-card');
    cardBack.classList.add('phrase-card');
    if (yellowPhrases.has(currentCard.id)) {
      cardFront.classList.add('yellow-card');
      cardBack.classList.add('yellow-card');
    } else if (redPhrases.has(currentCard.id)) {
      cardFront.classList.add('red-card');
      cardBack.classList.add('red-card');
    }
  } else {
    if (yellowCards.has(currentCard.id)) {
      cardFront.classList.add('yellow-card');
      cardBack.classList.add('yellow-card');
    } else if (redCards.has(currentCard.id)) {
      cardFront.classList.add('red-card');
      cardBack.classList.add('red-card');
    }
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateCardDisplay() {
  if (!currentCard) {
    document.getElementById('chineseChar').innerText = '🎉';
    document.getElementById('pinyin').innerHTML = '';
    document.getElementById('meaning').innerHTML = 'Все слова и фразы выучены!';
    document.getElementById('breakdown').innerHTML = '';
    return;
  }
  
  document.getElementById('chineseChar').innerText = currentCard.phrase || currentCard.hanzi;
  document.getElementById('pinyin').innerHTML = currentCard.pinyin;
  
  if (currentCard.isPhrase) {
    document.getElementById('meaning').innerHTML = currentCard.meaning;
    document.getElementById('breakdown').innerHTML = `<span style="color: #88ccff;">📖 Разбор:</span> ${currentCard.breakdown || currentCard.meaning}`;
  } else {
    const meaning = currentCard.translations?.rus?.[0] || "(нет перевода)";
    document.getElementById('meaning').innerHTML = meaning;
    document.getElementById('breakdown').innerHTML = '';
  }
  
  updateCardColor();
}

function updateAllStats() {
  const allLevelWords = fullDictionary.filter(w => w.level == activeLevel);
  const availableWords = allLevelWords.filter(w => !learnedIds.has(w.id) && !yellowCards.has(w.id) && !redCards.has(w.id));
  document.getElementById('cardsLeft').innerText = availableWords.length;
  document.getElementById('totalLearned').innerText = learnedIds.size;
}

function speakWord(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function flipCard() {
  if (!currentCard) return;
  const card = document.getElementById('flashcard');
  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add('flipped');
    speakWord(currentCard.phrase || currentCard.hanzi);
  } else {
    card.classList.remove('flipped');
  }
}

function swipeLeft() {
  if (!currentCard) return;
  
  const isPhrase = currentCard.isPhrase;
  const id = currentCard.id;
  
  if (isPhrase) {
    if (redPhrases.has(id)) {
      const nextDate = getNextReturnDate('yellow');
      redPhrases.delete(id);
      yellowPhrases.set(id, nextDate);
    } else if (yellowPhrases.has(id)) {
      yellowPhrases.delete(id);
    }
  } else {
    if (redCards.has(id)) {
      const nextDate = getNextReturnDate('yellow');
      redCards.delete(id);
      yellowCards.set(id, nextDate);
    } else if (yellowCards.has(id)) {
      yellowCards.delete(id);
    }
  }
  
  saveAllData();
  initForLevel(activeLevel);
  animateSwipe('left');
}

function swipeRight() {
  if (!currentCard) return;
  
  const isPhrase = currentCard.isPhrase;
  const id = currentCard.id;
  
  if (isPhrase) {
    if (yellowPhrases.has(id)) {
      const nextDate = getNextReturnDate('red');
      redPhrases.set(id, nextDate);
      yellowPhrases.delete(id);
    } else if (redPhrases.has(id)) {
      learnedPhrasesIds.add(id);
      redPhrases.delete(id);
    } else if (learnedPhrasesIds.has(id)) {
      const nextDate = getNextReturnDate('review');
      redPhrases.set(id, nextDate);
      learnedPhrasesIds.delete(id);
    } else {
      const nextDate = getNextReturnDate('yellow');
      yellowPhrases.set(id, nextDate);
    }
  } else {
    if (yellowCards.has(id)) {
      const nextDate = getNextReturnDate('red');
      redCards.set(id, nextDate);
      yellowCards.delete(id);
    } else if (redCards.has(id)) {
      learnedIds.add(id);
      redCards.delete(id);
    } else if (learnedIds.has(id)) {
      const nextDate = getNextReturnDate('review');
      redCards.set(id, nextDate);
      learnedIds.delete(id);
    } else {
      const nextDate = getNextReturnDate('yellow');
      yellowCards.set(id, nextDate);
    }
  }
  
  saveAllData();
  initForLevel(activeLevel);
  animateSwipe('right');
}

function animateSwipe(direction) {
  const container = document.querySelector('.card-container');
  if (!container) return;
  container.classList.add(`swipe-${direction}`);
  setTimeout(() => {
    container.classList.remove(`swipe-${direction}`);
  }, 300);
}

function attachTouchEvents() {
  const container = document.querySelector('.card-container');
  if (!container) return;
  
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: false });
  
  container.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 10) e.preventDefault();
  }, { passive: false });
  
  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) swipeRight();
      else swipeLeft();
    }
    isSwiping = false;
  });
  
  let mouseStartX = 0;
  container.addEventListener('mousedown', (e) => {
    mouseStartX = e.clientX;
    isSwiping = true;
  });
  container.addEventListener('mouseup', (e) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - mouseStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) swipeRight();
      else swipeLeft();
    }
    isSwiping = false;
  });
}

function setupLevelSwitcher() {
  const btns = document.querySelectorAll('.level-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const level = parseInt(btn.dataset.level);
      if (level === activeLevel) return;
      activeLevel = level;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initForLevel(activeLevel);
    });
  });
}

function initSpeech() {
  if (window.speechSynthesis) {
    const dummy = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(dummy);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDictionary();
  setupLevelSwitcher();
  attachTouchEvents();
  initSpeech();
  
  const card = document.getElementById('flashcard');
  if (card) {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      flipCard();
    });
  }
});
