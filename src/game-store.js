import { derived, get, writable } from 'svelte/store';
import { createGame, createGameFromJSON, createSudoku } from './domain/index.js';

const EMPTY_GRID = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function createGameFromPuzzle(initialGrid) {
  const puzzleGrid = cloneGrid(initialGrid);
  return createGame({
    sudoku: createSudoku(puzzleGrid),
    initialGrid: puzzleGrid,
  });
}

function snapshotGame(game) {
  return {
    game,
    initialGrid: game.getInitialGrid(),
    currentGrid: game.getGrid(),
    invalidCells: game.getInvalidCells(),
    won: game.isWon(),
    canUndo: game.canUndo(),
    canRedo: game.canRedo(),
  };
}

export function createGameStore(initialGrid = EMPTY_GRID) {
  const state = writable(snapshotGame(createGameFromPuzzle(initialGrid)));

  const gameStore = derived(state, ($state) => $state.game);
  const currentGridStore = derived(state, ($state) => $state.currentGrid);
  const initialGridStore = derived(state, ($state) => $state.initialGrid);
  const invalidCellsStore = derived(state, ($state) => $state.invalidCells);
  const wonStore = derived(state, ($state) => $state.won);
  const canUndoStore = derived(state, ($state) => $state.canUndo);
  const canRedoStore = derived(state, ($state) => $state.canRedo);

  function setGame(game) {
    state.set(snapshotGame(game));
    return game;
  }

  function mutateGame(mutator) {
    let result;

    state.update(($state) => {
      result = mutator($state.game);
      return snapshotGame($state.game);
    });

    return result;
  }

  return {
    subscribe: state.subscribe,
    gameStore,
    currentGridStore,
    initialGridStore,
    invalidCellsStore,
    wonStore,
    canUndoStore,
    canRedoStore,

    start(nextPuzzle) {
      return setGame(createGameFromPuzzle(nextPuzzle));
    },

    load(json) {
      return setGame(createGameFromJSON(json));
    },

    guess(move) {
      return mutateGame((game) => game.guess(move));
    },

    undo() {
      return mutateGame((game) => game.undo());
    },

    redo() {
      return mutateGame((game) => game.redo());
    },

    canUndo() {
      return get(state).canUndo;
    },

    canRedo() {
      return get(state).canRedo;
    },

    exportJSON() {
      return get(state).game.toJSON();
    },

    getCurrentGrid() {
      return cloneGrid(get(state).currentGrid);
    },

    getInitialGrid() {
      return cloneGrid(get(state).initialGrid);
    },

    getInvalidCells() {
      return [...get(state).invalidCells];
    },

    isWon() {
      return get(state).won;
    },

    toString() {
      return get(state).game.toString();
    },
  };
}
