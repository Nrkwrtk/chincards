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
let touchStartX = 0, touchStartY = 0;
let isSwiping = false;
const DECK_SIZE = 20;

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
    initLevel(activeLevel);
  } catch(e) {
    console.error(e);
    alert('Ошибка загрузки базы');
  }
}

function loadSavedData() {
  try {
    const savedLearned = localStorage.getItem('chincards_learned');
    if (savedLearned) learnedIds = new Set(JSON.parse(savedLearned));
    const savedProgress = localStorage.getItem('chincards_word_progress');
    if (savedProgress) {
      const parsed = JSON.parse(savedProgress);
      for (let [id, data] of Object.entries(parsed)) {
        wordProgress.set(id, { successCount: data.successCount, dueDate: data.dueDate ? new Date(data.dueDate) : null });
      }
    }
    const savedPhraseStatus = localStorage.getItem('chincards_phrase_status');
    if (savedPhraseStatus) {
      const parsed = JSON.parse(savedPhraseStatus);
      for (let item of parsed) phraseStatus.set(item.id, { level: item.level, returnDate: new Date(item.returnDate) });
    }
    const savedPhrasesLearned = localStorage.getItem('chincards_phrases_learned');
    if (savedPhrasesLearned) learnedPhrasesIds = new Set(JSON.parse(savedPhrasesLearned));
  } catch(e) { console.warn(e); }
}

function saveAll() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  const progressObj = {};
  for (let [id, data] of wordProgress.entries()) {
    progressObj[id] = { successCount: data.successCount, dueDate: data.dueDate ? data.dueDate.toISOString() : null };
  }
  localStorage.setItem('chincards_word_progress', JSON.stringify(progressObj));
  const phraseStatusArray = Array.from(phraseStatus.entries()).map(([id, data]) => ({ id, level: data.level, returnDate: data.returnDate.toISOString() }));
  localStorage.setItem('chincards_phrase_status', JSON.stringify(phraseStatusArray));
  localStorage.setItem('chincards_phrases_learned', JSON.stringify([...learnedPhrasesIds]));
}

function getWordsForLevel(level) {
  if (level === '12') return fullDictionary.filter(w => w.level === 1 || w.level === 2);
  if (level === '3') return fullDictionary.filter(w => w.level === 3);
  return [];
}

function getDueWordsFromPool() {
  const now = new Date();
  const due = [];
  for (let [id, progress] of wordProgress.entries()) {
    if (progress.dueDate && progress.dueDate <= now && !learnedIds.has(id) && !activeDeck.includes(id)) due.push(id);
  }
  return due;
}

function getNewHSKWords() {
  const all = getWordsForLevel(activeLevel);
  const now = new Date();
  return all.filter(w => {
    if (learnedIds.has(w.id)) return false;
    if (activeDeck.includes(w.id)) return false;
    const prog = wordProgress.get(w.id);
    if (prog && prog.dueDate && prog.dueDate > now) return false;
    return true;
  }).map(w => w.id);
}

function replaceWordInDeck(oldId) {
  const idx = activeDeck.indexOf(oldId);
  if (idx === -1) return false;
  const due = getDueWordsFromPool();
  if (due.length > 0) {
    const newId = due[Math.floor(Math.random() * due.length)];
    activeDeck[idx] = newId;
    return true;
  }
  const fresh = getNewHSKWords();
  if (fresh.length > 0) {
    const newId = fresh[Math.floor(Math.random() * fresh.length)];
    activeDeck[idx] = newId;
    return true;
  }
  activeDeck.splice(idx, 1);
  return false;
}

function buildInitialDeck() {
  const fresh = getNewHSKWords();
  if (!fresh.length) return [];
  const shuffled = [...fresh];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DECK_SIZE);
}

function renderHSKCard(card) {
  const translation = currentLanguage === 'ru' ? card.translations.rus : card.translations.eng;
  let breakdownHtml = '';
  if (card.breakdown && card.breakdown.length) {
    breakdownHtml = '<div class="breakdown">';
    for (let part of card.breakdown) {
      const tr = currentLanguage === 'ru' ? part.translation_ru : part.translation_en;
      breakdownHtml += `<div class="breakdown-item"><span class="breakdown-char">${part.char}</span> <span class="breakdown-pinyin">(${part.pinyin})</span> <span class="breakdown-translation">— ${tr}</span></div>`;
    }
    breakdownHtml += '</div>';
  }
  const progress = wordProgress.get(card.id);
  const count = progress ? progress.successCount : 0;
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
    backDiv.innerHTML = renderHSKCard(card);
  }
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
    const st = phraseStatus.get(card.id);
    const lvl = st ? st.level : 0;
    if (lvl === 0) front.classList.add('phrase-blue'), back.classList.add('phrase-blue');
    else if (lvl === 1) front.classList.add('phrase-darkblue'), back.classList.add('phrase-darkblue');
    else front.classList.add('phrase-navy'), back.classList.add('phrase-navy');
  } else {
    const prog = wordProgress.get(card.id);
    if (prog && prog.dueDate && prog.dueDate > new Date()) {
      front.classList.add('yellow');
      back.classList.add('yellow');
    }
  }
}

function updateStats() {
  const all = getWordsForLevel(activeLevel);
  const left = all.filter(w => !learnedIds.has(w.id) && !wordProgress.get(w.id)?.dueDate).length;
  document.getElementById('cardsLeft').innerText = left;
  document.getElementById('totalLearned').innerText = learnedIds.size;
}

