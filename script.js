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
  let needsUpdate = true;
  
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
