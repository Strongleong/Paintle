// @ts-check

// Dirty hack so tsserver stops crying about '<global variable> not defined'
/** @type {Record<string, string>} */
const errorMessages = window['errorMessages'];

/** @type {Array<string>} */
const allowedLangs = window['allowedLangs'];

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
  /** @type {Record<string, Array<string>>} */
  wordlists: {},

  /** @type {string} */
  current_wordlist: '',

  /** @type {CELL_COLORS} */
  active_color: CELL_COLORS.CORRECT,

  /** @type {boolean} */
  mouseDown: false,

  /** @type {boolean} */
  darkMode: true,

  /** @type {string} */
  worldeAnswer: window['worldeSampleAnswer'],

  /** @type {CELL_COLORS[]} */
  pattern: Array.from(new Array(30), () => CELL_COLORS.ABSENT),
}

/**
 * @param {number} index
 * @param {CELL_COLORS} color
 */
function patternSet(index, color) {
  state.pattern[index] = color;
  cache_set('pattern', state.pattern);
}

function patternReset() {
  state.pattern = Array.from(new Array(30), () => CELL_COLORS.ABSENT);
  cache_delete('pattern')
}

function patternDraw() {
  document.querySelectorAll('#board .cell').forEach((cell, i) => {
    cell.classList.value = "cell cell-anim " + state.pattern[i];
    setTimeout(() => cell.classList.remove('cell-anim'), 200);
  });
}

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

  if (!element || !(element instanceof type)) {
    throw new Error(`Failed to locate HTML element with id '${id}' and type '${type}'!`);
  }

  return element;
}

const dom = {
  langSwitcher:         getEl('lang-switcher',          HTMLSelectElement),
  darkModeSwitcher:     getEl('dark-mode',              HTMLElement),
  githubLink:           getEl('github-link',            HTMLElement),
  wordlistInputHeading: getEl('wordlist-input-heading', HTMLDivElement),
  wordlistInputBlock:   getEl('wordlist-input-block',   HTMLElement),
  wordlistButton:       getEl('wordlist-upload',        HTMLButtonElement),
  wordlistInput:        getEl('wordlist-input',         HTMLInputElement),
  solutionInput:        getEl('solution',               HTMLInputElement),
  loadSolutionButton:   getEl('load-solution-button',   HTMLButtonElement),
  langSelect:           getEl('language',               HTMLSelectElement),
  wordlistError:        getEl('wordlist-error',         HTMLDivElement),
  colorblindModeToggle: getEl('colorblind-mode',        HTMLInputElement),
  solveButton:          getEl('solve',                  HTMLButtonElement),
  boardResetButton:     getEl('board-reset-button',     HTMLButtonElement),
}

/**
 * @typedef {Object} CacheValue
 * @property {any} value
 * @property {number} timestamp
 */

/**
 * @param {string} key
 * @param {any} value
 */
function cache_set(key, value) {
  /** @type {CacheValue} */
  const data = {
    timestamp: Date.now(),
    value
  };

  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * @param {string} key
 * @returns any|null
 */
function cache_get(key) {
  const item = localStorage.getItem(key);

  if (item === null) {
    return null;
  }

  /** @type {CacheValue} */
  const data = JSON.parse(item);
  const three_hours = 3 * 60 * 60 * 1000;

  if (Date.now() - data.timestamp > three_hours) {
    cache_delete(key);
  }

  return data.value;
}

/**
 * @param {string} key
 */
function cache_delete(key) {
  localStorage.removeItem(key)
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
  state.wordlists[name] = await res.json();
  state.current_wordlist = name;
}

async function fetch_solution() {
  const res = await fetch(`spoil_solution.php?lang=${dom.langSelect.value}`);
  const solution = (await res.json()).solution;
  state.worldeAnswer = solution;
  cache_set(`solution.${window['lang']}`, solution);
  dom.solutionInput.value = solution;
}

function find_solutions() {
  const regexes = [];
  let correct_answer = state.worldeAnswer;
  let current_regex_index = -1; // beacause we increment it in pattern for loop

  state.pattern.forEach((cell, i) => {
    let row = i % 5;

    // For every row create new regex
    if (row === 0) {
      regexes.push('');
      correct_answer = state.worldeAnswer;
      current_regex_index++;
    }

    switch (cell) {
      case CELL_COLORS.CORRECT: {
        regexes[current_regex_index] += state.worldeAnswer[row];
        // @ts-ignore
        correct_answer = correct_answer.replaceAll(state.worldeAnswer[row], '');
        break;
      }
      case CELL_COLORS.PRESENT: {
        // @ts-ignore
        regexes[current_regex_index] += `[${correct_answer.replaceAll(state.worldeAnswer[row], '')}]`;
        break;
      }
      case CELL_COLORS.ABSENT:
      default: regexes[current_regex_index] += `[^${state.worldeAnswer}]`; break;
    }
  })

  return regexes.map(regex => state.wordlists[state.current_wordlist].filter(word => new RegExp(regex).test(word)));
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

    const word = solutions[j];

    cell.classList.add('cell-anim');
    cell.classList.add('cell-anim-delay');
    const timeout = 200 + 50 * Number(/** @type {HTMLDivElement} */ (cell).style.getPropertyValue('--animation-order'));

    setTimeout(() =>  {
      cell.classList.remove('cell-anim');
      cell.classList.remove('cell-anim-delay');

      if (word !== undefined) {
        cell.innerHTML = word[k];
        cell.classList.remove('noresult');
        return;
      }

      cell.innerHTML = '';
      cell.classList.add('noresult');
    }, timeout);
  })
}

