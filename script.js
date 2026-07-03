// ==========================================
// ChinCards — Ультрастабильная версия
// Вся логика упрощена до предела
// ==========================================

let dict = [];
let activeLevel = '12';
let lang = 'ru';

// Для каждого слова: { success: 0-10, due: null или Date }
let progress = new Map();
let learned = new Set();

let deck = [];           // 20 ID
let deckIndex = 0;
let currentId = null;
let flipped = false;

let phrases = [];
let phraseProgress = new Map();
let learnedPhrases = new Set();
let phraseMode = false;

let touchX = 0, touchY = 0;
let swiping = false;
const DECK_SIZE = 20;

// ---------- ЗАГРУЗКА ----------
async function loadData() {
  try {
    const r1 = await fetch('HSK14ruen.json');
    if (!r1.ok) throw new Error('HSK14ruen.json');
    dict = await r1.json();
    dict.forEach((w, i) => { if (!w.id) w.id = 'w_' + i; });

    const r2 = await fetch('phrases.json');
    if (r2.ok) {
      const data = await r2.json();
      phrases = data.map((p, i) => ({ ...p, id: p.id || 'p_' + i, isPhrase: true }));
    }

    loadStorage();
    restoreDeck();
    renderLevel();
  } catch(e) {
    console.error(e);
    alert('Ошибка загрузки');
  }
}

// ---------- ХРАНИЛИЩЕ ----------
function loadStorage() {
  try {
    const l = localStorage.getItem('chincards_learned');
    if (l) learned = new Set(JSON.parse(l));

    const p = localStorage.getItem('chincards_progress');
    if (p) {
      const parsed = JSON.parse(p);
      for (let [id, data] of Object.entries(parsed)) {
        progress.set(id, {
          success: data.success,
          due: data.due ? new Date(data.due) : null
        });
      }
    }

    const pl = localStorage.getItem('chincards_phrases_learned');
    if (pl) learnedPhrases = new Set(JSON.parse(pl));

    const pp = localStorage.getItem('chincards_phrase_progress');
    if (pp) {
      const parsed = JSON.parse(pp);
      for (let [id, data] of Object.entries(parsed)) {
        phraseProgress.set(id, { level: data.level, returnDate: data.returnDate ? new Date(data.returnDate) : null });
      }
    }

    const savedDeck = localStorage.getItem('chincards_deck');
    const savedIndex = localStorage.getItem('chincards_index');
    const savedLevel = localStorage.getItem('chincards_level');
    if (savedDeck && savedIndex && savedLevel === activeLevel) {
      deck = JSON.parse(savedDeck);
      deckIndex = parseInt(savedIndex, 10);
      deck = deck.filter(id => dict.some(w => w.id === id));
      if (deckIndex >= deck.length) deckIndex = 0;
    } else {
      deck = [];
      deckIndex = 0;
    }
  } catch(e) { console.warn(e); }
}

function saveAll() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learned]));

  const progObj = {};
  for (let [id, data] of progress.entries()) {
    progObj[id] = { success: data.success, due: data.due ? data.due.toISOString() : null };
  }
  localStorage.setItem('chincards_progress', JSON.stringify(progObj));

  localStorage.setItem('chincards_phrases_learned', JSON.stringify([...learnedPhrases]));

  const ppObj = {};
  for (let [id, data] of phraseProgress.entries()) {
    ppObj[id] = { level: data.level, returnDate: data.returnDate ? data.returnDate.toISOString() : null };
  }
  localStorage.setItem('chincards_phrase_progress', JSON.stringify(ppObj));

  localStorage.setItem('chincards_deck', JSON.stringify(deck));
  localStorage.setItem('chincards_index', deckIndex);
  localStorage.setItem('chincards_level', activeLevel);
}

// ---------- КОЛОДА ----------
function getLevelWords() {
  if (activeLevel === '12') return dict.filter(w => w.level === 1 || w.level === 2);
  if (activeLevel === '3') return dict.filter(w => w.level === 3);
  return [];
}

