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
let cardsSinceLastPhrase = 0;

let currentCard = null;
let isFlipped = false;
let touchStartX = 0;
let isSwiping = false;

const PHRASE_INTERVAL = 10;

async function loadDictionary() {
  try {
    // Загружаем слова HSK
    const response = await fetch('HSK14ruen.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fullDictionary = await response.json();
    console.log(`Загружено слов HSK: ${fullDictionary.length}`);
    
    // Загружаем фразы из отдельного файла
    const phrasesResponse = await fetch('phrases.json');
    if (!phrasesResponse.ok) throw new Error(`HTTP ${phrasesResponse.status}`);
    const phrasesData = await phrasesResponse.json();
    console.log(`Загружено фраз: ${phrasesData.length}`);
    
    // Добавляем ID и метку isPhrase
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
    alert('Ошибка загрузки файлов! Проверьте:\n1. HSK14ruen.json\n2. phrases.json');
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
    // Полный перевод фразы
    const fullTranslation = currentLanguage === 'ru' ? currentCard.translation_ru : currentCard.translation_en;
    document.getElementById('meaning').innerHTML = fullTranslation;
    
    // Разбор по словам
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
  
  update
