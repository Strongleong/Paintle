const COLOR_CORRECT = 'correct';
const COLOR_PRESENT = 'present';
const COLOR_ABSENT = 'absent';

const state = {
  words: [],
  active_color: COLOR_CORRECT,
  mouseDown: false,
  correct_answer: 'pasta',
  pattern: Array.from(new Array(30), () => COLOR_ABSENT),
}

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
      case COLOR_CORRECT: regexes[j] += state.correct_answer[k]; break;
      case COLOR_PRESENT: regexes[j] += `[${state.correct_answer.replaceAll(state.correct_answer[k], '')}]`; break;
      case COLOR_ABSENT:
      default: regexes[j] += `[^${state.correct_answer}]`; break;
    }
  })

  return regexes.map(r => state.words.filter(v => new RegExp(r).test(v)));
}

function show_solutions(solutions) {
  solutions = solutions.map(x => x[Math.floor(Math.random() * x.length) | 0]);

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

function main() {
  document.addEventListener('mousedown', () => state.mouseDown = true);
  document.addEventListener('mouseup',   () => state.mouseDown = false);

  document.querySelectorAll('.pallete .cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(state.active_color).classList.remove('active');
      e.target.classList.add('active');
      state.active_color = e.target.id;
    });
  });

  document.querySelectorAll('#board .cell').forEach((cell, i) => {
    cell.addEventListener('mousedown', (e) => {
      e.preventDefault();
      cell.classList.value = "cell " + state.active_color;
      state.pattern[i] = state.active_color;
      state.mouseDown = true;
    });

    cell.addEventListener('mouseover', (e) => {
      e.preventDefault();

      if (!state.mouseDown) {
        return;
      }

      cell.classList.value = "cell noselect " + state.active_color;

      state.pattern[i] = state.active_color;
    });
  });

  document.getElementById('solve').addEventListener('click', async () => {
    await fetch_wordlist(document.getElementById('language').value);
    state.correct_answer = document.getElementById('solution').value?.toLowerCase();
    const solutions = find_solutions();
    show_solutions(solutions)
  });
}


main();
