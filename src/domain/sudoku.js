function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function isInteger(value) {
  return Number.isInteger(value);
}

function assertCoordinate(name, value) {
  if (!isInteger(value) || value < 0 || value > 8) {
    throw new Error(`Sudoku ${name} must be an integer between 0 and 8`);
  }
}

function assertCellValue(value) {
  if (!isInteger(value) || value < 0 || value > 9) {
    throw new Error('Sudoku cell values must be integers between 0 and 9');
  }
}

function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== 9) {
    throw new Error('Sudoku grid must contain 9 rows');
  }

  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== 9) {
      throw new Error('Sudoku grid must contain 9 columns');
    }

    for (const cell of row) {
      assertCellValue(cell);
    }
  }
}

function buildConflictKeys(grid) {
  const invalidKeys = new Set();

  const markDuplicates = (entries) => {
    const seenByValue = new Map();

    for (const entry of entries) {
      if (entry.value === 0) continue;

      const existing = seenByValue.get(entry.value);
      if (existing) {
        invalidKeys.add(existing.key);
        invalidKeys.add(entry.key);
      } else {
        seenByValue.set(entry.value, entry);
      }
    }
  };

  for (let row = 0; row < 9; row += 1) {
    markDuplicates(
      grid[row].map((value, col) => ({
        key: `${col},${row}`,
        value,
      })),
    );
  }

  for (let col = 0; col < 9; col += 1) {
    markDuplicates(
      grid.map((row, rowIndex) => ({
        key: `${col},${rowIndex}`,
        value: row[col],
      })),
    );
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const entries = [];

      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          entries.push({
            key: `${col},${row}`,
            value: grid[row][col],
          });
        }
      }

      markDuplicates(entries);
    }
  }

  return [...invalidKeys];
}

export function createSudoku(grid) {
  validateGrid(grid);

  let currentGrid = cloneGrid(grid);

  return {
    getGrid() {
      return cloneGrid(currentGrid);
    },

    getCell(row, col) {
      assertCoordinate('row', row);
      assertCoordinate('col', col);
      return currentGrid[row][col];
    },

    guess({ row, col, value }) {
      assertCoordinate('row', row);
      assertCoordinate('col', col);
      assertCellValue(value);

      currentGrid[row][col] = value;
      return this;
    },

    getInvalidCells() {
      return buildConflictKeys(currentGrid);
    },

    isSolved() {
      return currentGrid.every((row) => row.every((cell) => cell !== 0))
        && this.getInvalidCells().length === 0;
    },

    clone() {
      return createSudoku(currentGrid);
    },

    toJSON() {
      return {
        type: 'Sudoku',
        grid: cloneGrid(currentGrid),
      };
    },

    toString() {
      return currentGrid
        .map((row) => row.join(' '))
        .join('\n');
    },
  };
}

export function createSudokuFromJSON(json) {
  if (!json || !json.grid) {
    throw new Error('Invalid Sudoku JSON');
  }

  return createSudoku(json.grid);
}
