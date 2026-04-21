let fullDictionary = [];
let activeLevel = 1;
let learnedIds = new Set();       // Полностью выученные (навсегда)
let yellowCards = new Map();      // Карточки, которые скоро вернутся (жёлтые)
let redCards = new Map();         // Карточки, которые скоро вернутся (красные)

let currentCard = null;
let currentLevelWords = [];
let currentCardIndex = 0;
let isFlipped = false;
let touchStartX = 0;
let isSwiping = false;

// Загрузка словаря
async function loadDictionary() {
  try {
    const response = await fetch('hsk.json');
    fullDictionary = await response.json();
    
    // Загружаем данные из localStorage
    const savedLearned = localStorage.getItem('chincards_learned');
    if (savedLearned) {
      learnedIds = new Set(JSON.parse(savedLearned));
    }
    
    const savedYellow = localStorage.getItem('chincards_yellow');
    if (savedYellow) {
      const parsed = JSON.parse(savedYellow);
      yellowCards = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    const savedRed = localStorage.getItem('chincards_red');
    if (savedRed) {
      const parsed = JSON.parse(savedRed);
      redCards = new Map(parsed.map(p => [p.id, new Date(p.until)]));
    }
    
    console.log(`Загружено: выучено ${learnedIds.size}, жёлтых ${yellowCards.size}, красных ${redCards.size}`);
    initForLevel(activeLevel);
  } catch (err) {
    console.error('Ошибка загрузки hsk.json', err);
    alert('Ошибка загрузки hsk.json!');
  }
}

// Сохранение всех данных
function saveAllData() {
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  
  const yellowArray = Array.from(yellowCards.entries()).map(([id, date]) => ({ id, until: date.toISOString() }));
  localStorage.setItem('chincards_yellow', JSON.stringify(yellowArray));
  
  const redArray = Array.from(redCards.entries()).map(([id, date]) => ({ id, until: date.toISOString() }));
  localStorage.setItem('chincards_red', JSON.stringify(redArray));
}

// Проверка, вернулись ли карточки из отложенных
function checkReturnedCards() {
  const now = new Date();
  
  // Проверяем жёлтые карточки
  for (let [id, untilDate] of yellowCards) {
    if (untilDate <= now) {
      yellowCards.delete(id);
      console.log(`Карточка ${id} вернулась из жёлтого статуса`);
    }
  }
  
  // Проверяем красные карточки
  for (let [id, untilDate] of redCards) {
    if (untilDate <= now) {
      redCards.delete(id);
      console.log(`Карточка ${id} вернулась из красного статуса`);
    }
  }
  
  saveAllData();
}

// Инициализация для уровня
function initForLevel(level) {
  checkReturnedCards();
  
  // Берём все слова уровня, исключая:
  // 1. Полностью выученные
  // 2. Жёлтые (ещё не вернулись)
  // 3. Красные (ещё не вернулись)
  const allLevelWords = fullDictionary.filter(w => w.level == level);
  currentLevelWords = allLevelWords.filter(w => 
    !learnedIds.has(w.id) && 
    !yellowCards.has(w.id) && 
    !redCards.has(w.id)
  );
  
  updateAllStats();
  
  if (currentLevelWords.length === 0) {
    currentCard = null;
    updateCardDisplay();
    return;
  }
  
  currentLevelWords = shuffleArray([...currentLevelWords]);
  currentCardIndex = 0;
  currentCard = currentLevelWords[currentCardIndex];
  isFlipped = false;
  
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  
  updateCardDisplay();
  updateCardColor();
}

// Обновление цвета карточки в зависимости от статуса
function updateCardColor() {
  const card = document.getElementById('flashcard');
  if (!card || !currentCard) return;
  
  const cardFront = card.querySelector('.card-front');
  const cardBack = card.querySelector('.card-back');
  
  // Сбрасываем классы
  cardFront.classList.remove('yellow-card', 'red-card');
  cardBack.classList.remove('yellow-card', 'red-card');
  
  if (yellowCards.has(currentCard.id)) {
    cardFront.classList.add('yellow-card');
    cardBack.classList.add('yellow-card');
  } else if (redCards.has(currentCard.id)) {
    cardFront.classList.add('red-card');
    cardBack.classList.add('red-card');
  }
}

// Перемешивание
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Получение русского перевода
function getRussianTranslation(word) {
  if (!word.translations || !word.translations.rus) {
    return ["(нет перевода)", []];
  }
  const rusArray = word.translations.rus;
  if (rusArray.length === 0) return ["(нет перевода)", []];
  const main = rusArray[0];
  const extra = rusArray.slice(1);
  return [main, extra];
}

// Обновление карточки
function updateCardDisplay() {
  if (!currentCard) {
    document.getElementById('chineseChar').innerText = '🎉';
    document.getElementById('pinyin').innerHTML = '';
    document.getElementById('meaning').innerHTML = 'Все слова выучены!';
    const extraEl = document.getElementById('extraMeanings');
    if (extraEl) extraEl.innerHTML = '';
    return;
  }
  
  document.getElementById('chineseChar').innerText = currentCard.hanzi;
  document.getElementById('pinyin').innerHTML = currentCard.pinyin;
  
  const [mainMeaning, extraMeanings] = getRussianTranslation(currentCard);
  document.getElementById('meaning').innerHTML = mainMeaning;
  
  const extraEl = document.getElementById('extraMeanings');
  if (extraEl) {
    if (extraMeanings.length > 0) {
      const displayMeanings = extraMeanings.slice(0, 3);
      extraEl.innerHTML = displayMeanings.map(m => `• ${m}`).join('<br>');
      if (extraMeanings.length > 3) {
        extraEl.innerHTML += '<br>• ...';
      }
    } else {
      extraEl.innerHTML = '';
    }
  }
  
  updateCardColor();
}

// Обновление счётчиков
function updateAllStats() {
  const allCurrentLevelWords = fullDictionary.filter(w => w.level == activeLevel);
  const availableWords = allCurrentLevelWords.filter(w => 
    !learnedIds.has(w.id) && 
    !yellowCards.has(w.id) && 
    !redCards.has(w.id)
  );
  
  document.getElementById('cardsLeft').innerText = availableWords.length;
  document.getElementById('totalLearned').innerText = learnedIds.size;
}

// Озвучивание
function speakWord(hanzi) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(hanzi);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// Переворот карточки
function flipCard() {
  if (!currentCard) return;
  const card = document.getElementById('flashcard');
  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add('flipped');
    speakWord(currentCard.hanzi);
  } else {
    card.classList.remove('flipped');
  }
}

