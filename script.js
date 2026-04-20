let fullDictionary = [];
let activeLevel = 1;
let rotationQueue = [];
let currentCardIndex = 0;
let isFlipped = false;
let touchStartX = 0;
let isSwiping = false;

async function loadDictionary() {
  try {
    const response = await fetch('hsk.json');
    fullDictionary = await response.json();
    
    // Подсчёт слов по уровням
    const totalWords = fullDictionary.length;
    const hsk1Words = fullDictionary.filter(w => w.level == 1).length;
    const hsk2Words = fullDictionary.filter(w => w.level == 2).length;
    const hsk3Words = fullDictionary.filter(w => w.level == 3).length;
    
    // Всплывающее окно с информацией
    alert(`Загружено слов всего: ${totalWords}\nHSK1: ${hsk1Words}\nHSK2: ${hsk2Words}\nHSK3: ${hsk3Words}`);
    
    initForLevel(activeLevel);
  } catch (err) {
    console.error('Ошибка загрузки hsk.json', err);
    alert('Ошибка загрузки hsk.json! Проверьте, что файл есть в корне репозитория');
    fullDictionary = [
      { hanzi: "爱", level: 1, pinyin: "ài", translations: { rus: ["любовь", "любить"] } },
      { hanzi: "八", level: 1, pinyin: "bā", translations: { rus: ["восемь"] } }
    ];
    initForLevel(1);
  }
}

function initForLevel(level) {
  const levelWords = fullDictionary.filter(w => w.level == level);
  if (levelWords.length === 0) {
    rotationQueue = [];
    currentCardIndex = 0;
    updateCardDisplay();
    updateStats();
    return;
  }
  rotationQueue = shuffleArray([...levelWords]);
  currentCardIndex = 0;
  isFlipped = false;
  const cardEl = document.getElementById('flashcard');
  if (cardEl) cardEl.classList.remove('flipped');
  updateCardDisplay();
  updateStats();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

function updateCardDisplay() {
  if (rotationQueue.length === 0 || currentCardIndex >= rotationQueue.length) {
    document.getElementById('chineseChar').innerText = '🎉';
    document.getElementById('pinyin').innerHTML = '';
    document.getElementById('meaning').innerHTML = 'Все слова выучены!';
    const extraEl = document.getElementById('extraMeanings');
    if (extraEl) extraEl.innerHTML = '';
    return;
  }
  const word = rotationQueue[currentCardIndex];
  document.getElementById('chineseChar').innerText = word.hanzi;
  document.getElementById('pinyin').innerHTML = word.pinyin;
  
  const [mainMeaning, extraMeanings] = getRussianTranslation(word);
  document.getElementById('meaning').innerHTML = mainMeaning;
  
  const extraEl = document.getElementById('extraMeanings');
  if (extraEl) {
    if (extraMeanings.length > 0) {
      extraEl.innerHTML = extraMeanings.map(m => `• ${m}`).join('<br>');
    } else {
      extraEl.innerHTML = '';
    }
  }
}

function updateStats() {
  document.getElementById('cardsLeft').innerText = rotationQueue.length;
}

function speakWord(hanzi) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(hanzi);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function flipCard() {
  const card = document.getElementById('flashcard');
  if (!rotationQueue.length) return;
  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add('flipped');
    const currentWord = rotationQueue[currentCardIndex];
    speakWord(currentWord.hanzi);
  } else {
    card.classList.remove('flipped');
  }
}

function swipeLeft() {
  if (rotationQueue.length <= 1) return;
  const currentWord = rotationQueue[currentCardIndex];
  rotationQueue.splice(currentCardIndex, 1);
  rotationQueue.push(currentWord);
  if (currentCardIndex >= rotationQueue.length) currentCardIndex = 0;
  isFlipped = false;
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  updateCardDisplay();
  updateStats();
  animateSwipe('left');
}

function swipeRight() {
  if (rotationQueue.length === 0) return;
  rotationQueue.splice(currentCardIndex, 1);
  if (rotationQueue.length === 0) {
    currentCardIndex = 0;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    updateCardDisplay();
    updateStats();
    animateSwipe('right');
    return;
  }
  if (currentCardIndex >= rotationQueue.length) currentCardIndex = 0;
  isFlipped = false;
  document.getElementById('flashcard').classList.remove('flipped');
  updateCardDisplay();
  updateStats();
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

function attachTouchEvents() {
  const container = document.querySelector('.card-container');
  if (!container) return;
  
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  });
  
  container.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 30) e.preventDefault();
  });
  
  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 60) {
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
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0) swipeRight();
      else swipeLeft();
    }
    isSwiping = false;
  });
}

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

function initSpeech() {
  if (window.speechSynthesis) {
    const dummy = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(dummy);
  }
}

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
