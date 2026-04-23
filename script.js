let fullDictionary = [];
let activeLevel = '12';  // '12', '3', '4', 'phrase'
let isPhraseOnlyMode = false;
let currentLanguage = 'ru';

let learnedIds = new Set();
let yellowCards = new Map();
let redCards = new Map();

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

const PHRASE_INTERVAL = 10;

const phrasesList = [
  { text: "你好", pinyin: "nǐ hǎo", translation_ru: "Здравствуйте", translation_en: "Hello", breakdown: "你 (ты) + 好 (хорошо)" },
  { text: "您好", pinyin: "nín hǎo", translation_ru: "Здравствуйте (уважительно)", translation_en: "Hello (respectful)", breakdown: "您 (Вы) + 好" },
  { text: "早上好", pinyin: "zǎo shang hǎo", translation_ru: "Доброе утро", translation_en: "Good morning", breakdown: "早上 (утро) + 好" },
  { text: "晚上好", pinyin: "wǎn shang hǎo", translation_ru: "Добрый вечер", translation_en: "Good evening", breakdown: "晚上 (вечер) + 好" },
  { text: "晚安", pinyin: "wǎn ān", translation_ru: "Спокойной ночи", translation_en: "Good night", breakdown: "晚 (вечер) + 安 (спокойствие)" },
  { text: "再见", pinyin: "zài jiàn", translation_ru: "До свидания", translation_en: "Goodbye", breakdown: "再 (снова) + 见 (видеть)" },
  { text: "谢谢", pinyin: "xiè xie", translation_ru: "Спасибо", translation_en: "Thank you", breakdown: "谢 (благодарить)" },
  { text: "不客气", pinyin: "bù kè qi", translation_ru: "Пожалуйста", translation_en: "You're welcome", breakdown: "不 (не) + 客气 (вежливый)" },
  { text: "对不起", pinyin: "duì bu qǐ", translation_ru: "Извините", translation_en: "Sorry", breakdown: "对 (правильно) + 不起 (не получается)" },
  { text: "没关系", pinyin: "méi guān xi", translation_ru: "Ничего страшного", translation_en: "No problem", breakdown: "没 (нет) + 关系 (связи)" },
  { text: "你好吗", pinyin: "nǐ hǎo ma", translation_ru: "Как дела?", translation_en: "How are you?", breakdown: "你 + 好 + 吗 (вопрос)" },
  { text: "我很好", pinyin: "wǒ hěn hǎo", translation_ru: "У меня всё хорошо", translation_en: "I'm fine", breakdown: "我 (я) + 很 (очень) + 好" },
  { text: "你叫什么名字", pinyin: "nǐ jiào shén me míng zi", translation_ru: "Как тебя зовут?", translation_en: "What's your name?", breakdown: "你 + 叫 (звать) + 什么 (что) + 名字 (имя)" },
  { text: "我不知道", pinyin: "wǒ bù zhī dào", translation_ru: "Я не знаю", translation_en: "I don't know", breakdown: "我 + 不 + 知道 (знать)" },
  { text: "我明白了", pinyin: "wǒ míng bai le", translation_ru: "Я понял", translation_en: "I understand", breakdown: "我 + 明白 (понять) + 了" },
  { text: "在左边", pinyin: "zài zuǒ biān", translation_ru: "Слева", translation_en: "On the left", breakdown: "在 + 左 (левый) + 边 (сторона)" },
  { text: "在右边", pinyin: "zài yòu biān", translation_ru: "Справа", translation_en: "On the right", breakdown: "在 + 右 (правый) + 边" },
  { text: "一直走", pinyin: "yī zhí zǒu", translation_ru: "Идите прямо", translation_en: "Go straight", breakdown: "一 (один) + 直 (прямой) + 走 (идти)" },
  { text: "向左转", pinyin: "xiàng zuǒ zhuǎn", translation_ru: "Поверните налево", translation_en: "Turn left", breakdown: "向 + 左 + 转" },
  { text: "向右转", pinyin: "xiàng yòu zhuǎn", translation_ru: "Поверните направо", translation_en: "Turn right", breakdown: "向 + 右 + 转" },
  { text: "多少钱", pinyin: "duō shao qián", translation_ru: "Сколько стоит?", translation_en: "How much is it?", breakdown: "多少 (сколько) + 钱 (деньги)" },
  { text: "太贵了", pinyin: "tài guì le", translation_ru: "Слишком дорого", translation_en: "Too expensive", breakdown: "太 (слишком) + 贵 (дорогой) + 了" },
  { text: "我要这个", pinyin: "wǒ yào zhè ge", translation_ru: "Я хочу это", translation_en: "I want this", breakdown: "我 + 要 + 这个" },
  { text: "加油", pinyin: "jiā yóu", translation_ru: "Держись!/Давай!", translation_en: "Come on!/Keep it up!", breakdown: "加 + 油" },
  { text: "慢慢来", pinyin: "màn man lái", translation_ru: "Не торопись", translation_en: "Take it slow", breakdown: "慢慢 + 来" },
  { text: "真的吗", pinyin: "zhēn de ma", translation_ru: "Правда?", translation_en: "Really?", breakdown: "真的 + 吗" },
  { text: "太好了", pinyin: "tài hǎo le", translation_ru: "Отлично!", translation_en: "Great!", breakdown: "太 + 好 + 了" },
  { text: "小心", pinyin: "xiǎo xīn", translation_ru: "Осторожно!", translation_en: "Be careful", breakdown: "小 (маленький) + 心 (сердце)" },
  { text: "等一下", pinyin: "děng yī xià", translation_ru: "Подожди", translation_en: "Wait a moment", breakdown: "等 + 一下" },
  { text: "现在几点", pinyin: "xiàn zài jǐ diǎn", translation_ru: "Который час?", translation_en: "What time is it?", breakdown: "现在 (сейчас) + 几点" },
  { text: "今天", pinyin: "jīn tiān", translation_ru: "Сегодня", translation_en: "Today", breakdown: "今 + 天" },
  { text: "明天", pinyin: "míng tiān", translation_ru: "Завтра", translation_en: "Tomorrow", breakdown: "明 + 天" },
  { text: "昨天", pinyin: "zuó tiān", translation_ru: "Вчера", translation_en: "Yesterday", breakdown: "昨 + 天" }
];

