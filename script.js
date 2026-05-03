let fullDictionary = [];
let activeLevel = '12';
let currentLanguage = 'ru';

// Новая система: прогресс слов
// Для каждого слова храним: { successCount: number (0-10), dueDate: Date (null если не на отсрочке) }
let wordProgress = new Map(); // key: wordId, value: { successCount, dueDate }

let learnedIds = new Set(); // полностью выученные (10 успехов)
let currentDeck = [];        // массив ID слов, которые сейчас в ротации (всегда 20)
let currentDeckIndex = 0;
let currentCardId = null;
let isFlipped = false;

// Фразы пока оставляем как есть (или позже переделаем)
let phrasesDatabase = [];
let phraseStatus = new Map();
let learnedPhrasesIds = new Set();
let isPhraseOnlyMode = false;

let touchStartX = 0;
let isSwiping = false;

// ========== ЗАГРУЗКА ==========
async function loadDictionary() {
  try {
    const response = await fetch('HSK14ruen.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fullDictionary = await response.json();
    console.log(`✅ Загружено слов HSK: ${fullDictionary.length}`);
    
    // Добавляем id если нет
    for (let i = 0; i < fullDictionary.length; i++) {
      if (!fullDictionary[i].id) fullDictionary[i].id = `w_${i}`;
    }
    
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
    console.log(`✅ Загружено фраз: ${phrasesDatabase.length}`);
    
    // Загружаем сохранения
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

// ========== ПОЛУЧЕНИЕ СЛОВ ДЛЯ УРОВНЯ ==========
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

// ========== ПОЛУЧЕНИЕ ПУЛА ДОСТУПНЫХ СЛОВ (ещё не выучены и не на отсрочке) ==========
function getAvailableWordIds() {
  const allWords = getWordsForLevel(activeLevel);
  const now = new Date();
  
  return allWords.filter(w => {
    // Уже выучено навсегда
    if (learnedIds.has(w.id)) return false;
    
    const progress = wordProgress.get(w.id);
    // Нет прогресса → доступно
    if (!progress) return true;
    
    // Есть dueDate и оно ещё не прошло → недоступно
    if (progress.dueDate && progress.dueDate > now) return false;
    
    // Иначе доступно
    return true;
  }).map(w => w.id);
}

// ========== ПОСТРОЕНИЕ КОЛОДЫ (ровно 20 карточек) ==========
function buildDeck() {
  const availableIds = getAvailableWordIds();
  console.log(`📦 Доступно слов для уровня ${activeLevel}: ${availableIds.length}`);
  
  if (availableIds.length === 0) return [];
  
  // Перемешиваем
  const shuffled = shuffleArray([...availableIds]);
  
  // Берём первые 20 (или сколько есть)
  return shuffled.slice(0, 20);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initLevel(level) {
  console.log('=== ИНИЦИАЛИЗАЦИЯ ===');
  
  if (level === 'phrase') {
    isPhraseOnlyMode = true;
    console.log('Режим: ТОЛЬКО ФРАЗЫ');
    initPhrasesMode();
    return;
  }
  
  isPhraseOnlyMode = false;
  activeLevel = level;
  console.log('Режим: УРОВЕНЬ ' + level);
  
  // Очищаем просроченные dueDate
  const now = new Date();
  for (let [id, progress] of wordProgress.entries()) {
    if (progress.dueDate && progress.dueDate <= now) {
      progress.dueDate = null;
      wordProgress.set(id, progress);
    }
  }
  
  currentDeck = buildDeck();
  currentDeckIndex = 0;
  
  console.log(`🃏 Колода из ${currentDeck.length} слов`);
  
  updateStats();
  loadNextCard();
}

// ========== ФРАЗЫ (оставляем как было, можно позже переделать) ==========
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
  updateProgressHint();
}

function getNextDateForPhrase(currentLevel) {
  const d = new Date();
  let days = currentLevel === 0 ? 2 : 30;
  d.setDate(d.getDate() + days);
  return d;
}

// ========== ЗАГРУЗКА СЛЕДУЮЩЕЙ КАРТОЧКИ ==========
function loadNextCard() {
  if (isPhraseOnlyMode) {
    initPhrasesMode();
    return;
  }
  
  // Если колода пуста или дошли до конца, перестраиваем колоду
  if (currentDeck.length === 0 || currentDeckIndex >= currentDeck.length) {
    currentDeck = buildDeck();
    currentDeckIndex = 0;
  }
  
  if (currentDeck.length > 0 && currentDeckIndex < currentDeck.length) {
    currentCardId = currentDeck[currentDeckIndex];
    currentDeckIndex++;
    const word = getWordById(currentCardId);
    console.log(`📖 СЛОВО ${currentDeckIndex}/${currentDeck.length}: ${word?.hanzi || word?.text || currentCardId}`);
  } else {
    currentCardId = null;
    console.log('❌ Нет доступных слов');
  }
  
  isFlipped = false;
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  
  updateDisplay();
  updateCardStyle();
  updateProgressHint();
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

// ========== ОБНОВЛЕНИЕ ПРОГРЕССА ==========
function updateProgressHint() {
  const hintEl = document.getElementById('progressHint');
  if (!hintEl) return;
  
  const card = getCurrentCard();
  if (!card || card.isPhrase) {
    hintEl.innerHTML = '';
    return;
  }
  
  const progress = wordProgress.get(card.id);
  const successCount = progress ? progress.successCount : 0;
  
  if (successCount >= 10) {
    hintEl.innerHTML = '✅ Выучено!';
  } else if (successCount > 0) {
    hintEl.innerHTML = `📈 Прогресс: ${successCount}/10`;
  } else {
    hintEl.innerHTML = '👆 Знаю → +1 успех';
  }
  
  // Обновляем верхний счётчик
  const progressCountEl = document.getElementById('progressCount');
  if (progressCountEl) {
    progressCountEl.innerText = successCount;
  }
}

// ========== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ==========
function updateDisplay() {
  const card = getCurrentCard();
  
  if (!card) {
    document.getElementById('chineseChar').innerText = '🎉';
    document.getElementById('pinyin').innerHTML = '';
    document.getElementById('meaning').innerHTML = 'Все слова выучены!';
    document.getElementById('breakdown').innerHTML = '';
    updateProgressHint();
    return;
  }
  
  document.getElementById('chineseChar').innerText = card.text || card.hanzi;
  document.getElementById('pinyin').innerHTML = card.pinyin;
  
  if (card.isPhrase) {
    const fullTranslation = currentLanguage === 'ru' ? card.translation_ru : card.translation_en;
    document.getElementById('meaning').innerHTML = fullTranslation;
    
    if (card.breakdown && card.breakdown.length > 0) {
      let breakdownHtml = '<div style="margin-top: 12px; width: 100%;">';
      for (let part of card.breakdown) {
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
    const translation = currentLanguage === 'ru' ? card.translations.rus : card.translations.eng;
    document.getElementById('meaning').innerHTML = translation;
    document.getElementById('breakdown').innerHTML = '';
  }
  
  updateProgressHint();
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
      // Слово на отсрочке (показываем жёлтым)
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

// ========== ОСНОВНАЯ ЛОГИКА СВАЙПОВ ==========
function onSwipeRight() { // ЗНАЮ
  const card = getCurrentCard();
  if (!card) return;
  
  console.log('👉 ЗНАЮ:', card.text || card.hanzi);
  
  if (card.isPhrase) {
    // Фразы пока по старой логике
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
  
  // Логика для слов
  let progress = wordProgress.get(card.id);
  if (!progress) {
    progress = { successCount: 0, dueDate: null };
  }
  
  // Увеличиваем счётчик успехов
  progress.successCount = (progress.successCount || 0) + 1;
  
  if (progress.successCount >= 10) {
    // Полностью выучено!
    learnedIds.add(card.id);
    wordProgress.delete(card.id);
    console.log(`  ✅ Слово ВЫУЧЕНО навсегда! +1 к счётчику`);
  } else {
    // Выпадает на N дней (2 * successCount, но не более 20)
    let days = progress.successCount * 2;
    if (days > 20) days = 20;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    progress.dueDate = dueDate;
    wordProgress.set(card.id, progress);
    console.log(`  → Слово выпало на ${days} дней (успехов: ${progress.successCount}/10)`);
  }
  
  saveAll();
  
  // Удаляем текущее слово из колоды и добавляем новое
  replaceCurrentCardInDeck();
  
  updateStats();
  loadNextCard();
  animate('right');
}

function onSwipeLeft() { // НЕ ЗНАЮ
  const card = getCurrentCard();
  if (!card) return;
  
  console.log('👈 НЕ ЗНАЮ:', card.text || card.hanzi);
  
  if (card.isPhrase) {
    phraseStatus.delete(card.id);
    saveAll();
    initLevel('phrase');
    animate('left');
    return;
  }
  
  // Сбрасываем прогресс слова (удаляем из wordProgress)
  wordProgress.delete(card.id);
  console.log(`  → Прогрес слова сброшен, возвращено в пул`);
  
  saveAll();
  
  // Удаляем текущее слово из колоды и добавляем новое
  replaceCurrentCardInDeck();
  
  updateStats();
  loadNextCard();
  animate('left');
}

function replaceCurrentCardInDeck() {
  // Удаляем текущий ID из currentDeck
  const index = currentDeck.indexOf(currentCardId);
  if (index !== -1) {
    currentDeck.splice(index, 1);
  }
  
  // Добавляем новое слово из пула доступных
  const availableIds = getAvailableWordIds();
  // Исключаем уже имеющиеся в колоде
  const newAvailable = availableIds.filter(id => !currentDeck.includes(id));
  
  if (newAvailable.length > 0) {
    const randomIndex = Math.floor(Math.random() * newAvailable.length);
    const newWordId = newAvailable[randomIndex];
    currentDeck.push(newWordId);
    console.log(`  → Добавлено новое слово в колоду: ${getWordById(newWordId)?.hanzi}`);
  } else {
    console.log(`  → Нет новых слов для добавления`);
  }
  
  // Корректируем индекс (если удалили текущий и он был до текущего индекса)
  if (currentDeckIndex > 0) {
    currentDeckIndex--;
  }
  if (currentDeckIndex < 0) currentDeckIndex = 0;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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
      const progressLabel = document.getElementById('progressLabel');
      if (currentLanguage === 'ru') {
        leftLabel.innerText = 'осталось';
        learnedLabel.innerText = 'уже знаю';
        progressLabel.innerText = 'успехов';
      } else {
        leftLabel.innerText = 'left';
        learnedLabel.innerText = 'known';
        progressLabel.innerText = 'progress';
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
  console.log('🚀 ПРИЛОЖЕНИЕ ЗАПУЩЕНО (новая версия с 20 карточками)');
  loadDictionary();
  setupLevels();
  setupLanguage();
  setupTouch();
  initSpeech();
  
  const card = document.getElementById('flashcard');
  if (card) card.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
});
