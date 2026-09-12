let recordingSession = null;

function normalizeWords(text) {
  const numbers = { '7': 'siete', '10': 'diez' };
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean)
    .map(word => numbers[word] || word);
}

function compareSpeech(expected, spoken) {
  const target = normalizeWords(expected);
  const heard = normalizeWords(spoken);
  // Spanish subject pronouns may be omitted without changing these answers.
  const explicitSubjects = new Set(['yo', 'tu', 'el', 'ella', 'nosotros', 'nosotras', 'ellos', 'ellas']);
  const subjects = explicitSubjects.has(target[0]) ? [target.shift()]
    : ({ me: ['yo'], te: ['tu'], nos: ['nosotros', 'nosotras'], se: ['ellos', 'ellas'] }[target[0]] || []);
  if (subjects.includes(heard[0])) heard.shift();
  const distance = Array.from({ length: target.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= heard.length; j++) distance[0][j] = j;
  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= heard.length; j++) {
      distance[i][j] = Math.min(distance[i - 1][j] + 1, distance[i][j - 1] + 1,
        distance[i - 1][j - 1] + (target[i - 1] === heard[j - 1] ? 0 : 1));
    }
  }
  const score = Math.round(100 * (1 - distance[target.length][heard.length] / Math.max(target.length, heard.length, 1)));
  return Math.max(0, score);
}

function shuffledSentences(sentences) {
  const result = [...sentences];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result.every((item, i) => item === sentences[i])) result.push(result.shift());
  return result;
}

function stopPractice() {
  if (!recordingSession) return;
  const session = recordingSession;
  recordingSession = null;
  clearTimeout(session.timer);
  session.recognition.abort();
}

function renderPractice(sentences, list, status) {
  list.replaceChildren();
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) status.textContent = 'Recording is unavailable in this browser. Try this page in Chrome or Safari with microphone access enabled.';
  const buttons = [];
  shuffledSentences(sentences).forEach((sentence, index) => {
    const row = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'number';
    number.textContent = `${index + 1}.`;
    const text = document.createElement('p');
    text.className = 'sentence';
    text.textContent = sentence.english;
    const controls = document.createElement('div');
    controls.className = 'controls';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Record';
    button.setAttribute('aria-label', `Record sentence ${index + 1}`);
    button.disabled = !Recognition;
    buttons.push(button);
    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    controls.append(button);
    row.append(number, text, controls, feedback);
    list.append(row);

    button.addEventListener('click', () => {
      if (recordingSession) {
        if (recordingSession.button === button) {
          button.disabled = true;
          button.textContent = 'Checking…';
          recordingSession.recognition.stop();
        }
        return;
      }
      const recognition = new Recognition();
      const session = { recognition, button, timer: null };
      recordingSession = session;
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = false;
      let transcript = '';
      let error = false;
      feedback.textContent = 'Opening microphone…';
      buttons.forEach(item => { item.disabled = item !== button; });
      button.textContent = 'Stop';
      button.setAttribute('aria-label', `Stop recording sentence ${index + 1}`);
      button.setAttribute('aria-pressed', 'true');
      const finish = () => {
        if (recordingSession !== session) return;
        clearTimeout(session.timer);
        recordingSession = null;
        buttons.forEach(item => { item.disabled = false; });
        button.textContent = 'Record';
        button.setAttribute('aria-label', `Record sentence ${index + 1}`);
        button.setAttribute('aria-pressed', 'false');
        if (error) return;
        if (!transcript.trim()) {
          feedback.textContent = 'No speech was recognized. Tap Record and try again.';
          return;
        }
        const score = compareSpeech(sentence.spanish, transcript);
        const summary = document.createElement('p');
        summary.className = 'score';
        summary.textContent = `${score}% word match · ${score === 100 ? 'Excellent match!' : score >= 80 ? 'Very close!' : score >= 50 ? 'Good start. Try again!' : 'Keep practicing. Try again!'}`;
        const heard = document.createElement('p');
        heard.append(document.createTextNode('Heard: '));
        const spoken = document.createElement('span');
        spoken.lang = 'es';
        spoken.textContent = transcript;
        heard.append(spoken);
        const hint = document.createElement('p');
        hint.textContent = score === 100 ? 'All words matched the practice sentence.' : 'Check the reflexive pronoun, verb, and word order. You can go back to practice and listen again. Other valid translations may receive a lower match.';
        feedback.replaceChildren(summary, heard, hint);
      };
      recognition.onstart = () => {
        if (recordingSession === session) feedback.textContent = 'Listening… Speak Spanish, then tap Stop.';
      };
      recognition.onresult = event => {
        if (recordingSession !== session) return;
        transcript = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' ').trim();
      };
      recognition.onerror = event => {
        if (recordingSession !== session) return;
        error = true;
        const messages = {
          'not-allowed': 'Microphone access was denied. Allow microphone access in your browser, then try again.',
          'service-not-allowed': 'Speech recognition is blocked by this browser. Try another supported browser.',
          'audio-capture': 'No microphone is available. Connect or enable your microphone and try again.',
          'network': 'The speech service could not connect. Check your internet connection and try again.',
          'no-speech': 'No speech was recognized. Tap Record and try again.'
        };
        feedback.textContent = messages[event.error] || 'Recording could not finish. Tap Record to try again.';
        finish();
      };
      recognition.onend = finish;
      try {
        recognition.start();
        session.timer = setTimeout(() => {
          if (recordingSession === session) {
            button.disabled = true;
            button.textContent = 'Checking…';
            recognition.stop();
          }
        }, 30000);
      } catch {
        error = true;
        feedback.textContent = 'The microphone could not start. Check your browser permissions and try again.';
        finish();
      }
    });
  });
}

window.addEventListener('pagehide', stopPractice);