/**
 * @param {File} file
 */
async function loadWordlistFromFile(file) {
  dom.wordlistButton.innerText = file.name;
  const words = await file.text();
  let wordsArr;

  if (file.type === 'application/json') {
    try {
      wordsArr = JSON.parse(words);
      if (!Array.isArray(words)) {
        dom.wordlistError.innerText = errorMessages.jsonIsNotAnArray;
      }
    } catch {
      dom.wordlistError.innerText = errorMessages.jsonIsNotValid;
    }

  } else if (file.type === 'text/plain') {
    wordsArr = words.split('\n').filter(word => word !== "");
  } else {
    dom.wordlistError.innerText = errorMessages.uploadedFileWrongFile;
  }

  const badWord = wordsArr.find((/** @type {string} */ word) => word.length !== 5);
  if (badWord !== undefined) {
    dom.wordlistError.innerText = errorMessages.uploadedFileBadWord + ": '" + badWord + "'";
  }

  state.current_wordlist = 'custom'
  state.wordlists['custom'] = wordsArr;
}

function main() {
  allowedLangs.forEach(lang => {
    state.wordlists[lang] = [];
  });

  state.wordlists['custom'] = [];

  const solution = cache_get(`solution.${window['lang']}`);

  if (solution) {
    state.worldeAnswer = solution;
    dom.solutionInput.value = solution;
  } else {
    // Forcefuly clearing solution input to combat browser cache
    dom.solutionInput.value = "";
  }

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
      cell.classList.value = "cell cell-anim " + state.active_color;
      setTimeout(() => cell.classList.remove('cell-anim'), 200);
      patternSet(i, state.active_color);
      state.mouseDown = true;
    });

    listen(cell, 'mouseover', (e) => {
      e.preventDefault();

      if (!state.mouseDown) {
        return;
      }

      cell.classList.value = "cell noselect cell-anim " + state.active_color;
      setTimeout(() => cell.classList.remove('cell-anim'), 200);
      patternSet(i, state.active_color);
    });
  });

  listen(dom.langSwitcher, 'change', () => {
    document.location = `${location.protocol}//${document.location.host}${location.pathname}?lang=${dom.langSwitcher.value}`;
  });

  listen(dom.loadSolutionButton, 'click', async () => {
    dom.loadSolutionButton.classList.toggle('button--loading');
    await fetch_solution()
    dom.loadSolutionButton.classList.toggle('button--loading');
  });

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
      // TODO: cache worlde solution

      const files = dom.wordlistInput.files;
      const file = files ? files[0] : null;
      if (!file) return;
      await loadWordlistFromFile(file);
    }
  });

  listen(dom.colorblindModeToggle, 'change', () => {
    document.querySelectorAll('.cell').forEach((cell) => {
      cell.classList.add('cell-trans');
      setTimeout(() => cell.classList.remove('cell-trans'), 200);
    })
    document.documentElement.classList.toggle('colorblind-mode');
  })

  listen(dom.darkModeSwitcher, 'click', () => {
    state.darkMode = !state.darkMode;
    dom.darkModeSwitcher.classList.toggle('nf-oct-sun');
    dom.darkModeSwitcher.classList.toggle('nf-oct-moon');
    document.querySelectorAll('.cell').forEach((cell) => {
      cell.classList.add('cell-trans');
      setTimeout(() => cell.classList.remove('cell-trans'), 200);
    })
    document.documentElement.classList.toggle('light-theme');
  });

  listen(dom.boardResetButton, 'click', () => {
    document.querySelectorAll('main .cell').forEach((cell) => {
      cell.classList.value = 'cell noselect cell-anim';
      patternReset();
      setTimeout(() => {
        cell.classList.remove('cell-anim');
        cell.innerHTML = '';
      }, 200);
    })
  });

  listen(dom.solveButton, 'click', async () => {
    state.worldeAnswer = dom.solutionInput.value?.toLowerCase() ?? state.worldeAnswer;
    show_solutions(find_solutions());
  });

  if (dom.colorblindModeToggle.checked) {
    document.documentElement.classList.add('colorblind-mode');
  }

  const pattern = cache_get('pattern');
  if (pattern) {
    state.pattern = pattern;
    patternDraw();
  }

  fetch_wordlist(dom.langSelect.value);
}

main();
