let fullDictionary = [];
let activeLevel = 1;

// Статусы слов
let learnedIds = new Set();
let yellowCards = new Map();   // id -> дата возврата
let redCards = new Map();

// Статусы фраз
let phrasesDatabase = [];
let learnedPhrasesIds = new Set();
let yellowPhrases = new Map();
let redPhrases = new Map();

// Текущая "колода" слов (только доступные, перемешанные)
let currentDeck = [];          // массив слов
let currentDeckIndex = 0;      // позиция в колоде
let cardsSinceLastPhrase = 0;   // сколько слов показано после последней фразы

let currentCard = null;
let isFlipped = false;
let touchStartX = 0;
let isSwiping = false;

// ========== ФРАЗЫ ==========
const phrasesList = [
  { text: "你好", pinyin: "nǐ hǎo", translation: "Здравствуйте", breakdown: "你 (ты) + 好 (хорошо)" },
  { text: "您好", pinyin: "nín hǎo", translation: "Здравствуйте (уважительно)", breakdown: "您 (Вы) + 好" },
  { text: "早上好", pinyin: "zǎo shang hǎo", translation: "Доброе утро", breakdown: "早上 (утро) + 好" },
  { text: "晚上好", pinyin: "wǎn shang hǎo", translation: "Добрый вечер", breakdown: "晚上 (вечер) + 好" },
  { text: "晚安", pinyin: "wǎn ān", translation: "Спокойной ночи", breakdown: "晚 (вечер) + 安 (спокойствие)" },
  { text: "再见", pinyin: "zài jiàn", translation: "До свидания", breakdown: "再 (снова) + 见 (видеть)" },
  { text: "谢谢", pinyin: "xiè xie", translation: "Спасибо", breakdown: "谢 (благодарить)" },
  { text: "不客气", pinyin: "bù kè qi", translation: "Пожалуйста", breakdown: "不 (не) + 客气 (вежливый)" },
  { text: "对不起", pinyin: "duì bu qǐ", translation: "Извините", breakdown: "对 (правильно) + 不起 (не получается)" },
  { text: "没关系", pinyin: "méi guān xi", translation: "Ничего страшного", breakdown: "没 (нет) + 关系 (связи)" },
  { text: "你好吗", pinyin: "nǐ hǎo ma", translation: "Как дела?", breakdown: "你 + 好 + 吗 (вопрос)" },
  { text: "我很好", pinyin: "wǒ hěn hǎo", translation: "У меня всё хорошо", breakdown: "我 (я) + 很 (очень) + 好" },
  { text: "你叫什么名字", pinyin: "nǐ jiào shén me míng zi", translation: "Как тебя зовут?", breakdown: "你 + 叫 (звать) + 什么 (что) + 名字 (имя)" },
  { text: "我不知道", pinyin: "wǒ bù zhī dào", translation: "Я не знаю", breakdown: "我 + 不 + 知道 (знать)" },
  { text: "我明白了", pinyin: "wǒ míng bai le", translation: "Я понял", breakdown: "我 + 明白 (понять) + 了" },
  { text: "在左边", pinyin: "zài zuǒ biān", translation: "Слева", breakdown: "在 + 左 (левый) + 边 (сторона)" },
  { text: "在右边", pinyin: "zài yòu biān", translation: "Справа", breakdown: "在 + 右 (правый) + 边" },
  { text: "一直走", pinyin: "yī zhí zǒu", translation: "Идите прямо", breakdown: "一 (один) + 直 (прямой) + 走 (идти)" },
  { text: "向左转", pinyin: "xiàng zuǒ zhuǎn", translation: "Поверните налево", breakdown: "向 + 左 + 转" },
  { text: "向右转", pinyin: "xiàng yòu zhuǎn", translation: "Поверните направо", breakdown: "向 + 右 + 转" },
  { text: "多少钱", pinyin: "duō shao qián", translation: "Сколько стоит?", breakdown: "多少 (сколько) + 钱 (деньги)" },
  { text: "太贵了", pinyin: "tài guì le", translation: "Слишком дорого", breakdown: "太 (слишком) + 贵 (дорогой) + 了" },
  { text: "我要这个", pinyin: "wǒ yào zhè ge", translation: "Я хочу это", breakdown: "我 + 要 + 这个" },
  { text: "加油", pinyin: "jiā yóu", translation: "Держись!/Давай!", breakdown: "加 + 油" },
  { text: "慢慢来", pinyin: "màn man lái", translation: "Не торопись", breakdown: "慢慢 + 来" },
  { text: "真的吗", pinyin: "zhēn de ma", translation: "Правда?", breakdown: "真的 + 吗" },
  { text: "太好了", pinyin: "tài hǎo le", translation: "Отлично!", breakdown: "太 + 好 + 了" },
  { text: "小心", pinyin: "xiǎo xīn", translation: "Осторожно!", breakdown: "小 (маленький) + 心 (сердце)" },
  { text: "等一下", pinyin: "děng yī xià", translation: "Подожди", breakdown: "等 + 一下" },
  { text: "现在几点", pinyin: "xiàn zài jǐ diǎn", translation: "Который час?", breakdown: "现在 (сейчас) + 几点" },
  { text: "今天", pinyin: "jīn tiān", translation: "Сегодня", breakdown: "今 + 天" },
  { text: "明天", pinyin: "míng tiān", translation: "Завтра", breakdown: "明 + 天" },
  { text: "昨天", pinyin: "zuó tiān", translation: "Вчера", breakdown: "昨 + 天" }
];

