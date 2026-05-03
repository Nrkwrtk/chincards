let fullDictionary = [];
let activeLevel = '12';
let currentLanguage = 'ru';

let wordProgress = new Map();
let learnedIds = new Set();

let activeDeck = [];
let activeDeckIndex = 0;
let currentCardId = null;
let isFlipped = false;

let phrasesDatabase = [];
let phraseStatus = new Map();
let learnedPhrasesIds = new Set();
let isPhraseOnlyMode = false;

let touchStartX = 0;
let isSwiping = false;

const DECK_SIZE = 20;

async function loadDictionary() {
  try {
    const response = await fetch('HSK14ruen.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fullDictionary = await response.json();
    
    for (let i = 0; i < fullDictionary.length; i++) {
      if (!fullDictionary[i].id) fullDictionary[i].id = `w_${i}`;
    }
    console.log(`✅ Загружено слов: ${fullDictionary.length}`);
    
    const phrasesResponse = await fetch('phrases.json');
    if (!phrasesResponse.ok) throw new Error(`HTTP ${phrasesResponse.status}`);
    const phrasesData = await phrasesResponse.json();
    for (let i = 0; i < phrasesData.length; i++) {
      phrasesDatabase.push({
        ...phrasesData[i],
        id: phrasesData[i].id || `p_${i}`,
        isPhrase: true
      });
    }
    
    loadSavedData();
    initLevel(activeLevel);
  } catch(e) {
    console.error(e);
    alert('Ошибка загрузки файлов!');
  }
}

function loadSavedData() {
  const saved = localStorage.getItem('chincards_learned');
  if (saved) learnedIds = new Set(JSON.parse(saved));
  
  const savedProgress = localStorage.getItem('chincards_word_progress');
  if (savedProgress) {
    const parsed = JSON.parse(savedProgress);
    for (let [id, data] of Object.entries(parsed)) {
      wordProgress.set(id, {
        successCount: data.successCount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      });
    }
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
}

function saveAll() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  
  const progressObj = {};
  for (let [id, data] of wordProgress.entries()) {
    progressObj[id] = {
      successCount: data.successCount,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null
    };
  }
  localStorage.setItem('chincards_word_progress', JSON.stringify(progressObj));
  
  const phraseStatusArray = Array.from(phraseStatus.entries()).map(([id, data]) => ({
    id, level: data.level, returnDate: data.returnDate.toISOString()
  }));
  localStorage.setItem('chincards_phrase_status', JSON.stringify(phraseStatusArray));
  localStorage.setItem('chincards_phrases_learned', JSON.stringify([...learnedPhrasesIds]));
}

function getWordsForLevel(level) {
  if (level === '12') {
    return fullDictionary.filter(w => w.level == 1 || w.level == 2);
  } else if (level === '3') {
    return fullDictionary.filter(w => w.level == 3);
  }
  return [];
}

function getDueWordsFromPool() {
  const now = new Date();
  const dueWords = [];
  
  for (let [id, progress] of wordProgress.entries()) {
    if (progress.dueDate && progress.dueDate <= now) {
      if (!learnedIds.has(id) && !activeDeck.includes(id)) {
        dueWords.push(id);
      }
    }
  }
  return dueWords;
}

function getNewHSKWords() {
  const allWords = getWordsForLevel(activeLevel);
  const now = new Date();
  
  return allWords.filter(w => {
    if (learnedIds.has(w.id)) return false;
    if (activeDeck.includes(w.id)) return false;
    
    const progress = wordProgress.get(w.id);
    if (progress && progress.dueDate && progress.dueDate > now) return false;
    
    return true;
  }).map(w => w.id);
}

function replaceWordInDeck(oldWordId) {
  const index = activeDeck.indexOf(oldWordId);
  if (index === -1) return false;
  
  const dueWords = getDueWordsFromPool();
  
  if (dueWords.length > 0) {
    const randomIndex = Math.floor(Math.random() * dueWords.length);
    const newWordId = dueWords[randomIndex];
    activeDeck[index] = newWordId;
    console.log(`  ✅ Из пула ожидания → ${getWordById(newWordId)?.hanzi}`);
    return true;
  }
  
  const newWords = getNewHSKWords();
  
  if (newWords.length > 0) {
    const randomIndex = Math.floor(Math.random() * newWords.length);
    const newWordId = newWords[randomIndex];
    activeDeck[index] = newWordId;
    console.log(`  ✅ Новое слово из HSK → ${getWordById(newWordId)?.hanzi}`);
    return true;
  }
  
  console.log(`  ⚠️ Нет слов для замены, колода уменьшится`);
  activeDeck.splice(index, 1);
  return false;
}

function buildInitialDeck() {
  const newWords = getNewHSKWords();
  console.log(`📦 Доступно новых слов: ${newWords.length}`);
  
  if (newWords.length === 0) return [];
  
  const shuffled = shuffleArray([...newWords]);
  return shuffled.slice(0, DECK_SIZE);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initLevel(level) {
  console.log('\n=== ИНИЦИАЛИЗАЦИЯ ===');
  
  if (level === 'phrase') {
    isPhraseOnlyMode = true;
    initPhrasesMode();
    return;
  }
  
  isPhraseOnlyMode = false;
  activeLevel = level;
  console.log(`Режим: УРОВЕНЬ ${level}`);
  
  activeDeck = buildInitialDeck();
  activeDeckIndex = 0;
  
  console.log(`✅ Колода: ${activeDeck.length} слов`);
  
  updateStats();
  loadNextCard();
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

function initPhrasesMode() {
  const availablePhrases = getAvailablePhrases();
  if (availablePhrases.length > 0) {
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    currentCardId = availablePhrases[randomIndex].id;
  } else {
    currentCardId = null;
  }
  isFlipped = false;
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  updateDisplay();
  updateCardStyle();
  updateProgressDots();
}

function getNextDateForPhrase(currentLevel) {
  const d = new Date();
  let days = currentLevel === 0 ? 2 : 30;
  d.setDate(d.getDate() + days);
  return d;
}

function loadNextCard() {
  if (isPhraseOnlyMode) {
    initPhrasesMode();
    return;
  }
  
  if (activeDeck.length === 0) {
    currentCardId = null;
    updateDisplay();
    return;
  }
  
  if (activeDeckIndex >= activeDeck.length) {
    activeDeckIndex = 0;
  }
  
  currentCardId = activeDeck[activeDeckIndex];
  activeDeckIndex++;
  
  const word = getWordById(currentCardId);
  console.log(`📖 [${activeDeckIndex}/${activeDeck.length}] ${word?.hanzi}`);
  
  isFlipped = false;
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  
  updateDisplay();
  updateCardStyle();
  updateProgressDots();
}

function getWordById(id) {
  return fullDictionary.find(w => w.id === id);
}

function getCurrentCard() {
  if (isPhraseOnlyMode) {
    return phrasesDatabase.find(p => p.id === currentCardId);
  }
  return getWordById(currentCardId);
}

function updateProgressDots() {
  const container = document.getElementById('progressDots');
  if (!container) return;
  
  const card = getCurrentCard();
  
  if (!card || card.isPhrase) {
    container.innerHTML = '';
    return;
  }
  
  const progress = wordProgress.get(card.id);
  const successCount = progress ? progress.successCount : 0;
  
  let html = '';
  for (let i = 0; i < 10; i++) {
    const filled = i < successCount;
    html += `<div class="progress-dot ${filled ? 'filled' : ''}"></div>`;
  }
  container.innerHTML = html;
}

function updateDisplay() {
  const card = getCurrentCard();
  
  if (!card) {
    document.getElementById('chineseChar').innerText = '🎉';
    document.getElementById('pinyin').innerHTML = '';
    document.getElementById('meaning').innerHTML = 'Все слова выучены!';
    document.getElementById('breakdown').innerHTML = '';
    updateProgressDots();
    return;
  }
  
  document.getElementById('chineseChar').innerText = card.text || card.hanzi;
  document.getElementById('pinyin').innerHTML = card.pinyin;
  
  if (card.isPhrase) {
    const fullTranslation = currentLanguage === 'ru' ? card.translation_ru : card.translation_en;
    document.getElementById('meaning').innerHTML = fullTranslation;
    
    if (card.breakdown && card.breakdown.length > 0) {
      let breakdownHtml = '<div class="breakdown">';
      for (let part of card.breakdown) {
        const wordTranslation = currentLanguage === 'ru' ? part.translation_ru : part.translation_en;
        breakdownHtml += `
          <div class="breakdown-item">
            <span class="breakdown-char">${part.char}</span>
            <span class="breakdown-pinyin">${part.pinyin}</span>
            <div class="breakdown-translation">${wordTranslation}</div>
          </div>
        `;
      }
      breakdownHtml += '</div>';
      document.getElementById('breakdown').innerHTML = breakdownHtml;
    } else {
      document.getElementById('breakdown').innerHTML = '';
    }
  } else {
    const translation = currentLanguage === 'ru' ? card.translations.rus : card.translations.eng;
    document.getElementById('meaning').innerHTML = translation;
    
    if (card.breakdown && card.breakdown.length > 0) {
      let breakdownHtml = '<div class="breakdown">';
      for (let part of card.breakdown) {
        const wordTranslation = currentLanguage === 'ru' ? part.translation_ru : part.translation_en;
        breakdownHtml += `
          <div class="breakdown-item">
            <span class="breakdown-char">${part.char}</span>
            <span class="breakdown-pinyin">${part.pinyin}</span>
            <div class="breakdown-translation">${wordTranslation}</div>
          </div>
        `;
      }
      breakdownHtml += '</div>';
      document.getElementById('breakdown').innerHTML = breakdownHtml;
    } else {
      document.getElementById('breakdown').innerHTML = '';
    }
  }
  
  updateProgressDots();
  updateCardStyle();
}

function updateCardStyle() {
  const cardEl = document.getElementById('flashcard');
  if (!cardEl) return;
  
  const front = cardEl.querySelector('.card-front');
  const back = cardEl.querySelector('.card-back');
  
  front.classList.remove('yellow', 'red', 'phrase-blue', 'phrase-darkblue', 'phrase-navy');
  back.classList.remove('yellow', 'red', 'phrase-blue', 'phrase-darkblue', 'phrase-navy');
  
  const card = getCurrentCard();
  if (!card) return;
  
  if (card.isPhrase) {
    const status = phraseStatus.get(card.id);
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
    const progress = wordProgress.get(card.id);
    if (progress && progress.dueDate && progress.dueDate > new Date()) {
      front.classList.add('yellow');
      back.classList.add('yellow');
    }
  }
}

function updateStats() {
  const allWords = getWordsForLevel(activeLevel);
  const learnedCount = learnedIds.size;
  const leftCount = allWords.length - learnedCount;
  document.getElementById('cardsLeft').innerText = leftCount;
  document.getElementById('totalLearned').innerText = learnedCount;
}

function onSwipeRight() {
  const card = getCurrentCard();
  if (!card) return;
  
  console.log(`\n👉 ЗНАЮ: ${card.text || card.hanzi}`);
  
  if (card.isPhrase) {
    const currentStatus = phraseStatus.get(card.id);
    const currentLevel = currentStatus ? currentStatus.level : 0;
    
    if (currentLevel === 0) {
      phraseStatus.set(card.id, { level: 1, returnDate: getNextDateForPhrase(0) });
    } else if (currentLevel === 1) {
      phraseStatus.set(card.id, { level: 2, returnDate: getNextDateForPhrase(1) });
    } else {
      phraseStatus.set(card.id, { level: 2, returnDate: getNextDateForPhrase(1) });
    }
    
    if (currentLevel === 2) {
      learnedPhrasesIds.add(card.id);
      phraseStatus.delete(card.id);
    }
    
    saveAll();
    initLevel('phrase');
    animate('right');
    return;
  }
  
  let progress = wordProgress.get(card.id);
  if (!progress) {
    progress = { successCount: 0, dueDate: null };
  }
  
  progress.successCount++;
  
  if (progress.successCount >= 10) {
    learnedIds.add(card.id);
    wordProgress.delete(card.id);
    console.log(`  ✅ Слово ВЫУЧЕНО навсегда!`);
  } else {
    let days = progress.successCount * 2;
    if (days > 20) days = 20;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    progress.dueDate = dueDate;
    wordProgress.set(card.id, progress);
    console.log(`  → Слово выпало на ${days} дней (${progress.successCount}/10)`);
  }
  
  saveAll();
  replaceWordInDeck(card.id);
  
  if (activeDeckIndex > 0 && activeDeckIndex <= activeDeck.length) {
    activeDeckIndex--;
  }
  if (activeDeckIndex > activeDeck.length) {
    activeDeckIndex = activeDeck.length;
  }
  
  updateStats();
  loadNextCard();
  animate('right');
}

function onSwipeLeft() {
  const card = getCurrentCard();
  if (!card) return;
  
  console.log(`\n👈 НЕ ЗНАЮ: ${card.text || card.hanzi}`);
  
  if (card.isPhrase) {
    phraseStatus.delete(card.id);
    saveAll();
    initLevel('phrase');
    animate('left');
    return;
  }
  
  wordProgress.delete(card.id);
  console.log(`  → Прогресс сброшен, слово остаётся в ротации`);
  
  saveAll();
  loadNextCard();
  animate('left');
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
  const card = getCurrentCard();
  if (!card) return;
  const cardEl = document.getElementById('flashcard');
  isFlipped = !isFlipped;
  if (isFlipped) {
    cardEl.classList.add('flipped');
    speak(card.text || card.hanzi);
  } else {
    cardEl.classList.remove('flipped');
  }
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
  console.log('🚀 ПРИЛОЖЕНИЕ ЗАПУЩЕНО');
  loadDictionary();
  setupLevels();
  setupLanguage();
  setupTouch();
  initSpeech();
  
  const card = document.getElementById('flashcard');
  if (card) card.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
});
