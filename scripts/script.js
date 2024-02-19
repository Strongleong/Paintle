// @ts-check

/**
 * @template T
 * @typedef {new (...args: any[]) => T} Class<T>
 */

/**
 * @readonly
 * @enum {String}
 */
const CELL_COLORS = {
  CORRECT: 'correct',
  PRESENT: 'present',
  ABSENT:  'absent',
}

const state = {
  /** @type {string[]} */
  words: [],

  /** @type {CELL_COLORS} */
  active_color: CELL_COLORS.CORRECT,

  /** @type {boolean} */
  mouseDown: false,

  /** @type {string} */
  correct_answer: 'pasta',

  /** @type {CELL_COLORS[]} */
  pattern: Array.from(new Array(30), () => CELL_COLORS.ABSENT),
}

/** @type {(name: string, value: string) => void} */
const setCssVar = document.documentElement.style.setProperty.bind(document.documentElement.style);

/**
 * Retrieves an element by its ID and checks its type.
 * To make tsserver happy
 * @template {HTMLElement} T
 * @param {string} id - ID of the element.
 * @param {Class<T>} type - Type of the element.
 * @returns {T} The element bearing the given ID.
 */
function getEl(id, type) {
  const element = document.getElementById(id);
  if (!element || !(element instanceof type))
    throw new Error(`Failed to locate HTML element with id '${id}' and type '${type}'!`);
  return element;
}

const dom = {
  wordlistInputBlock:   getEl('wordlist-input-block', HTMLElement),
  wordlistButton:       getEl('wordlist-upload',      HTMLButtonElement),
  wordlistInput:        getEl('wordlist-input',       HTMLInputElement),
  solutionInput:        getEl('solution',             HTMLInputElement),
  langSelect:           getEl('language',             HTMLSelectElement),
  wordlistError:        getEl('wordlist-error',       HTMLDivElement),
  colorblindModeToggle: getEl('colorblind-mode',      HTMLInputElement),
  solveButton:          getEl('solve',                HTMLButtonElement),
}

/**
 * @param {Element|Document} el
 * @param {Parameters<typeof document.addEventListener>[0]} event
 * @param {Parameters<typeof document.addEventListener>[1]} callback
 */
function listen(el, event, callback) {
  el.addEventListener(event, callback);
}

/**
 * @param {string} name
 */
async function fetch_wordlist(name) {
  const res = await fetch(`wordlists/${name}.json`);
  state.words = await res.json();
  state.wordlist = name;
}

function find_solutions() {
  const regexes = [];
  let j = -1;

  state.pattern.forEach((x, i) => {
    let k = i % 5;

    if (k === 0) {
      regexes.push('');
      j++;
    }

    switch (x) {
      case CELL_COLORS.CORRECT: regexes[j] += state.correct_answer[k]; break;
      case CELL_COLORS.PRESENT: regexes[j] += `[${state.correct_answer.replaceAll(state.correct_answer[k], '')}]`; break;
      case CELL_COLORS.ABSENT:
      default: regexes[j] += `[^${state.correct_answer}]`; break;
    }
  })

  return regexes.map(r => state.words.filter(v => new RegExp(r).test(v)));
}

/**
 * @param {string[][]} solutionsMap
 */
function show_solutions(solutionsMap) {
  const solutions = solutionsMap.map(x => x[Math.floor(Math.random() * x.length) | 0]);

  let j = -1;

  document.querySelectorAll('#board .cell').forEach((cell, i) => {
    let k = i % 5;

    if (k === 0) {
      j++;
    }

    const word = solutions[j]

    if (word !== undefined) {
      cell.innerHTML = word[k];
      cell.classList.remove('noresult');
      return;
    }

    cell.innerHTML = '';
    cell.classList.add('noresult');
  })
}

/**
 * @param {File} file
 */
async function loadWordlistFromFile(file) {
  dom.wordlistButton.innerText = file.name;
  const words = await file.text()
  let wordsArr;

  if (file.type === 'application/json') {
    try {
      wordsArr = JSON.parse(words);
      if (!Array.isArray(words)) {
        dom.wordlistError.innerText = "JSON - не массив";
      }
    } catch {
      dom.wordlistError.innerText = "Не корректный JSON";
    }

  } else if (file.type === 'text/plain') {
    wordsArr = words.split('\n').filter(word => word !== "");
  } else {
    dom.wordlistError.innerText = "Не корректный тип файла";
  }

  const badWord = wordsArr.find((/** @type {string} */ word) => word.length !== 5);
  if (badWord !== undefined) {
    dom.wordlistError.innerText = "Слово меньше пяти букв - " + badWord;
  }

  state.words = wordsArr;
}

function main() {
  listen(document, 'mousedown', () => state.mouseDown = true);
  listen(document, 'mouseup',   () => state.mouseDown = false);

  document.querySelectorAll('.pallete .cell').forEach((cell) => {
    listen(cell, 'click', (e) => {
      e.preventDefault();
      getEl(state.active_color, HTMLDivElement).classList.remove('active');
      if (e.target instanceof HTMLDivElement) {
        e.target.classList.add('active');
        state.active_color = e.target.id;
      }
    });
  });

  document.querySelectorAll('#board .cell').forEach((cell, i) => {
    listen(cell, 'mousedown', (e) => {
      e.preventDefault();
      cell.classList.value = "cell " + state.active_color;
      state.pattern[i] = state.active_color;
      state.mouseDown = true;
    });

    listen(cell, 'mouseover', (e) => {
      e.preventDefault();

      if (!state.mouseDown) {
        return;
      }

      cell.classList.value = "cell noselect " + state.active_color;
      state.pattern[i] = state.active_color;
    });
  });

  listen(dom.colorblindModeToggle, 'change', () => {
    if (dom.colorblindModeToggle.checked) {
      setCssVar('--color-cell-correct', 'var(--color-colorblind-correct)');
      setCssVar('--color-cell-present', 'var(--color-colorblind-present)');
      setCssVar('--color-cell-abscent', 'var(--color-colorblind-abscent)');
      setCssVar('--color-cell-font',    'var(--color-background)');
    } else {
      setCssVar('--color-cell-correct', 'var(--color-correct)');
      setCssVar('--color-cell-present', 'var(--color-present)');
      setCssVar('--color-cell-abscent', 'var(--color-abscent)');
      setCssVar('--color-cell-font',    'var(--color-text)');
    }
  })

  listen(dom.wordlistButton, 'click', () => dom.wordlistInput.click());

  listen(dom.wordlistInput, 'change', async () => {
    dom.wordlistError.innerText = "";
    const files = dom.wordlistInput.files;
    const file = files ? files[0] : null;
    if (!file) return;
    await loadWordlistFromFile(file);
  });

  listen(dom.langSelect, 'change', async () => {
    if (dom.langSelect.value !== 'own') {
      await fetch_wordlist(dom.langSelect.value);
      dom.wordlistInputBlock.classList.add('nodisplay');
    } else {
      dom.wordlistInputBlock.classList.remove('nodisplay');

      const files = dom.wordlistInput.files;
      const file = files ? files[0] : null;
      if (!file) return;
      await loadWordlistFromFile(file);
    }
  });

  listen(dom.solveButton, 'click', async () => {
    state.correct_answer = dom.solutionInput.value?.toLowerCase();
    const solutions = find_solutions();
    show_solutions(solutions)
  });

  fetch_wordlist('en');
}

main();
