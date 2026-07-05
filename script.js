// ============================================================
// ChinCards — Упрощённая стабильная версия
// ============================================================

let fullDictionary = [];
let activeLevel = '12';
let currentLanguage = 'ru';

// Прогресс: { count: 0-10, until: null или Date (когда слово снова станет доступным) }
let wordProgress = new Map();
let learnedIds = new Set();

// Активная колода (ровно 20 ID)
let activeDeck = [];
let activeDeckIndex = 0;
let currentCardId = null;
let isFlipped = false;

// Фразы (оставляем как есть, но они не затрагиваются новой логикой)
let phrasesDatabase = [];
let phraseStatus = new Map();
let learnedPhrasesIds = new Set();
let isPhraseOnlyMode = false;

// Свайп
let touchStartX = 0;
let isSwiping = false;
const DECK_SIZE = 20;

// ---------- Загрузка ----------
async function loadDictionary() {
  try {
    const res = await fetch('HSK14ruen.json');
    if (!res.ok) throw new Error('HSK14ruen.json not found');
    fullDictionary = await res.json();
    fullDictionary.forEach((w, i) => { if (!w.id) w.id = `w_${i}`; });

    const phrasesRes = await fetch('phrases.json');
    if (phrasesRes.ok) {
      const phrasesData = await phrasesRes.json();
      phrasesDatabase = phrasesData.map((p, i) => ({ ...p, id: p.id || `p_${i}`, isPhrase: true }));
    }

    loadSavedData();
    restoreOrInitDeck();
    initLevel(activeLevel);
  } catch(e) {
    console.error(e);
    alert('Ошибка загрузки базы');
  }
}

// ---------- Сохранение / загрузка ----------
function loadSavedData() {
  try {
    const savedLearned = localStorage.getItem('chincards_learned_' + activeLevel);
    if (savedLearned) learnedIds = new Set(JSON.parse(savedLearned));

    const savedProgress = localStorage.getItem('chincards_progress_' + activeLevel);
    if (savedProgress) {
      const parsed = JSON.parse(savedProgress);
      for (let [id, data] of Object.entries(parsed)) {
        wordProgress.set(id, {
          count: data.count,
          until: data.until ? new Date(data.until) : null
        });
      }
    }

    const savedDeck = localStorage.getItem('chincards_deck_' + activeLevel);
    const savedIndex = localStorage.getItem('chincards_index_' + activeLevel);
    if (savedDeck && savedIndex) {
      activeDeck = JSON.parse(savedDeck);
      activeDeckIndex = parseInt(savedIndex, 10);
      // Фильтруем мёртвые ID и те, что уже изучены или на задержке
      activeDeck = activeDeck.filter(id => {
        if (learnedIds.has(id)) return false;
        const prog = wordProgress.get(id);
        if (prog && prog.until && prog.until > new Date()) return false;
        return fullDictionary.some(w => w.id === id);
      });
      if (activeDeckIndex >= activeDeck.length) activeDeckIndex = 0;
    } else {
      activeDeck = [];
      activeDeckIndex = 0;
    }
  } catch(e) { console.warn(e); }
}

function saveAll() {
  localStorage.setItem('chincards_learned_' + activeLevel, JSON.stringify([...learnedIds]));

  const progressObj = {};
  for (let [id, data] of wordProgress.entries()) {
    progressObj[id] = {
      count: data.count,
      until: data.until ? data.until.toISOString() : null
    };
  }
  localStorage.setItem('chincards_progress_' + activeLevel, JSON.stringify(progressObj));

  localStorage.setItem('chincards_deck_' + activeLevel, JSON.stringify(activeDeck));
  localStorage.setItem('chincards_index_' + activeLevel, activeDeckIndex);
}

// ---------- Работа с пулами ----------
function getWordsForLevel(level) {
  if (level === '12') return fullDictionary.filter(w => w.level === 1 || w.level === 2);
  if (level === '3') return fullDictionary.filter(w => w.level === 3);
  return [];
}

