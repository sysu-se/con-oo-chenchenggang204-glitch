import { createSudoku, createSudokuFromJSON } from './sudoku.js';

function cloneMove(move) {
  return { ...move };
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function validateMove(move) {
  if (!move || typeof move !== 'object') {
    throw new Error('Game move must be an object');
  }

  const { row, col, oldValue, newValue } = move;

  for (const [name, value, max] of [
    ['row', row, 8],
    ['col', col, 8],
    ['oldValue', oldValue, 9],
    ['newValue', newValue, 9],
  ]) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
      throw new Error(`Game move ${name} must be an integer between 0 and ${max}`);
    }
  }
}

function applyMoveToSudoku(sudoku, move, valueKey) {
  sudoku.guess({
    row: move.row,
    col: move.col,
    value: move[valueKey],
  });
}

export function createGame({ sudoku, initialGrid = sudoku.getGrid(), undoStack = [], redoStack = [] }) {
  if (!sudoku || typeof sudoku.clone !== 'function' || typeof sudoku.getGrid !== 'function') {
    throw new Error('Game requires a Sudoku domain object');
  }

  createSudoku(initialGrid);

  let currentSudoku = sudoku.clone();
  let puzzleGrid = cloneGrid(initialGrid);
  let undos = undoStack.map((move) => {
    validateMove(move);
    return cloneMove(move);
  });
  let redos = redoStack.map((move) => {
    validateMove(move);
    return cloneMove(move);
  });

  return {
    getSudoku() {
      return currentSudoku.clone();
    },

    getGrid() {
      return currentSudoku.getGrid();
    },

    getInitialGrid() {
      return cloneGrid(puzzleGrid);
    },

    getInvalidCells() {
      return currentSudoku.getInvalidCells();
    },

    isFixedCell(row, col) {
      currentSudoku.getCell(row, col);
      return puzzleGrid[row][col] !== 0;
    },

    isWon() {
      return currentSudoku.isSolved();
    },

    guess({ row, col, value }) {
      const oldValue = currentSudoku.getCell(row, col);

      if (this.isFixedCell(row, col)) {
        throw new Error('Cannot change a fixed Sudoku cell');
      }

      if (oldValue === value) {
        return false;
      }

      const move = {
        row,
        col,
        oldValue,
        newValue: value,
      };

      currentSudoku.guess({ row, col, value });
      undos.push(move);
      redos = [];
      return true;
    },

    undo() {
      if (undos.length === 0) return false;

      const move = undos.pop();
      applyMoveToSudoku(currentSudoku, move, 'oldValue');
      redos.push(cloneMove(move));
      return true;
    },

    redo() {
      if (redos.length === 0) return false;

      const move = redos.pop();
      applyMoveToSudoku(currentSudoku, move, 'newValue');
      undos.push(cloneMove(move));
      return true;
    },

    canUndo() {
      return undos.length > 0;
    },

    canRedo() {
      return redos.length > 0;
    },

    toJSON() {
      return {
        type: 'Game',
        initialGrid: cloneGrid(puzzleGrid),
        sudoku: currentSudoku.toJSON(),
        undoStack: undos.map(cloneMove),
        redoStack: redos.map(cloneMove),
      };
    },

    toString() {
      return [
        'Game State',
        currentSudoku.toString(),
        `undoStack=${undos.length}`,
        `redoStack=${redos.length}`,
      ].join('\n');
    },
  };
}

export function createGameFromJSON(json) {
  if (!json || !json.sudoku || !json.initialGrid) {
    throw new Error('Invalid Game JSON');
  }

  return createGame({
    sudoku: createSudokuFromJSON(json.sudoku),
    initialGrid: json.initialGrid,
    undoStack: json.undoStack || [],
    redoStack: json.redoStack || [],
  });
}