function getFresh() {
  const now = new Date();
  return getLevelWords().filter(w => {
    if (learned.has(w.id)) return false;
    if (deck.includes(w.id)) return false;
    const p = progress.get(w.id);
    if (p && p.due && p.due > now) return false;
    return true;
  }).map(w => w.id);
}

function getDue() {
  const now = new Date();
  const result = [];
  for (let [id, p] of progress.entries()) {
    if (p.due && p.due <= now && !learned.has(id) && !deck.includes(id)) {
      result.push(id);
    }
  }
  return result;
}

function addOne() {
  const due = getDue();
  if (due.length) {
    const id = due[Math.floor(Math.random() * due.length)];
    // Слово вернулось — удаляем due
    const p = progress.get(id);
    if (p) p.due = null;
    deck.push(id);
    console.log('+ Из пула:', getWord(id)?.hanzi);
    return;
  }
  const fresh = getFresh();
  if (fresh.length) {
    const id = fresh[Math.floor(Math.random() * fresh.length)];
    deck.push(id);
    console.log('+ Новое:', getWord(id)?.hanzi);
  }
}

function buildFreshDeck() {
  const fresh = getFresh();
  const shuffled = [...fresh];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DECK_SIZE);
}

function restoreDeck() {
  if (deck.length === 0) {
    deck = buildFreshDeck();
    deckIndex = 0;
  } else {
    deck = deck.filter(id => dict.some(w => w.id === id));
    if (deck.length === 0) {
      deck = buildFreshDeck();
      deckIndex = 0;
    }
    if (deckIndex >= deck.length) deckIndex = 0;
  }
  saveAll();
}

// ---------- ПОЛУЧЕНИЕ ДАННЫХ ----------
function getWord(id) {
  return dict.find(w => w.id === id);
}

function getCurrent() {
  if (phraseMode) return phrases.find(p => p.id === currentId);
  return getWord(currentId);
}

function getAvailablePhrases() {
  const now = new Date();
  return phrases.filter(p => {
    if (learnedPhrases.has(p.id)) return false;
    const pp = phraseProgress.get(p.id);
    if (pp && pp.returnDate && pp.returnDate > now) return false;
    return true;
  });
}

// ---------- ОТРИСОВКА ----------
function renderCard() {
  const card = getCurrent();
  const back = document.getElementById('cardBack');
  const frontChar = document.getElementById('chineseChar');

  if (!card) {
    frontChar.innerHTML = '🎉';
    back.innerHTML = '<div class="card-top"><div class="pinyin"></div><div class="meaning">Всё выучено!</div></div>';
    back.classList.remove('phrase-mode');
    return;
  }

  frontChar.innerHTML = card.text || card.hanzi;

  if (card.isPhrase) {
    back.classList.add('phrase-mode');
    const tr = lang === 'ru' ? card.translation_ru : card.translation_en;
    let bd = '';
    if (card.breakdown && card.breakdown.length) {
      bd = '<div class="breakdown">';
      for (let part of card.breakdown) {
        const t = lang === 'ru' ? part.translation_ru : part.translation_en;
        bd += `<div class="breakdown-item"><span class="breakdown-char">${part.char}</span> <span class="breakdown-pinyin">${part.pinyin}</span> <span class="breakdown-translation">${t}</span></div>`;
      }
      bd += '</div>';
    }
    back.innerHTML = `
      <div class="phrase-content">
        <div class="pinyin">${card.pinyin}</div>
        <div class="meaning">${tr}</div>
        ${bd}
      </div>
    `;
  } else {
    back.classList.remove('phrase-mode');
    const tr = lang === 'ru' ? card.translations.rus : card.translations.eng;
    let bd = '';
    if (card.breakdown && card.breakdown.length) {
      bd = '<div class="breakdown">';
      for (let part of card.breakdown) {
        const t = lang === 'ru' ? part.translation_ru : part.translation_en;
        bd += `<div class="breakdown-item"><span class="breakdown-char">${part.char}</span> <span class="breakdown-pinyin">(${part.pinyin})</span> <span class="breakdown-translation">— ${t}</span></div>`;
      }
      bd += '</div>';
    }
    const p = progress.get(card.id);
    const succ = p ? p.success : 0;
    let dots = '';
    for (let i = 0; i < 10; i++) {
      dots += `<div class="progress-dot ${i < succ ? 'filled' : ''}"></div>`;
    }
    back.innerHTML = `
      <div class="card-top">
        <div class="pinyin">${card.pinyin}</div>
        <div class="meaning">${tr}</div>
      </div>
      <div class="progress-dots">${dots}</div>
      <div class="card-bottom">${bd}</div>
    `;
  }
  updateStyle();
}

