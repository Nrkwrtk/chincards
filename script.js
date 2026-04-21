let fullDictionary = [];
let activeLevel = 1;
let isPhraseOnlyMode = false;  // Режим только фраз

// Статусы слов (HSK)
let learnedIds = new Set();
let yellowCards = new Map();
let redCards = new Map();

// Статусы фраз
let phraseStatus = new Map();
let learnedPhrasesIds = new Set();

let phrasesDatabase = [];

let currentDeck = [];
let currentDeckIndex = 0;
let cardsSinceLastPhrase = 0;

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
    
    const savedPhraseStatus = localStorage.getItem('chincards_phrase_status');
    if (savedPhraseStatus) {
      const parsed = JSON.parse(savedPhraseStatus);
      for (let item of parsed) {
        phraseStatus.set(item.id, { level: item.level, returnDate: new Date(item.returnDate) });
      }
    }
    
    const savedPhrasesLearned = localStorage.getItem('chincards_phrases_learned');
    if (savedPhrasesLearned) learnedPhrasesIds = new Set(JSON.parse(savedPhrasesLearned));
    
    initLevel(activeLevel);
  } catch(e) {
    console.error(e);
  }
}

function saveAll() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  localStorage.setItem('chincards_yellow', JSON.stringify(Array.from(yellowCards.entries()).map(([id, d]) => ({ id, until: d.toISOString() }))));
  localStorage.setItem('chincards_red', JSON.stringify(Array.from(redCards.entries()).map(([id, d]) => ({ id, until: d.toISOString() }))));
  
  const phraseStatusArray = Array.from(phraseStatus.entries()).map(([id, data]) => ({
    id, level: data.level, returnDate: data.returnDate.toISOString()
  }));
  localStorage.setItem('chincards_phrase_status', JSON.stringify(phraseStatusArray));
  localStorage.setItem('chincards_phrases_learned', JSON.stringify([...learnedPhrasesIds]));
}

function getAvailablePhrases() {
  const now = new Date();
  return phrasesDatabase.filter(p => {
    if (learnedPhrasesIds.has(p.id)) return false;
    const status = phraseStatus.get(p.id);
    if (status && status.returnDate > now) return false;
    return true;
  });
}

function checkReturns() {
  const now = new Date();
  for (let [id, date] of yellowCards) if (date <= now) yellowCards.delete(id);
  for (let [id, date] of redCards) if (date <= now) redCards.delete(id);
  
  for (let [id, status] of phraseStatus) {
    if (status.returnDate <= now) {
      phraseStatus.delete(id);
    }
  }
  saveAll();
}

function getNextDateForPhrase(currentLevel) {
  const d = new Date();
  let days = currentLevel === 0 ? 2 : 30;
  d.setDate(d.getDate() + days);
  return d;
}

function getNextDateForWord(type) {
  const d = new Date();
  let days = type === 'yellow' ? 2 : 7;
  d.setDate(d.getDate() + days);
  return d;
}

