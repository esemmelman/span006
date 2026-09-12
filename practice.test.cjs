const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.textContent = ''; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this.textContent = ''; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(event, callback) { this.events[event] = callback; }
  querySelectorAll(tag) { return this.children.flatMap(child => [ ...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
  focus() {}
}
function setup(support = true) {
  const elements = Object.fromEntries(['sentences', 'status', 'next', 'h1', '.intro'].map(id => [id, new Element(id)]));
  let instance;
  class Recognition {
    constructor() { instance = this; }
    start() { this.onstart(); }
    stop() { this.onend(); }
    abort() { this.onend(); }
  }
  const context = vm.createContext({
    document: { getElementById: id => elements[id], querySelector: id => elements[id], createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('text'), { textContent: text }) },
    window: { addEventListener() {}, scrollTo() {}, ...(support ? { SpeechRecognition: Recognition } : {}) },
    setTimeout: () => 1, clearTimeout() {}
  });
  vm.runInContext(fs.readFileSync('practice.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);
  return { context, elements, recognition: () => instance };
}

test('word scoring handles exact, partial, unrelated, accents, digits and optional subjects', () => {
  const { context: c } = setup();
  assert.equal(c.compareSpeech('Él se lava las manos.', 'se lava las manos'), 100);
  assert.equal(c.compareSpeech('Me despierto a las siete.', 'Yo me despierto a las 7!'), 100);
  assert.equal(c.compareSpeech('Me lavo las manos.', 'Me lavo manos.'), 75);
  assert.equal(c.compareSpeech('Me lavo las manos.', 'hello world'), 0);
  assert.equal(c.compareSpeech('Me lavo las manos.', ''), 0);
  assert.ok(c.compareSpeech('Ella se ducha.', 'Él se ducha.') < 100);
});

test('Next shows ten shuffled English prompts with Record buttons and no translations or sliders', () => {
  const { elements: e } = setup();
  const original = e.sentences.children.map(row => row.children[1].children[0].textContent);
  e.next.events.click();
  assert.equal(e.sentences.children.length, 10);
  assert.equal(e.sentences.querySelectorAll('input').length, 0);
  assert.equal(e.sentences.querySelectorAll('p').length, 10);
  assert.ok(e.sentences.querySelectorAll('button').every(b => b.textContent === 'Record'));
  const shuffled = e.sentences.children.map(row => row.children[1].textContent);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
  assert.notDeepEqual(shuffled, original);
  e.next.events.click();
  assert.equal(e.sentences.querySelectorAll('input').length, 10);
});

test('recording scores the correct shuffled answer, supports stop, retry, errors and navigation cleanup', () => {
  const { context: c, elements: e, recognition } = setup();
  e.next.events.click();
  const row = e.sentences.children[0];
  const button = row.children[2].children[0];
  const feedback = row.children[3];
  button.events.click();
  assert.equal(button.textContent, 'Stop');
  assert.equal(e.sentences.children[1].children[2].children[0].disabled, true);
  c.english = row.children[1].textContent;
  const answer = vm.runInContext('sentences.find(s => s.english === english).spanish', c);
  const result = [{ transcript: answer }]; result.isFinal = true;
  recognition().onresult({ results: [result] });
  button.events.click();
  assert.match(feedback.children[0].textContent, /100%/);
  assert.equal(button.textContent, 'Record');
  button.events.click();
  recognition().onerror({ error: 'not-allowed' });
  assert.match(feedback.textContent, /denied/);
  assert.equal(button.disabled, false);
  button.events.click();
  recognition().onend();
  assert.match(feedback.textContent, /No speech/);
  button.events.click();
  const previous = recognition();
  e.next.events.click();
  previous.onend();
  assert.equal(e.sentences.querySelectorAll('input').length, 10);
});

test('unsupported browsers show an explanation and disable recording', () => {
  const { elements: e } = setup(false);
  e.next.events.click();
  assert.match(e.status.textContent, /unavailable/);
  assert.ok(e.sentences.querySelectorAll('button').every(b => b.disabled));
});
