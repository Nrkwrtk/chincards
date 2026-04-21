let fullDictionary = [];
let activeLevel = 1;
let learnedIds = new Set();

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
    
    // Загружаем сохранённые выученные слова из localStorage
    const saved = localStorage.getItem('chincards_learned');
    if (saved) {
      learnedIds = new Set(JSON.parse(saved));
      console.log(`Загружено выученных слов: ${learnedIds.size}`);
    }
    
    console.log(`Загружено слов всего: ${fullDictionary.length}`);
    initForLevel(activeLevel);
  } catch (err) {
    console.error('Ошибка загрузки hsk.json', err);
    alert('Ошибка загрузки hsk.json! Проверьте, что файл есть в корне репозитория');
  }
}

// Инициализация для уровня
function initForLevel(level) {
  const allLevelWords = fullDictionary.filter(w => w.level == level);
  currentLevelWords = allLevelWords.filter(w => !learnedIds.has(w.id));
  
  updateAllStats();
  
  if (currentLevelWords.length === 0) {
    currentCard = null;
    updateCardDisplay();
    return;
  }
  
  // Перемешиваем слова при каждой инициализации уровня
  currentLevelWords = shuffleArray([...currentLevelWords]);
  currentCardIndex = 0;
  currentCard = currentLevelWords[currentCardIndex];
  isFlipped = false;
  
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  
  updateCardDisplay();
}

// Перемешивание массива (рандомный порядок)
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
}

// Обновление всех счётчиков
function updateAllStats() {
  // Счётчик для текущего уровня
  const allCurrentLevelWords = fullDictionary.filter(w => w.level == activeLevel);
  const totalInLevel = allCurrentLevelWords.length;
  const learnedInLevel = allCurrentLevelWords.filter(w => learnedIds.has(w.id)).length;
  const leftInLevel = totalInLevel - learnedInLevel;
  
  document.getElementById('cardsLeft').innerText = leftInLevel;
  document.getElementById('learnedCount').innerText = learnedInLevel;
  
  // Общий счётчик выученных слов (по всем уровням)
  const totalLearnedAllLevels = fullDictionary.filter(w => learnedIds.has(w.id)).length;
  const totalWordsAllLevels = fullDictionary.length;
  
  // Добавляем или обновляем общий счётчик в интерфейсе
  let totalStatElement = document.getElementById('totalLearned');
  if (!totalStatElement) {
    // Если элемент ещё не создан, добавляем его
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer && statsContainer.children.length === 2) {
      const newStatCard = document.createElement('div');
      newStatCard.className = 'stat-card';
      newStatCard.id = 'totalStatCard';
      newStatCard.innerHTML = `
        <span class="stat-value" id="totalLearned">${totalLearnedAllLevels}</span>
        <span class="stat-label">всего выучено</span>
      `;
      statsContainer.appendChild(newStatCard);
    }
  } else {
    totalStatElement.innerText = totalLearnedAllLevels;
  }
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

// Свайп влево (не знаю → в конец)
function swipeLeft() {
  if (!currentCard || currentLevelWords.length <= 1) return;
  
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

// Свайп вправо (знаю → удаляем и запоминаем)
function swipeRight() {
  if (!currentCard) return;
  
  // Добавляем ID слова в выученные
  learnedIds.add(currentCard.id);
  
  // Сохраняем в localStorage
  localStorage.setItem('chincards_learned', JSON.stringify([...learnedIds]));
  
  // Удаляем слово из текущего массива
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