function buildDeck() {
  if (isPhraseOnlyMode) {
    return []; // В режиме только фраз колода слов пуста
  }
  const allLevelWords = fullDictionary.filter(w => w.level == activeLevel);
  const available = allLevelWords.filter(w => !learnedIds.has(w.id) && !yellowCards.has(w.id) && !redCards.has(w.id));
  const shuffled = shuffleArray([...available]);
  console.log(`Построена колода: ${shuffled.length} слов`);
  return shuffled;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initLevel(level) {
  if (!isPhraseOnlyMode) {
    activeLevel = level;
  }
  checkReturns();
  currentDeck = buildDeck();
  currentDeckIndex = 0;
  cardsSinceLastPhrase = 0;
  updateStats();
  loadNextCard();
  console.log(`${isPhraseOnlyMode ? 'РЕЖИМ ТОЛЬКО ФРАЗ' : 'Уровень ' + activeLevel} инициализирован`);
}

function loadNextCard() {
  const availablePhrases = getAvailablePhrases();
  
  // Если колода закончилась или пустая, пересоздаём (только если не в режиме фраз)
  if (!isPhraseOnlyMode && (currentDeckIndex >= currentDeck.length || currentDeck.length === 0)) {
    console.log("Колода закончилась, пересоздаём");
    currentDeck = buildDeck();
    currentDeckIndex = 0;
  }
  
  // В режиме только фраз или если прошло 5 слов и есть фразы
  const showPhrase = isPhraseOnlyMode || (availablePhrases.length > 0 && cardsSinceLastPhrase >= 5);
  
  if (showPhrase && availablePhrases.length > 0) {
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    cardsSinceLastPhrase = 0;
    console.log("ФРАЗА:", currentCard.text);
  } else if (!isPhraseOnlyMode && currentDeck.length > 0 && currentDeckIndex < currentDeck.length) {
    currentCard = currentDeck[currentDeckIndex];
    currentDeckIndex++;
    cardsSinceLastPhrase++;
    console.log(`СЛОВО ${currentDeckIndex}/${currentDeck.length}: ${currentCard.hanzi}, до фразы: ${5 - cardsSinceLastPhrase}`);
  } else if (availablePhrases.length > 0) {
    // Если слов нет совсем, показываем фразу
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    cardsSinceLastPhrase = 0;
    console.log("ФРАЗА (нет слов):", currentCard.text);
  } else {
    currentCard = null;
    console.log("Нет ни слов, ни фраз");
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
  
  front.classList.remove('yellow', 'red', 'phrase-blue', 'phrase-darkblue', 'phrase-navy');
  back.classList.remove('yellow', 'red', 'phrase-blue', 'phrase-darkblue', 'phrase-navy');
  
  if (currentCard.isPhrase) {
    const status = phraseStatus.get(currentCard.id);
    const level = status ? status.level : 0;
    if (level === 0) {
      front.classList.add('phrase-blue');
      back.classList.add('phrase-blue');
    } else if (level === 1) {
      front.classList.add('phrase-darkblue');
      back.classList.add('phrase-darkblue');
    } else {
      front.classList.add('phrase-navy');
      back.classList.add('phrase-navy');
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
    document.getElementById('meaning').innerHTML = 'Всё выучено!';
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

function onSwipeLeft() {
  if (!currentCard) return;
  console.log("СВАЙП ВЛЕВО (не знаю):", currentCard.text || currentCard.hanzi);
  
  if (currentCard.isPhrase) {
    phraseStatus.delete(currentCard.id);
  } else {
    if (redCards.has(currentCard.id)) {
      redCards.delete(currentCard.id);
      yellowCards.set(currentCard.id, getNextDateForWord('yellow'));
    } else if (yellowCards.has(currentCard.id)) {
      yellowCards.delete(currentCard.id);
    }
  }
  
  saveAll();
  loadNextCard();
  animate('left');
}

function onSwipeRight() {
  if (!currentCard) return;
  console.log("СВАЙП ВПРАВО (знаю):", currentCard.text || currentCard.hanzi);
  
  if (currentCard.isPhrase) {
    const currentStatus = phraseStatus.get(currentCard.id);
    const currentLevel = currentStatus ? currentStatus.level : 0;
    
    if (currentLevel === 0) {
      phraseStatus.set(currentCard.id, {
        level: 1,
        returnDate: getNextDateForPhrase(0)
      });
      console.log("Фраза повышена до СИНЕЙ, скрыта на 2 дня");
    } else if (currentLevel === 1) {
      phraseStatus.set(currentCard.id, {
        level: 2,
        returnDate: getNextDateForPhrase(1)
      });
      console.log("Фраза повышена до ТЁМНО-СИНЕЙ, скрыта на месяц");
    } else {
      phraseStatus.set(currentCard.id, {
        level: 2,
        returnDate: getNextDateForPhrase(1)
      });
      console.log("Фраза уже тёмно-синяя, скрыта ещё на месяц");
    }
  } else {
    if (yellowCards.has(currentCard.id)) {
      yellowCards.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDateForWord('red'));
      console.log("Слово повышено до КРАСНОГО, скрыто на 7 дней");
    } else if (redCards.has(currentCard.id)) {
      learnedIds.add(currentCard.id);
      redCards.delete(currentCard.id);
      console.log("Слово ВЫУЧЕНО навсегда! +1 к счётчику");
    } else if (learnedIds.has(currentCard.id)) {
      learnedIds.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDateForWord('red'));
      console.log("Слово отправлено на ПОВТОРЕНИЕ (красное)");
    } else {
      yellowCards.set(currentCard.id, getNextDateForWord('yellow'));
      console.log("Слово повышено до ЖЁЛТОГО, скрыто на 2 дня");
    }
  }
  
  saveAll();
  loadNextCard();
  animate('right');
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
      const value = btn.dataset.level;
      
      if (value === 'phrase') {
        // Режим только фраз
        if (isPhraseOnlyMode) return;
        isPhraseOnlyMode = true;
        // Снимаем активность со всех кнопок HSK
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel(null);
      } else {
        // Обычный режим HSK
        const lvl = parseInt(value);
        if (!isPhraseOnlyMode && lvl === activeLevel) return;
        isPhraseOnlyMode = false;
        activeLevel = lvl;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel(activeLevel);
      }
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