function updateStyle() {
  const el = document.getElementById('flashcard');
  if (!el) return;
  const front = el.querySelector('.card-front');
  const back = el.querySelector('.card-back');
  front.classList.remove('yellow', 'red', 'phrase-blue', 'phrase-darkblue', 'phrase-navy');
  back.classList.remove('yellow', 'red', 'phrase-blue', 'phrase-darkblue', 'phrase-navy');

  const card = getCurrent();
  if (!card) return;
  if (card.isPhrase) {
    const pp = phraseProgress.get(card.id);
    const lvl = pp ? pp.level : 0;
    if (lvl === 0) front.classList.add('phrase-blue'), back.classList.add('phrase-blue');
    else if (lvl === 1) front.classList.add('phrase-darkblue'), back.classList.add('phrase-darkblue');
    else front.classList.add('phrase-navy'), back.classList.add('phrase-navy');
  } else {
    const p = progress.get(card.id);
    if (p && p.success > 0 && !p.due) {
      front.classList.add('yellow');
      back.classList.add('yellow');
    }
  }
}

function updateStats() {
  const all = getLevelWords();
  const left = all.filter(w => !learned.has(w.id) && !progress.get(w.id)?.due).length;
  document.getElementById('cardsLeft').innerText = left;
  document.getElementById('totalLearned').innerText = learned.size;
}

// ---------- НАВИГАЦИЯ ----------
function nextCard() {
  if (phraseMode) {
    const available = getAvailablePhrases();
    currentId = available.length ? available[Math.floor(Math.random() * available.length)].id : null;
    flipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    renderCard();
    updateStats();
    return;
  }

  if (!deck.length) {
    currentId = null;
    renderCard();
    return;
  }
  if (deckIndex >= deck.length) deckIndex = 0;
  currentId = deck[deckIndex];
  deckIndex++;
  flipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  renderCard();
  updateStats();
  saveAll();
}

function renderLevel() {
  if (phraseMode) {
    nextCard();
    return;
  }
  // при переключении уровня перестраиваем колоду
  deck = buildFreshDeck();
  deckIndex = 0;
  saveAll();
  nextCard();
}