// Все доступные слова (не изученные, не на задержке, не в ротации)
function getAvailablePool() {
  const now = new Date();
  const all = getWordsForLevel(activeLevel);
  return all.filter(w => {
    if (learnedIds.has(w.id)) return false;
    if (activeDeck.includes(w.id)) return false;
    const prog = wordProgress.get(w.id);
    if (prog && prog.until && prog.until > now) return false;
    return true;
  }).map(w => w.id);
}

// Добавить одно случайное слово из доступного пула (если есть)
function addOneRandomWord() {
  const pool = getAvailablePool();
  if (pool.length === 0) {
    console.warn('Нет доступных слов для добавления');
    return false;
  }
  const randomId = pool[Math.floor(Math.random() * pool.length)];
  activeDeck.push(randomId);
  return true;
}

// Построить начальную колоду (20 случайных слов)
function buildFreshDeck() {
  const pool = getAvailablePool();
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DECK_SIZE);
}

// Восстановить или создать колоду
function restoreOrInitDeck() {
  if (activeDeck.length === 0) {
    activeDeck = buildFreshDeck();
    activeDeckIndex = 0;
  } else {
    // Удаляем изученные или просроченные слова (если они уже должны быть доступны, но мы их не удаляем, они остаются в колоде)
    // Но если слово изучено, его надо убрать.
    activeDeck = activeDeck.filter(id => {
      if (learnedIds.has(id)) return false;
      // Если слово на задержке, но оно уже в колоде — оставляем (потому что мы не удаляем из колоды во время задержки, просто не добавляем новые)
      return true;
    });
    if (activeDeck.length < DECK_SIZE) {
      // Добиваем колоду до 20
      let added = 0;
      while (activeDeck.length < DECK_SIZE) {
        const ok = addOneRandomWord();
        if (!ok) break;
        added++;
      }
    }
    if (activeDeckIndex >= activeDeck.length) activeDeckIndex = 0;
  }
  saveAll();
}

// ---------- Инициализация уровня ----------
function initLevel(level) {
  if (level === 'phrase') {
    isPhraseOnlyMode = true;
    loadNextCard();
    updateStats();
    return;
  }
  isPhraseOnlyMode = false;
  if (level !== activeLevel) {
    activeLevel = level;
    // Переключаем уровень — загружаем сохранённые данные для этого уровня
    loadSavedData();
    restoreOrInitDeck();
  }
  updateStats();
  loadNextCard();
}

// ---------- Получение текущей карточки ----------
function getCurrentCard() {
  if (isPhraseOnlyMode) {
    return phrasesDatabase.find(p => p.id === currentCardId);
  }
  return fullDictionary.find(w => w.id === currentCardId);
}

function getWordById(id) {
  return fullDictionary.find(w => w.id === id);
}

// ---------- Навигация ----------
function loadNextCard() {
  if (isPhraseOnlyMode) {
    const available = phrasesDatabase.filter(p => {
      if (learnedPhrasesIds.has(p.id)) return false;
      const st = phraseStatus.get(p.id);
      if (st && st.returnDate && st.returnDate > new Date()) return false;
      return true;
    });
    currentCardId = available.length ? available[Math.floor(Math.random() * available.length)].id : null;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    updateDisplay();
    updateCardStyle();
    return;
  }

  if (!activeDeck.length) {
    currentCardId = null;
    updateDisplay();
    return;
  }
  if (activeDeckIndex >= activeDeck.length) activeDeckIndex = 0;
  currentCardId = activeDeck[activeDeckIndex];
  activeDeckIndex++;
  isFlipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  updateDisplay();
  updateCardStyle();
  saveAll();
}