// Получение следующей даты на основе статуса и попытки
function getNextReturnDate(status, attempt) {
  const now = new Date();
  let daysToAdd = 0;
  
  if (status === 'yellow') {
    daysToAdd = 2;
  } else if (status === 'red') {
    daysToAdd = 7;
  } else if (status === 'review') {
    daysToAdd = Math.floor(Math.random() * (30 - 21 + 1) + 21);
  } else if (status === 'review2') {
    daysToAdd = Math.floor(Math.random() * (60 - 30 + 1) + 30);
  }
  
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysToAdd);
  return nextDate;
}

// Свайп влево (не знаю → понижаем уровень статуса)
function swipeLeft() {
  if (!currentCard) return;
  
  const wordId = currentCard.id;
  
  // Проверяем статус карточки и понижаем его
  if (redCards.has(wordId)) {
    // Красная → становится жёлтой на 2 дня
    const nextDate = getNextReturnDate('yellow', 1);
    redCards.delete(wordId);
    yellowCards.set(wordId, nextDate);
    console.log(`Слово ${wordId} понижено с КРАСНОГО до ЖЁЛТОГО (до ${nextDate.toLocaleDateString()})`);
    saveAllData();
    
    // Обновляем ротацию
    initForLevel(activeLevel);
    animateSwipe('left');
    return;
    
  } else if (yellowCards.has(wordId)) {
    // Жёлтая → становится обычной (удаляем из отложенных)
    yellowCards.delete(wordId);
    console.log(`Слово ${wordId} понижено с ЖЁЛТОГО до ОБЫЧНОГО`);
    saveAllData();
    
    // Обновляем ротацию
    initForLevel(activeLevel);
    animateSwipe('left');
    return;
  }
  
  // Обычная карточка или если не нашли в статусах
  if (currentLevelWords.length <= 1) {
    animateSwipe('left');
    return;
  }
  
  // Перемещаем текущее слово в конец
  currentLevelWords.splice(currentCardIndex, 1);
  currentLevelWords.push(currentCard);
  
  if (currentCardIndex >= currentLevelWords.length) currentCardIndex = 0;
  currentCard = currentLevelWords[currentCardIndex];
  
  isFlipped = false;
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  
  updateCardDisplay();
  updateAllStats();
  animateSwipe('left');
}