function initLevel(level) {
  if (level === 'phrase') {
    if (phraseMode) return;
    phraseMode = true;
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.level-btn.phrase-mode-btn')?.classList.add('active');
    renderLevel();
    return;
  }
  phraseMode = false;
  if (level !== activeLevel) {
    activeLevel = level;
    deck = buildFreshDeck();
    deckIndex = 0;
    saveAll();
  }
  document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.level-btn[data-level="${level}"]`)?.classList.add('active');
  renderLevel();
}

// ---------- СВАЙПЫ ----------
function onRight() {
  const card = getCurrent();
  if (!card) return;

  if (card.isPhrase) {
    const pp = phraseProgress.get(card.id);
    let lvl = pp ? pp.level : 0;
    const d = new Date();
    if (lvl === 0) d.setDate(d.getDate() + 2);
    else d.setDate(d.getDate() + 30);
    if (lvl === 2) {
      learnedPhrases.add(card.id);
      phraseProgress.delete(card.id);
    } else {
      phraseProgress.set(card.id, { level: lvl + 1, returnDate: d });
    }
    saveAll();
    nextCard();
    animate('right');
    return;
  }

  let p = progress.get(card.id);
  if (!p) p = { success: 0, due: null };
  p.success++;
  if (p.success >= 10) {
    learned.add(card.id);
    progress.delete(card.id);
    console.log('✅ Выучено:', card.hanzi);
  } else {
    let days = p.success * 2;
    if (days > 20) days = 20;
    const d = new Date();
    d.setDate(d.getDate() + days);
    p.due = d;
    progress.set(card.id, p);
    console.log('📅 Отсрочка', days, 'дней, прогресс', p.success, '/10');
  }

  const idx = deck.indexOf(card.id);
  if (idx !== -1) deck.splice(idx, 1);
  addOne();
  if (deckIndex > 0 && deckIndex <= deck.length) deckIndex--;
  if (deckIndex < 0) deckIndex = 0;
  saveAll();
  nextCard();
  animate('right');
}

function onLeft() {
  const card = getCurrent();
  if (!card) return;
  if (card.isPhrase) {
    phraseProgress.delete(card.id);
    saveAll();
    nextCard();
    animate('left');
    return;
  }
  progress.delete(card.id);
  saveAll();
  nextCard();
  animate('left');
}

function onUp() {
  const card = getCurrent();
  if (!card) return;
  if (card.isPhrase) {
    phraseProgress.delete(card.id);
    saveAll();
    nextCard();
    animate('up');
    return;
  }
  const idx = deck.indexOf(card.id);
  if (idx !== -1) deck.splice(idx, 1);
  progress.delete(card.id);
  addOne();
  if (deckIndex > 0 && deckIndex <= deck.length) deckIndex--;
  if (deckIndex < 0) deckIndex = 0;
  saveAll();
  nextCard();
  animate('up');
}

function animate(dir) {
  const wrap = document.querySelector('.card-wrapper');
  if (!wrap) return;
  wrap.classList.add('swipe-' + dir);
  setTimeout(() => wrap.classList.remove('swipe-' + dir), 300);
}

// ---------- КЛИК И ОЗВУЧКА ----------
function flipCard() {
  const card = getCurrent();
  if (!card) return;
  const el = document.getElementById('flashcard');
  flipped = !flipped;
  if (flipped) {
    el.classList.add('flipped');
    speak(card.text || card.hanzi);
  } else {
    el.classList.remove('flipped');
  }
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ---------- СОБЫТИЯ ----------
function setupTouch() {
  const wrap = document.querySelector('.card-wrapper');
  if (!wrap) return;
  wrap.addEventListener('touchstart', e => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    swiping = true;
  }, { passive: false });
  wrap.addEventListener('touchmove', e => {
    if (!swiping) return;
    if (Math.abs(e.touches[0].clientX - touchX) > 10 ||
        Math.abs(e.touches[0].clientY - touchY) > 10) e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('touchend', e => {
    if (!swiping) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) onRight();
      else onLeft();
    } else if (Math.abs(dy) > 50 && dy < 0) {
      onUp();
    }
    swiping = false;
  });
  let mx = 0, my = 0;
  wrap.addEventListener('mousedown', e => { mx = e.clientX; my = e.clientY; swiping = true; });
  wrap.addEventListener('mouseup', e => {
    if (!swiping) return;
    const dx = e.clientX - mx;
    const dy = e.clientY - my;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) onRight();
      else onLeft();
    } else if (Math.abs(dy) > 50 && dy < 0) {
      onUp();
    }
    swiping = false;
  });
}

function setupUI() {
  document.querySelectorAll('.level-btn').forEach(b => {
    b.addEventListener('click', () => initLevel(b.dataset.level));
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => {
      const newLang = b.dataset.lang;
      if (newLang === lang) return;
      lang = newLang;
      document.querySelectorAll('.lang-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('leftLabel').innerText = lang === 'ru' ? 'осталось' : 'left';
      document.getElementById('learnedLabel').innerText = lang === 'ru' ? 'выучено' : 'learned';
      document.getElementById('hintLeft').innerText = lang === 'ru' ? 'Не знаю' : "Don't know";
      document.getElementById('hintRight').innerText = lang === 'ru' ? 'Знаю' : 'Know';
      document.getElementById('hintUp').innerText = lang === 'ru' ? 'Заменить' : 'Replace';
      renderCard();
    });
  });
  document.getElementById('flashcard').addEventListener('click', e => { e.stopPropagation(); flipCard(); });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupUI();
  setupTouch();
  // Прогрев speech
  if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
});