// ---------- Отрисовка ----------
function renderCard(card) {
  const translation = currentLanguage === 'ru' ? card.translations?.rus : card.translations?.eng;
  let breakdownHtml = '';
  if (card.breakdown && card.breakdown.length) {
    breakdownHtml = '<div class="breakdown">';
    for (let part of card.breakdown) {
      const tr = currentLanguage === 'ru' ? part.translation_ru : part.translation_en;
      breakdownHtml += `<div class="breakdown-item"><span class="breakdown-char">${part.char}</span> <span class="breakdown-pinyin">(${part.pinyin})</span> <span class="breakdown-translation">— ${tr}</span></div>`;
    }
    breakdownHtml += '</div>';
  }
  const prog = wordProgress.get(card.id);
  const count = prog ? prog.count : 0;
  let dotsHtml = '';
  for (let i = 0; i < 10; i++) {
    dotsHtml += `<div class="progress-dot ${i < count ? 'filled' : ''}"></div>`;
  }
  return `
    <div class="card-top">
      <div class="pinyin">${card.pinyin}</div>
      <div class="meaning">${translation}</div>
    </div>
    <div class="progress-dots">${dotsHtml}</div>
    <div class="card-bottom">
      ${breakdownHtml}
    </div>
  `;
}

function renderPhraseCard(card) {
  const translation = currentLanguage === 'ru' ? card.translation_ru : card.translation_en;
  let breakdownHtml = '';
  if (card.breakdown && card.breakdown.length) {
    breakdownHtml = '<div class="breakdown">';
    for (let part of card.breakdown) {
      const tr = currentLanguage === 'ru' ? part.translation_ru : part.translation_en;
      breakdownHtml += `<div class="breakdown-item"><span class="breakdown-char">${part.char}</span> <span class="breakdown-pinyin">${part.pinyin}</span> <span class="breakdown-translation">${tr}</span></div>`;
    }
    breakdownHtml += '</div>';
  }
  return `
    <div class="phrase-content">
      <div class="pinyin">${card.pinyin}</div>
      <div class="meaning">${translation}</div>
      ${breakdownHtml}
    </div>
  `;
}

function updateDisplay() {
  const card = getCurrentCard();
  const backDiv = document.getElementById('cardBack');
  if (!card) {
    document.getElementById('chineseChar').innerHTML = '🎉';
    backDiv.innerHTML = '<div class="card-top"><div class="pinyin"></div><div class="meaning">Все слова выучены!</div></div>';
    backDiv.classList.remove('phrase-mode');
    return;
  }
  document.getElementById('chineseChar').innerHTML = card.text || card.hanzi;
  if (card.isPhrase) {
    backDiv.classList.add('phrase-mode');
    backDiv.innerHTML = renderPhraseCard(card);
  } else {
    backDiv.classList.remove('phrase-mode');
    backDiv.innerHTML = renderCard(card);
  }
  // Никаких цветов, убираем все классы
  const cardEl = document.getElementById('flashcard');
  cardEl.querySelector('.card-front').className = 'card-front';
  cardEl.querySelector('.card-back').className = 'card-back';
}

function updateCardStyle() {
  // Пусто — цвета убраны
}

function updateStats() {
  const all = getWordsForLevel(activeLevel);
  const left = all.filter(w => !learnedIds.has(w.id) && !wordProgress.get(w.id)?.until).length;
  document.getElementById('cardsLeft').innerText = left;
  document.getElementById('totalLearned').innerText = learnedIds.size;
}