function initLevel(level) {
  if (level === 'phrase') {
    isPhraseOnlyMode = true;
    const available = getAvailablePhrases();
    currentCardId = available.length ? available[Math.floor(Math.random() * available.length)].id : null;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    updateDisplay();
    updateCardStyle();
    updateStats();
    return;
  }
  isPhraseOnlyMode = false;
  activeLevel = level;
  const now = new Date();
  for (let [id, prog] of wordProgress.entries()) {
    if (prog.dueDate && prog.dueDate <= now) {
      prog.dueDate = null;
      wordProgress.set(id, prog);
    }
  }
  activeDeck = buildInitialDeck();
  activeDeckIndex = 0;
  updateStats();
  loadNextCard();
}

function getAvailablePhrases() {
  const now = new Date();
  return phrasesDatabase.filter(p => {
    if (learnedPhrasesIds.has(p.id)) return false;
    const st = phraseStatus.get(p.id);
    if (st && st.returnDate > now) return false;
    return true;
  });
}

function loadNextCard() {
  if (isPhraseOnlyMode) {
    const available = getAvailablePhrases();
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
}

function getCurrentCard() {
  if (isPhraseOnlyMode) return phrasesDatabase.find(p => p.id === currentCardId);
  return fullDictionary.find(w => w.id === currentCardId);
}

function onSwipeRight() {
  const card = getCurrentCard();
  if (!card) return;
  if (card.isPhrase) {
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
    return;
  }
  let prog = wordProgress.get(card.id);
  if (!prog) prog = { successCount: 0, dueDate: null };
  prog.successCount++;
  if (prog.successCount >= 10) {
    learnedIds.add(card.id);
    wordProgress.delete(card.id);
  } else {
    let days = prog.successCount * 2;
    if (days > 20) days = 20;
    const due = new Date();
    due.setDate(due.getDate() + days);
    prog.dueDate = due;
    wordProgress.set(card.id, prog);
  }
  saveAll();
  replaceWordInDeck(card.id);
  if (activeDeckIndex > 0) activeDeckIndex--;
  if (activeDeckIndex < 0) activeDeckIndex = 0;
  if (activeDeckIndex > activeDeck.length) activeDeckIndex = activeDeck.length;
  updateStats();
  loadNextCard();
  animateSwipe('right');
}

function onSwipeLeft() {
  const card = getCurrentCard();
  if (!card) return;
  if (card.isPhrase) {
    phraseStatus.delete(card.id);
    saveAll();
    initLevel('phrase');
    animateSwipe('left');
    return;
  }
  wordProgress.delete(card.id);
  saveAll();
  loadNextCard();
  animateSwipe('left');
}

function onSwipeUp() {
  const card = getCurrentCard();
  if (!card) return;
  if (card.isPhrase) {
    phraseStatus.delete(card.id);
    saveAll();
    initLevel('phrase');
    animateSwipe('up');
    return;
  }
  const idx = activeDeck.indexOf(card.id);
  if (idx !== -1) activeDeck.splice(idx, 1);
  wordProgress.delete(card.id);
  const due = getDueWordsFromPool();
  let newWordId = null;
  if (due.length > 0) {
    newWordId = due[Math.floor(Math.random() * due.length)];
  } else {
    const fresh = getNewHSKWords();
    if (fresh.length > 0) newWordId = fresh[Math.floor(Math.random() * fresh.length)];
  }
  if (newWordId) activeDeck.push(newWordId);
  if (activeDeckIndex > 0 && activeDeckIndex <= activeDeck.length) activeDeckIndex--;
  if (activeDeckIndex < 0) activeDeckIndex = 0;
  saveAll();
  updateStats();
  loadNextCard();
  animateSwipe('up');
}

function animateSwipe(dir) {
  const wrap = document.querySelector('.card-wrapper');
  if (!wrap) return;
  wrap.classList.add(`swipe-${dir}`);
  setTimeout(() => wrap.classList.remove(`swipe-${dir}`), 300);
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function flipCard() {
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

function setupTouch() {
  const wrap = document.querySelector('.card-wrapper');
  if (!wrap) return;
  wrap.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: false });
  wrap.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    if (deltaX > 10 || deltaY > 10) e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) onSwipeRight();
      else onSwipeLeft();
    } else if (Math.abs(deltaY) > 50 && deltaY < 0) {
      onSwipeUp();
    }
    isSwiping = false;
  });
  let mouseX = 0, mouseY = 0;
  wrap.addEventListener('mousedown', (e) => { mouseX = e.clientX; mouseY = e.clientY; isSwiping = true; });
  wrap.addEventListener('mouseup', (e) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - mouseX;
    const deltaY = e.clientY - mouseY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) onSwipeRight();
      else onSwipeLeft();
    } else if (Math.abs(deltaY) > 50 && deltaY < 0) {
      onSwipeUp();
    }
    isSwiping = false;
  });
}

function setupLevels() {
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
      leftLabel.innerText = currentLanguage === 'ru' ? 'осталось' : 'left';
      learnedLabel.innerText = currentLanguage === 'ru' ? 'выучено' : 'learned';
      const hintLeft = document.getElementById('hintLeft');
      const hintRight = document.getElementById('hintRight');
      const hintUp = document.getElementById('hintUp');
      if (currentLanguage === 'ru') {
        hintLeft.innerText = 'Не знаю';
        hintRight.innerText = 'Знаю';
        hintUp.innerText = 'Заменить';
      } else {
        hintLeft.innerText = "Don't know";
        hintRight.innerText = 'Know';
        hintUp.innerText = 'Replace';
      }
      updateDisplay();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadDictionary();
  setupLevels();
  setupLanguage();
  setupTouch();
  const card = document.getElementById('flashcard');
  if (card) card.addEventListener('click', (e) => { e.stopPropagation(); flipCard(); });
  if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
});