// ========== ЗАГРУЗКА ==========
async function loadDictionary() {
  try {
    const response = await fetch('hsk.json');
    fullDictionary = await response.json();
    
    const saved = localStorage.getItem('chincards_learned');
    if (saved) learnedIds = new Set(JSON.parse(saved));
    
    const savedY = localStorage.getItem('chincards_yellow');
    if (savedY) {
      const parsed = JSON.parse(savedY);
      yellowCards = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    const savedR = localStorage.getItem('chincards_red');
    if (savedR) {
      const parsed = JSON.parse(savedR);
      redCards = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    for (let i = 0; i < phrasesList.length; i++) {
      phrasesDatabase.push({
        id: `p_${i}`,
        isPhrase: true,
        text: phrasesList[i].text,
        pinyin: phrasesList[i].pinyin,
        translation: phrasesList[i].translation,
        breakdown: phrasesList[i].breakdown
      });
    }
    
    const savedPL = localStorage.getItem('chincards_phrases_learned');
    if (savedPL) learnedPhrasesIds = new Set(JSON.parse(savedPL));
    
    const savedPY = localStorage.getItem('chincards_phrases_yellow');
    if (savedPY) {
      const parsed = JSON.parse(savedPY);
      yellowPhrases = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    const savedPR = localStorage.getItem('chincards_phrases_red');
    if (savedPR) {
      const parsed = JSON.parse(savedPR);
      redPhrases = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    initLevel(activeLevel);
  } catch(e) {
    console.error(e);
  }
}

function saveAll() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  localStorage.setItem('chincards_yellow', JSON.stringify(Array.from(yellowCards.entries()).map(([id, d]) => ({ id, until: d.toISOString() }))));
  localStorage.setItem('chincards_red', JSON.stringify(Array.from(redCards.entries()).map(([id, d]) => ({ id, until: d.toISOString() }))));
  localStorage.setItem('chincards_phrases_learned', JSON.stringify([...learnedPhrasesIds]));
  localStorage.setItem('chincards_phrases_yellow', JSON.stringify(Array.from(yellowPhrases.entries()).map(([id, d]) => ({ id, until: d.toISOString() }))));
  localStorage.setItem('chincards_phrases_red', JSON.stringify(Array.from(redPhrases.entries()).map(([id, d]) => ({ id, until: d.toISOString() }))));
}

function getAvailablePhrases() {
  return phrasesDatabase.filter(p => !learnedPhrasesIds.has(p.id) && !yellowPhrases.has(p.id) && !redPhrases.has(p.id));
}

function checkReturns() {
  const now = new Date();
  for (let [id, date] of yellowCards) if (date <= now) yellowCards.delete(id);
  for (let [id, date] of redCards) if (date <= now) redCards.delete(id);
  for (let [id, date] of yellowPhrases) if (date <= now) yellowPhrases.delete(id);
  for (let [id, date] of redPhrases) if (date <= now) redPhrases.delete(id);
  saveAll();
}

function getNextDate(type) {
  const d = new Date();
  let days = type === 'yellow' ? 2 : (type === 'red' ? 7 : Math.floor(Math.random() * 30 + 21));
  d.setDate(d.getDate() + days);
  return d;
}

// Построение колоды из доступных слов (исключая выученные, жёлтые, красные)
function buildDeck() {
  const allLevelWords = fullDictionary.filter(w => w.level == activeLevel);
  const available = allLevelWords.filter(w => !learnedIds.has(w.id) && !yellowCards.has(w.id) && !redCards.has(w.id));
  return shuffleArray([...available]);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Инициализация уровня: создаём перемешанную колоду, сбрасываем индекс и счётчик фраз
function initLevel(level) {
  activeLevel = level;
  checkReturns();
  currentDeck = buildDeck();
  currentDeckIndex = 0;
  cardsSinceLastPhrase = 0;
  updateStats();
  loadNextCard();
}

// Загрузить следующую карточку (слово или фразу)
function loadNextCard() {
  const availablePhrases = getAvailablePhrases();
  
  // Если колода закончилась, пересоздаём её (новая перемешанная)
  if (currentDeckIndex >= currentDeck.length) {
    currentDeck = buildDeck();
    currentDeckIndex = 0;
  }
  
  // Решаем, показывать фразу или слово
  let showPhrase = false;
  if (availablePhrases.length > 0 && cardsSinceLastPhrase >= 5) {
    showPhrase = true;
  }
  
  if (showPhrase) {
    // Берём случайную фразу
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    cardsSinceLastPhrase = 0;
    console.log("ФРАЗА:", currentCard.text);
  } else {
    // Если нет доступных слов, показываем фразу
    if (currentDeck.length === 0 && availablePhrases.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePhrases.length);
      currentCard = availablePhrases[randomIndex];
      cardsSinceLastPhrase = 0;
      console.log("ФРАЗА (нет слов):", currentCard.text);
    } else if (currentDeck.length > 0 && currentDeckIndex < currentDeck.length) {
      currentCard = currentDeck[currentDeckIndex];
      currentDeckIndex++;
      cardsSinceLastPhrase++;
      console.log("СЛОВО:", currentCard.hanzi, `(${currentDeckIndex}/${currentDeck.length})`, `До фразы: ${5 - cardsSinceLastPhrase}`);
    } else {
      currentCard = null;
    }
  }
  
  isFlipped = false;
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  
  updateDisplay();
  updateCardStyle();
}

function updateCardStyle() {
  const card = document.getElementById('flashcard');
  if (!card || !currentCard) return;
  
  const front = card.querySelector('.card-front');
  const back = card.querySelector('.card-back');
  
  front.classList.remove('yellow', 'red', 'phrase');
  back.classList.remove('yellow', 'red', 'phrase');
  
  if (currentCard.isPhrase) {
    front.classList.add('phrase');
    back.classList.add('phrase');
    if (yellowPhrases.has(currentCard.id)) {
      front.classList.add('yellow');
      back.classList.add('yellow');
    } else if (redPhrases.has(currentCard.id)) {
      front.classList.add('red');
      back.classList.add('red');
    }
  } else {
    if (yellowCards.has(currentCard.id)) {
      front.classList.add('yellow');
      back.classList.add('yellow');
    } else if (redCards.has(currentCard.id)) {
      front.classList.add('red');
      back.classList.add('red');
    }
  }
}

function updateDisplay() {
  if (!currentCard) {
    document.getElementById('chineseChar').innerText = '🎉';
    document.getElementById('pinyin').innerHTML = '';
    document.getElementById('meaning').innerHTML = 'Все слова и фразы выучены!';
    document.getElementById('breakdown').innerHTML = '';
    return;
  }
  
  document.getElementById('chineseChar').innerText = currentCard.text || currentCard.hanzi;
  document.getElementById('pinyin').innerHTML = currentCard.pinyin;
  
  if (currentCard.isPhrase) {
    document.getElementById('meaning').innerHTML = currentCard.translation;
    document.getElementById('breakdown').innerHTML = `📖 ${currentCard.breakdown}`;
  } else {
    const meaning = currentCard.translations?.rus?.[0] || "(нет перевода)";
    document.getElementById('meaning').innerHTML = meaning;
    document.getElementById('breakdown').innerHTML = '';
  }
  
  updateCardStyle();
}

function updateStats() {
  const all = fullDictionary.filter(w => w.level == activeLevel);
  const left = all.filter(w => !learnedIds.has(w.id) && !yellowCards.has(w.id) && !redCards.has(w.id)).length;
  document.getElementById('cardsLeft').innerText = left;
  document.getElementById('totalLearned').innerText = learnedIds.size;
}

function speak(t) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function flip() {
  if (!currentCard) return;
  const card = document.getElementById('flashcard');
  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add('flipped');
    speak(currentCard.text || currentCard.hanzi);
  } else {
    card.classList.remove('flipped');
  }
}

// Свайп влево (не знаю) - понижаем статус
function onSwipeLeft() {
  if (!currentCard) return;
  
  if (currentCard.isPhrase) {
    if (redPhrases.has(currentCard.id)) {
      redPhrases.delete(currentCard.id);
      yellowPhrases.set(currentCard.id, getNextDate('yellow'));
    } else if (yellowPhrases.has(currentCard.id)) {
      yellowPhrases.delete(currentCard.id);
    }
    // Обычная фраза без статуса — ничего не делаем, просто убираем
  } else {
    if (redCards.has(currentCard.id)) {
      redCards.delete(currentCard.id);
      yellowCards.set(currentCard.id, getNextDate('yellow'));
    } else if (yellowCards.has(currentCard.id)) {
      yellowCards.delete(currentCard.id);
    }
  }
  
  saveAll();
  // После изменения статуса перестраиваем колоду, но не сбрасываем счётчик фраз
  rebuildDeckAndContinue();
  animate('left');
}

// Свайп вправо (знаю) - повышаем статус
function onSwipeRight() {
  if (!currentCard) return;
  
  if (currentCard.isPhrase) {
    if (yellowPhrases.has(currentCard.id)) {
      yellowPhrases.delete(currentCard.id);
      redPhrases.set(currentCard.id, getNextDate('red'));
    } else if (redPhrases.has(currentCard.id)) {
      learnedPhrasesIds.add(currentCard.id);
      redPhrases.delete(currentCard.id);
    } else if (learnedPhrasesIds.has(currentCard.id)) {
      learnedPhrasesIds.delete(currentCard.id);
      redPhrases.set(currentCard.id, getNextDate('review'));
    } else {
      yellowPhrases.set(currentCard.id, getNextDate('yellow'));
    }
  } else {
    if (yellowCards.has(currentCard.id)) {
      yellowCards.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDate('red'));
    } else if (redCards.has(currentCard.id)) {
      learnedIds.add(currentCard.id);
      redCards.delete(currentCard.id);
    } else if (learnedIds.has(currentCard.id)) {
      learnedIds.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDate('review'));
    } else {
      yellowCards.set(currentCard.id, getNextDate('yellow'));
    }
  }
  
  saveAll();
  rebuildDeckAndContinue();
  animate('right');
}