// ---------- Свайпы ----------
function onSwipeRight() { // ЗНАЮ
  const card = getCurrentCard();
  if (!card || card.isPhrase) {
    // Для фраз используем старую логику (можно оставить или упростить)
    if (card && card.isPhrase) {
      const st = phraseStatus.get(card.id);
      let lvl = st ? st.level : 0;
      const nextDate = new Date();
      if (lvl === 0) nextDate.setDate(nextDate.getDate() + 2);
      else nextDate.setDate(nextDate.getDate() + 30);
      if (lvl === 2) {
        learnedPhrasesIds.add(card.id);
        phraseStatus.delete(card.id);
      } else {
        phraseStatus.set(card.id, { level: lvl + 1, returnDate: nextDate });
      }
      saveAll();
      initLevel('phrase');
      animateSwipe('right');
    }
    return;
  }

  let prog = wordProgress.get(card.id);
  if (!prog) prog = { count: 0, until: null };
  prog.count++;
  if (prog.count >= 10) {
    // Выучено навсегда
    learnedIds.add(card.id);
    wordProgress.delete(card.id);
    console.log(`✅ Слово "${card.hanzi}" выучено!`);
  } else {
    // Отправляем на сутки
    const until = new Date();
    until.setDate(until.getDate() + 1); // 24 часа
    prog.until = until;
    wordProgress.set(card.id, prog);
    console.log(`📅 Слово "${card.hanzi}" на 24 часа (прогресс ${prog.count}/10)`);
  }

  // Удаляем из ротации
  const idx = activeDeck.indexOf(card.id);
  if (idx !== -1) activeDeck.splice(idx, 1);
  // Добавляем новое слово
  addOneRandomWord();
  // Корректируем индекс
  if (activeDeckIndex > 0 && activeDeckIndex <= activeDeck.length) activeDeckIndex--;
  if (activeDeckIndex < 0) activeDeckIndex = 0;

  saveAll();
  updateStats();
  loadNextCard();
  animateSwipe('right');
}

function onSwipeLeft() { // НЕ ЗНАЮ
  const card = getCurrentCard();
  if (!card) return;
  if (card.isPhrase) {
    phraseStatus.delete(card.id);
    saveAll();
    initLevel('phrase');
    animateSwipe('left');
    return;
  }
  // Ничего не делаем, просто переходим к следующей карточке
  // (прогресс не сбрасывается, слово остаётся в ротации)
  saveAll();
  loadNextCard();
  animateSwipe('left');
}

function animateSwipe(dir) {
  const wrap = document.querySelector('.card-wrapper');
  if (!wrap) return;
  wrap.classList.add('swipe-' + dir);
  setTimeout(() => wrap.classList.remove('swipe-' + dir), 300);
}

// ---------- Озвучка и переворот ----------
function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function flipCard() {
  const card = getCurrentCard();
  if (!card) return;
  const el = document.getElementById('flashcard');
  isFlipped = !isFlipped;
  if (isFlipped) {
    el.classList.add('flipped');
    speak(card.text || card.hanzi);
  } else {
    el.classList.remove('flipped');
  }
}

// ---------- События касаний ----------
function setupTouch() {
  const wrap = document.querySelector('.card-wrapper');
  if (!wrap) return;
  wrap.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: false });
  wrap.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 10) e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) onSwipeRight();
      else onSwipeLeft();
    }
    isSwiping = false;
  });
  let mouseX = 0;
  wrap.addEventListener('mousedown', (e) => { mouseX = e.clientX; isSwiping = true; });
  wrap.addEventListener('mouseup', (e) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - mouseX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) onSwipeRight();
      else onSwipeLeft();
    }
    isSwiping = false;
  });
}

// ---------- Настройки интерфейса ----------
function setupUI() {
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.level;
      if (val === 'phrase') {
        if (isPhraseOnlyMode) return;
        isPhraseOnlyMode = true;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel('phrase');
      } else {
        if (!isPhraseOnlyMode && val === activeLevel) return;
        isPhraseOnlyMode = false;
        activeLevel = val;
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initLevel(activeLevel);
      }
    });
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLanguage) return;
      currentLanguage = lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('leftLabel').innerText = lang === 'ru' ? 'осталось' : 'left';
      document.getElementById('learnedLabel').innerText = lang === 'ru' ? 'выучено' : 'learned';
      document.getElementById('hintLeft').innerText = lang === 'ru' ? 'Не знаю' : "Don't know";
      document.getElementById('hintRight').innerText = lang === 'ru' ? 'Знаю' : 'Know';
      // hintUp убираем, т.к. свайпа вверх больше нет
      updateDisplay();
    });
  });

  document.getElementById('flashcard').addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard();
  });
}

// ---------- Старт ----------
document.addEventListener('DOMContentLoaded', () => {
  loadDictionary();
  setupUI();
  setupTouch();
  if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
});