// Свайп вправо (знаю → повышаем уровень статуса)
function swipeRight() {
  if (!currentCard) return;
  
  const wordId = currentCard.id;
  
  // Проверяем, в каком статусе сейчас слово
  if (yellowCards.has(wordId)) {
    // Жёлтый статус → переводим в красный на 7 дней
    const nextDate = getNextReturnDate('red', 1);
    redCards.set(wordId, nextDate);
    yellowCards.delete(wordId);
    console.log(`Слово ${wordId} повышено до КРАСНОГО (скрыто до ${nextDate.toLocaleDateString()})`);
    
  } else if (redCards.has(wordId)) {
    // Красный статус → полностью выучено навсегда
    learnedIds.add(wordId);
    redCards.delete(wordId);
    console.log(`Слово ${wordId} полностью ВЫУЧЕНО! +1 к счётчику`);
    
  } else if (learnedIds.has(wordId)) {
    // Уже выучено → повторное изучение (рандомный возврат через 3-4 недели)
    const nextDate = getNextReturnDate('review', 1);
    redCards.set(wordId, nextDate);
    learnedIds.delete(wordId);
    console.log(`Слово ${wordId} отправлено на ПОВТОРЕНИЕ (вернётся ${nextDate.toLocaleDateString()})`);
    
  } else {
    // Обычное слово → отправляем в жёлтый статус на 2 дня
    const nextDate = getNextReturnDate('yellow', 1);
    yellowCards.set(wordId, nextDate);
    console.log(`Слово ${wordId} повышено до ЖЁЛТОГО (скрыто до ${nextDate.toLocaleDateString()})`);
  }
  
  saveAllData();
  
  // Удаляем слово из текущей ротации (оно уходит в отложенные)
  currentLevelWords.splice(currentCardIndex, 1);
  
  if (currentLevelWords.length === 0) {
    currentCard = null;
    currentCardIndex = 0;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    updateCardDisplay();
    updateAllStats();
    animateSwipe('right');
    return;
  }
  
  if (currentCardIndex >= currentLevelWords.length) currentCardIndex = 0;
  currentCard = currentLevelWords[currentCardIndex];
  isFlipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  
  updateCardDisplay();
  updateAllStats();
  animateSwipe('right');
}

function animateSwipe(direction) {
  const container = document.querySelector('.card-container');
  if (!container) return;
  container.classList.add(`swipe-${direction}`);
  setTimeout(() => {
    container.classList.remove(`swipe-${direction}`);
  }, 300);
}

// Обработчики касаний
function attachTouchEvents() {
  const container = document.querySelector('.card-container');
  if (!container) return;
  
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: false });
  
  container.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, { passive: false });
  
  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) swipeRight();
      else swipeLeft();
    }
    isSwiping = false;
  });
  
  let mouseStartX = 0;
  container.addEventListener('mousedown', (e) => {
    mouseStartX = e.clientX;
    isSwiping = true;
  });
  container.addEventListener('mouseup', (e) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - mouseStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) swipeRight();
      else swipeLeft();
    }
    isSwiping = false;
  });
}

// Переключение уровня
function setupLevelSwitcher() {
  const btns = document.querySelectorAll('.level-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const level = parseInt(btn.dataset.level);
      if (level === activeLevel) return;
      activeLevel = level;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initForLevel(activeLevel);
    });
  });
}

// Инициализация речи
function initSpeech() {
  if (window.speechSynthesis) {
    const dummy = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(dummy);
  }
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
  loadDictionary();
  setupLevelSwitcher();
  attachTouchEvents();
  initSpeech();
  
  const card = document.getElementById('flashcard');
  if (card) {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      flipCard();
    });
  }
});
