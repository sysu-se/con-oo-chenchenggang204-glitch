# con-oo-chenchenggang204-glitch - Review

## Review 结论

当前实现已经把 Sudoku/Game 接入到了真实的 Svelte 游戏流程里，明显优于“领域对象只存在于测试中”的方案；但从设计质量看，核心聚合与适配层都还没有完全收口：Game 内部存在双重真相源，store adapter 也泄露了可变领域对象，导致业务不变量和响应式边界都还依赖调用约定而不是设计本身来保证。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | good |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. Game 维护了两个未校验的一致性来源

- 严重程度：core
- 位置：src/domain/game.js:38-46,61-79,153-163
- 原因：当前局面来自 currentSudoku，固定格和题面来自 puzzleGrid；构造时只是分别克隆它们，没有验证两者是否描述同一盘题。createGameFromJSON(...) 也直接信任外部 JSON，因此一旦两者不一致，isFixedCell()、题面渲染、胜利判断和 undo/redo 就会基于不同真相源工作。

### 2. Store adapter 暴露了可变的领域对象，响应式边界不封闭

- 严重程度：core
- 位置：src/game-store.js:28-37,43,67-75; src/node_modules/@sudoku/stores/grid.js:6-44
- 原因：适配层一边负责 snapshot 和 UI 通知，一边又把 live game 实例通过 gameStore/currentGame 暴露出去。只要调用方直接对这个对象执行方法，就会绕过 mutateGame(...)；这样 UI 刷新是否正确不再由 adapter 保证，而是靠调用方自觉遵守约定。

### 3. 导入存档绕过了统一游戏流程

- 严重程度：major
- 位置：src/components/Controls/ActionBar/Actions.svelte:34-46; src/node_modules/@sudoku/game.js:31-36
- 原因：Actions.svelte 直接调用 gameSession.load(json)，没有复用已经存在的 loadSavedGame(...)。结果导入后不会统一复位 cursor、timer、hints、difficulty 等 UI 状态；同一个业务动作存在两条代码路径，说明接入层还没有形成单一入口。

### 4. UI 层同时依赖多个抽象层，命令入口分裂

- 严重程度：major
- 位置：src/components/Controls/Keyboard.svelte:2-5,18-32,40-49; src/components/Controls/ActionBar/Actions.svelte:10-12,52-58; src/node_modules/@sudoku/stores/grid.js:46-105; src/node_modules/@sudoku/game.js:55-69
- 原因：有的组件直接调用 gameSession，有的走 @sudoku/stores/grid，有的走 @sudoku/game。这样 View 层既知道 adapter，又知道更底层 session，对撤销、重做、导入等命令的归属缺乏统一标准，增加了耦合，也让后续维护时更难证明哪一层才是真正的 UI 边界。

### 5. GameStore API 过宽，状态暴露方式重叠

- 严重程度：minor
- 位置：src/game-store.js:67-127
- 原因：同一份状态同时以 subscribe、多个 derived store、命令方法、getter、toString() 等多种接口暴露，消费者很容易各取一套，进一步放大接入层分叉。对于 Svelte 适配层，更好的方向是收敛成少量稳定、面向 UI 的读写面。

## 优点

### 1. Sudoku 对格盘状态做了基础封装和防御性拷贝

- 位置：src/domain/sudoku.js:21-35,99-145
- 原因：构造时校验 9x9 结构与取值范围，getGrid()/toJSON() 返回克隆数据，冲突检测和 isSolved() 留在领域对象内部，避免 UI 直接改内部二维数组。

### 2. 固定格规则与历史操作集中在 Game

- 位置：src/domain/game.js:73-130
- 原因：isFixedCell()、guess()、undo()、redo() 都围绕当前 Sudoku 组织，UI 不需要自己维护历史栈，也不需要自己判断哪些格子可编辑。

### 3. 存在明确的 Svelte 适配层方向

- 位置：src/game-store.js:40-95
- 原因：createGameStore() 把 Game 转成 currentGrid、invalidCells、won、canUndo、canRedo 等可订阅状态，并提供 start/load/guess/undo/redo，整体方向符合作业推荐的 store adapter。

### 4. 真实界面已经开始消费领域对象结果

- 位置：src/node_modules/@sudoku/stores/grid.js:46-105; src/components/Board/index.svelte:40-51; src/components/Controls/Keyboard.svelte:18-32
- 原因：棋盘渲染读取的是 gameSession 导出的 initialGrid/currentGrid/invalidCells，键盘输入与提示最终也会落到 gameSession.guess(...)，不是把 Sudoku/Game 只留在测试里。

## 补充说明

- 本结论仅基于静态阅读 src/domain/*、src/game-store.js、src/game-session.js、src/node_modules/@sudoku/stores/grid.js、src/node_modules/@sudoku/stores/game.js、src/node_modules/@sudoku/game.js 及相关 Svelte 组件得出，未运行测试，也未实际打开浏览器交互。
- 关于导入流程、撤销重做联动、界面刷新边界等判断，来自代码路径分析而非运行时验证。
- 按你的要求，审查范围没有扩展到无关目录；src/node_modules/@sudoku 下只纳入了与 domain 接入直接相关的包装层代码。
