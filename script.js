let fullDictionary = [];
let activeLevel = '12';
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
let wordsSinceLastPhrase = 0;

let currentCard = null;
let isFlipped = false;
let touchStartX = 0;
let isSwiping = false;

const PHRASE_INTERVAL = 10;

async function loadDictionary() {
  try {
    const response = await fetch('HSK14ruen.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fullDictionary = await response.json();
    console.log(`✅ Загружено слов HSK: ${fullDictionary.length}`);
    
    const phrasesResponse = await fetch('phrases.json');
    if (!phrasesResponse.ok) throw new Error(`HTTP ${phrasesResponse.status}`);
    const phrasesData = await phrasesResponse.json();
    console.log(`✅ Загружено фраз: ${phrasesData.length}`);
    
    for (let i = 0; i < phrasesData.length; i++) {
      phrasesDatabase.push({
        ...phrasesData[i],
        id: phrasesData[i].id || `p_${i}`,
        isPhrase: true
      });
    }
    
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
    alert('Ошибка загрузки файлов!');
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

function getWordsForLevel(level) {
  if (level === '12') {
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
  console.log('=== ИНИЦИАЛИЗАЦИЯ ===');
  console.log('Режим:', level === 'phrase' ? 'ТОЛЬКО ФРАЗЫ' : 'УРОВЕНЬ ' + level);
  
  if (level === 'phrase') {
    isPhraseOnlyMode = true;
  } else {
    isPhraseOnlyMode = false;
    activeLevel = level;
  }
  
  checkReturns();
  currentDeck = buildDeck();
  currentDeckIndex = 0;
  wordsSinceLastPhrase = 0;
  
  console.log('Колода слов:', currentDeck.length);
  console.log('Доступно фраз:', getAvailablePhrases().length);
  
  updateStats();
  loadNextCard();
}

function loadNextCard() {
  const availablePhrases = getAvailablePhrases();
  
  // РЕЖИМ ТОЛЬКО ФРАЗЫ ==============================================
  if (isPhraseOnlyMode) {
    console.log('🎯 РЕЖИМ ТОЛЬКО ФРАЗЫ');
    if (availablePhrases.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePhrases.length);
      currentCard = availablePhrases[randomIndex];
      console.log('💬 ФРАЗА:', currentCard.text);
    } else {
      currentCard = null;
      console.log('❌ Нет фраз');
    }
    
    isFlipped = false;
    const cardEl = document.getElementById('flashcard');
    if (cardEl) cardEl.classList.remove('flipped');
    
    updateDisplay();
    updateCardStyle();
    return;
  }
  
  // ОБЫЧНЫЙ РЕЖИМ ===================================================
  // Если колода пустая или закончилась, пересоздаём
  if (currentDeckIndex >= currentDeck.length || currentDeck.length === 0) {
    currentDeck = buildDeck();
    currentDeckIndex = 0;
    console.log('🔄 Колода пересоздана, слов:', currentDeck.length);
  }
  
  // Решаем, показывать фразу или слово
  const needPhrase = availablePhrases.length > 0 && wordsSinceLastPhrase >= PHRASE_INTERVAL && currentDeck.length > 0;
  
  if (needPhrase && availablePhrases.length > 0) {
    // Показываем фразу
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    wordsSinceLastPhrase = 0;
    console.log('💬 ФРАЗА (№' + (PHRASE_INTERVAL - wordsSinceLastPhrase) + '):', currentCard.text);
  } else if (currentDeck.length > 0 && currentDeckIndex < currentDeck.length) {
    // Показываем слово
    currentCard = currentDeck[currentDeckIndex];
    currentDeckIndex++;
    wordsSinceLastPhrase++;
    console.log(`📖 СЛОВО ${currentDeckIndex}/${currentDeck.length}: ${currentCard.hanzi} | До фразы: ${PHRASE_INTERVAL - wordsSinceLastPhrase}`);
  } else if (availablePhrases.length > 0) {
    // Если слов нет, показываем фразу
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCard = availablePhrases[randomIndex];
    wordsSinceLastPhrase = 0;
    console.log('💬 НЕТ СЛОВ, ФРАЗА:', currentCard.text);
  } else {
    currentCard = null;
    console.log('❌ Нет ни слов, ни фраз');
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
    const fullTranslation = currentLanguage === 'ru' ? currentCard.translation_ru : currentCard.translation_en;
    document.getElementById('meaning').innerHTML = fullTranslation;
    
    if (currentCard.breakdown && currentCard.breakdown.length > 0) {
      let breakdownHtml = '<div style="margin-top: 12px; width: 100%;">';
      for (let part of currentCard.breakdown) {
        const wordTranslation = currentLanguage === 'ru' ? part.translation_ru : part.translation_en;
        breakdownHtml += `
          <div style="margin: 8px 0; padding: 6px; border-top: 1px solid rgba(136, 170, 255, 0.2);">
            <span style="font-size: 1.1rem; font-weight: 600; color: #f0f0f0;">${part.char}</span>
            <span style="font-size: 0.9rem; color: #ffaa66; margin-left: 8px;">${part.pinyin}</span>
            <div style="font-size: 0.85rem; color: #88aaff; margin-top: 4px;">${wordTranslation}</div>
          </div>
        `;
      }
      breakdownHtml += '</div>';
      document.getElementById('breakdown').innerHTML = breakdownHtml;
    } else {
      document.getElementById('breakdown').innerHTML = '';
    }
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
  console.log('👈 СВАЙП ВЛЕВО (не знаю):', currentCard.text || currentCard.hanzi);
  
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
  // Перезапускаем текущий режим
  if (isPhraseOnlyMode) {
    initLevel('phrase');
  } else {
    initLevel(activeLevel);
  }
  animate('left');
}

function onSwipeRight() {
  if (!currentCard) return;
  console.log('👉 СВАЙП ВПРАВО (знаю):', currentCard.text || currentCard.hanzi);
  
  if (currentCard.isPhrase) {
    const currentStatus = phraseStatus.get(currentCard.id);
    const currentLevel = currentStatus ? currentStatus.level : 0;
    
    if (currentLevel === 0) {
      phraseStatus.set(currentCard.id, { level: 1, returnDate: getNextDateForPhrase(0) });
      console.log('  → Фраза стала СИНЕЙ (скрыта на 2 дня)');
    } else if (currentLevel === 1) {
      phraseStatus.set(currentCard.id, { level: 2, returnDate: getNextDateForPhrase(1) });
      console.log('  → Фраза стала ТЁМНО-СИНЕЙ (скрыта на месяц)');
    } else {
      phraseStatus.set(currentCard.id, { level: 2, returnDate: getNextDateForPhrase(1) });
      console.log('  → Фраза уже тёмно-синяя, скрыта ещё на месяц');
    }
  } else {
    if (yellowCards.has(currentCard.id)) {
      yellowCards.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDateForWord('red'));
      console.log('  → Слово стало КРАСНЫМ (скрыто на 7 дней)');
    } else if (redCards.has(currentCard.id)) {
      learnedIds.add(currentCard.id);
      redCards.delete(currentCard.id);
      console.log('  → Слово ВЫУЧЕНО! +1 к счётчику');
    } else if (learnedIds.has(currentCard.id)) {
      learnedIds.delete(currentCard.id);
      redCards.set(currentCard.id, getNextDateForWord('red'));
      console.log('  → Слово на ПОВТОРЕНИЕ (красное)');
    } else {
      yellowCards.set(currentCard.id, getNextDateForWord('yellow'));
      console.log('  → Слово стало ЖЁЛТЫМ (скрыто на 2 дня)');
    }
  }
  
  saveAll();
  // Перезапускаем текущий режим
  if (isPhraseOnlyMode) {
    initLevel('phrase');
  } else {
    initLevel(activeLevel);
  }
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
        console.log('🔘 Переключение на РЕЖИМ ТОЛЬКО ФРАЗЫ');
        isPhraseOnlyMode = true;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel('phrase');
      } else {
        if (!isPhraseOnlyMode && value === activeLevel) return;
        console.log(`🔘 Переключение на УРОВЕНЬ ${value}`);
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
  console.log('🚀 Приложение запущено');
  loadDictionary();
  setupLevels();
  setupLanguage();
  setupTouch();
  initSpeech();
  
  const card = document.getElementById('flashcard');
  if (card) card.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
});