// Перестраивает колоду, сохраняя позицию, если текущее слово ещё в колоде
function rebuildDeckAndContinue() {
  const newDeck = buildDeck();
  if (currentCard && !currentCard.isPhrase) {
    const oldId = currentCard.id;
    const newIndex = newDeck.findIndex(w => w.id === oldId);
    if (newIndex !== -1) {
      currentDeck = newDeck;
      currentDeckIndex = newIndex;
    } else {
      currentDeck = newDeck;
      currentDeckIndex = 0;
    }
  } else {
    currentDeck = newDeck;
    currentDeckIndex = 0;
  }
  // Счётчик фраз не сбрасываем — фразы продолжают выпадать ритмично
  loadNextCard();
}

function animate(dir) {
  const c = document.querySelector('.card-container');
  if (!c) return;
  c.classList.add(`swipe-${dir}`);
  setTimeout(() => c.classList.remove(`swipe-${dir}`), 300);
}

function setupTouch() {
  const c = document.querySelector('.card-container');
  if (!c) return;
  
  c.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: false });
  
  c.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 10) e.preventDefault();
  }, { passive: false });
  
  c.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) onSwipeRight();
      else onSwipeLeft();
    }
    isSwiping = false;
  });
  
  let mx = 0;
  c.addEventListener('mousedown', (e) => { mx = e.clientX; isSwiping = true; });
  c.addEventListener('mouseup', (e) => {
    if (!isSwiping) return;
    const delta = e.clientX - mx;
    if (Math.abs(delta) > 50) {
      if (delta > 0) onSwipeRight();
      else onSwipeLeft();
    }
    isSwiping = false;
  });
}

function setupLevels() {
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.level);
      if (lvl === activeLevel) return;
      activeLevel = lvl;
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initLevel(activeLevel);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadDictionary();
  setupLevels();
  setupTouch();
  
  const card = document.getElementById('flashcard');
  if (card) card.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
});