async function loadDictionary() {
  try {
    const response = await fetch('HSK14ruen.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fullDictionary = await response.json();
    console.log(`Загружено слов: ${fullDictionary.length}`);
    
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
    
    for (let i = 0; i < fullDictionary.length; i++) {
      if (!fullDictionary[i].id) fullDictionary[i].id = i + 1;
    }
    
    for (let i = 0; i < phrasesList.length; i++) {
      phrasesDatabase.push({
        id: `p_${i}`,
        isPhrase: true,
        text: phrasesList[i].text,
        pinyin: phrasesList[i].pinyin,
        translation_ru: phrasesList[i].translation_ru,
        translation_en: phrasesList[i].translation_en,
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
    alert('Ошибка загрузки HSK14ruen.json!');
    fullDictionary = [
      { hanzi: "测试", level: 1, pinyin: "cè shì", id: 1, translations: { rus: "тест", eng: "test" } }
    ];
    initLevel('12');
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
  for (let [id, status] of phraseStatus) if (status.returnDate <= now) phraseStatus.delete(id);
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

// Получение слов для выбранного уровня (с объединением 1 и 2)
function getWordsForLevel(level) {
  if (level === '12') {
    // Объединяем HSK 1 и 2
    return fullDictionary.filter(w => w.level == 1 || w.level == 2);
  } else if (level === '3') {
    return fullDictionary.filter(w => w.level == 3);
  } else if (level === '4') {
    return fullDictionary.filter(w => w.level == 4);
  }
  return [];
}

function buildDeck() {
  if (isPhraseOnlyMode) return [];
  const allLevelWords = getWordsForLevel(activeLevel);
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

function initLevel(level) {
  if (level !== 'phrase') {
    isPhraseOnlyMode = false;
    activeLevel = level;
  } else {
    isPhraseOnlyMode = true;
  }
  checkReturns();
  currentDeck = buildDeck();
  currentDeckIndex = 0;
  cardsSinceLastPhrase = 0;
  updateStats();
  loadNextCard();
}

function loadNextCard() {
  const availablePhrases = getAvailablePhrases();
  const hasAvailableWords = !isPhraseOnlyMode && currentDeck.length > 0 && currentDeckIndex < currentDeck.length;
  
  if (!isPhraseOnlyMode && (currentDeckIndex >= currentDeck.length || currentDeck.length === 0)) {
    currentDeck = buildDeck();
    currentDeckIndex = 0;
  }
  
  const showPhrase = !isPhraseOnlyMode && availablePhrases.length > 0 && cardsSinceLastPhrase >= PHRASE_INTERVAL && hasAvailableWords;
  
  if (isPhraseOnlyMode && availablePhrases.length > 0) {
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    cardsSinceLastPhrase = 0;
  } else if (showPhrase) {
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    cardsSinceLastPhrase = 0;
  } else if (!isPhraseOnlyMode && currentDeck.length > 0 && currentDeckIndex < currentDeck.length) {
    currentCard = currentDeck[currentDeckIndex];
    currentDeckIndex++;
    cardsSinceLastPhrase++;
  } else if (availablePhrases.length > 0) {
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    cardsSinceLastPhrase = 0;
  } else {
    currentCard = null;
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
    document.getElementById('meaning').innerHTML = 'Все слова и фразы выучены!';
    document.getElementById('breakdown').innerHTML = '';
    return;
  }
  
  document.getElementById('chineseChar').innerText = currentCard.text || currentCard.hanzi;
  document.getElementById('pinyin').innerHTML = currentCard.pinyin;
  
  if (currentCard.isPhrase) {
    const translation = currentLanguage === 'ru' ? currentCard.translation_ru : currentCard.translation_en;
    document.getElementById('meaning').innerHTML = translation;
    document.getElementById('breakdown').innerHTML = `📖 ${currentCard.breakdown}`;
  } else {
    const translation = currentLanguage === 'ru' ? currentCard.translations.rus : currentCard.translations.eng;
    document.getElementById('meaning').innerHTML = translation;
    document.getElementById('breakdown').innerHTML = '';
  }
  
  updateCardStyle();
}

function updateStats() {
  const allLevelWords = getWordsForLevel(activeLevel);
  const left = allLevelWords.filter(w => !learnedIds.has(w.id) && !yellowCards.has(w.id) && !redCards.has(w.id)).length;
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
  initLevel(activeLevel);
  animate('left');
}

function onSwipeRight() {
  if (!currentCard) return;
  
  if (currentCard.isPhrase) {
    const currentStatus = phraseStatus.get(currentCard.id);
    const currentLevel = currentStatus ? currentStatus.level : 0;
    
    if (currentLevel === 0) {
      phraseStatus.set(currentCard.id, { level: 1, returnDate: getNextDateForPhrase(0) });
    } else if (currentLevel === 1) {
      phraseStatus.set(currentCard.id, { level: 2, returnDate: getNextDateForPhrase(1) });
    } else {
      phraseStatus.set(currentCard.id, { level: 2, returnDate: getNextDateForPhrase(1) });
    }
  } else {
    if (yellowCards.has(currentCard.id)) {
      yellowCards.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDateForWord('red'));
    } else if (redCards.has(currentCard.id)) {
      learnedIds.add(currentCard.id);
      redCards.delete(currentCard.id);
    } else if (learnedIds.has(currentCard.id)) {
      learnedIds.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDateForWord('red'));
    } else {
      yellowCards.set(currentCard.id, getNextDateForWord('yellow'));
    }
  }
  
  saveAll();
  initLevel(activeLevel);
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
        if (isPhraseOnlyMode) return;
        isPhraseOnlyMode = true;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel('phrase');
      } else {
        if (!isPhraseOnlyMode && value === activeLevel) return;
        isPhraseOnlyMode = false;
        activeLevel = value;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel(activeLevel);
      }
    });
  });
}

function setupLanguage() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLanguage) return;
      currentLanguage = lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const leftLabel = document.getElementById('leftLabel');
      const learnedLabel = document.getElementById('learnedLabel');
      if (currentLanguage === 'ru') {
        leftLabel.innerText = 'осталось';
        learnedLabel.innerText = 'уже знаю';
      } else {
        leftLabel.innerText = 'left';
        learnedLabel.innerText = 'known';
      }
      
      updateDisplay();
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
  setupLevels();
  setupLanguage();
  setupTouch();
  initSpeech();
  
  const card = document.getElementById('flashcard');
  if (card) card.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
});
