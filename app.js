const sentences = [
  { english: 'I wake up at seven in the morning.', spanish: 'Me despierto a las siete de la mañana.', verb: 'despertarse' },
  { english: 'You get up early every day.', spanish: 'Te levantas temprano todos los días.', verb: 'levantarse' },
  { english: 'She showers in the morning.', spanish: 'Ella se ducha por la mañana.', verb: 'ducharse' },
  { english: 'He washes his hands before eating.', spanish: 'Él se lava las manos antes de comer.', verb: 'lavarse' },
  { english: 'We brush our teeth after eating.', spanish: 'Nos cepillamos los dientes después de comer.', verb: 'cepillarse' },
  { english: 'I get dressed before breakfast.', spanish: 'Me visto antes del desayuno.', verb: 'vestirse' },
  { english: 'You comb your hair every morning.', spanish: 'Te peinas todas las mañanas.', verb: 'peinarse' },
  { english: 'They sit near the window.', spanish: 'Se sientan cerca de la ventana.', verb: 'sentarse' },
  { english: 'We go to bed at ten at night.', spanish: 'Nos acostamos a las diez de la noche.', verb: 'acostarse' },
  { english: 'She looks at herself in the mirror.', spanish: 'Ella se mira en el espejo.', verb: 'mirarse' }
];

const list = document.getElementById('sentences');
const status = document.getElementById('status');
const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let activeUtterance = null;

function resetButtons() {
  list.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '▶ Listen in Spanish';
  });
}

function renderListening() {
list.replaceChildren();
sentences.forEach((sentence, index) => {
  const row = document.createElement('li');
  const number = document.createElement('span');
  number.className = 'number';
  number.textContent = `${index + 1}.`;
  const wording = document.createElement('div');
  const text = document.createElement('p');
  text.className = 'sentence';
  text.textContent = sentence.english;
  const translation = document.createElement('p');
  translation.className = 'translation';
  translation.lang = 'es';
  translation.textContent = sentence.spanish;
  wording.append(text, translation);
  const controls = document.createElement('div');
  controls.className = 'controls';
  const speedLabel = document.createElement('label');
  speedLabel.className = 'speed';
  const speedText = document.createElement('span');
  speedText.textContent = 'Speed: 0.85×';
  const speed = document.createElement('input');
  speed.type = 'range';
  speed.min = '0.1';
  speed.max = '1.5';
  speed.step = '0.05';
  speed.value = '0.85';
  speed.setAttribute('aria-label', `Speech speed for sentence ${index + 1}`);
  speed.setAttribute('aria-valuetext', '0.85 times normal speed');
  speed.addEventListener('input', () => {
    speedText.textContent = `Speed: ${Number(speed.value).toFixed(2)}×`;
    speed.setAttribute('aria-valuetext', `${speed.value} times normal speed`);
  });
  speedLabel.append(speedText, speed);
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '▶ Listen in Spanish';
  button.setAttribute('aria-label', `Listen in Spanish: ${sentence.english}`);
  button.setAttribute('aria-pressed', 'false');
  button.disabled = !supported;
  button.addEventListener('click', () => {
    activeUtterance = null;
    window.speechSynthesis.cancel();
    resetButtons();
    const utterance = new SpeechSynthesisUtterance(sentence.spanish);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(item => /^es[-_]MX$/i.test(item.lang)) || voices.find(item => /^es([-_]|$)/i.test(item.lang));
    utterance.lang = voice ? voice.lang : 'es-ES';
    if (voice) utterance.voice = voice;
    utterance.rate = Number(speed.value);
    activeUtterance = utterance;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = '♫ Playing Spanish…';
    status.textContent = `Playing sentence ${index + 1} · ${sentence.verb}`;
    utterance.onend = () => {
      if (activeUtterance !== utterance) return;
      resetButtons();
      status.textContent = '';
      activeUtterance = null;
    };
    utterance.onerror = () => {
      if (activeUtterance !== utterance) return;
      resetButtons();
      status.textContent = 'Speech could not play. Try again or check that a Spanish voice is installed on your device.';
      activeUtterance = null;
    };
    window.speechSynthesis.speak(utterance);
  });
  controls.append(button, speedLabel);
  row.append(number, wording, controls);
  list.append(row);
});

if (!supported) status.textContent = 'This browser does not support speech. Open this page in a browser with text-to-speech support.';
}

renderListening();
let practiceMode = false;
document.getElementById('next').addEventListener('click', () => {
  activeUtterance = null;
  if (supported) window.speechSynthesis.cancel();
  stopPractice();
  status.textContent = '';
  practiceMode = !practiceMode;
  document.querySelector('h1').textContent = practiceMode ? 'Your turn: speak Spanish' : 'Spanish reflexive verbs';
  document.querySelector('.intro').textContent = practiceMode
    ? 'Translate each English sentence aloud in Spanish. Tap Record, allow microphone access, then tap Stop when finished. Feedback compares recognized words with the practice sentence; it is not a pronunciation grade.'
    : 'Read each English sentence and its Spanish translation. Tap Listen in Spanish to hear it. Adjust the speed slider before listening.';
  document.getElementById('next').textContent = practiceMode ? 'Back to practice' : 'Next';
  if (practiceMode) renderPractice(sentences, list, status);
  else renderListening();
  document.querySelector('h1').focus();
  window.scrollTo(0, 0);
});
