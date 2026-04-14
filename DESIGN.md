# DESIGN

## 1. 本次采用的接入方案

本次作业满足整份 `作业要求.md` 的要求，并且在第六大点中选择了 **方案 A：Store Adapter**。

核心做法是新增 `createGameStore()`：

- 领域层仍然由 `Sudoku` / `Game` 承担
- `createGameStore()` 作为面向 Svelte 的 adapter，内部持有 `Game`
- View 层不直接 mutate 二维数组，也不直接改领域对象内部字段
- View 层消费的是 adapter 暴露出来的响应式状态和命令

对应实现位置：

- 领域对象：[src/domain/sudoku.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/domain/sudoku.js)
- 游戏会话：[src/domain/game.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/domain/game.js)
- Store Adapter：[src/game-store.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/game-store.js)
- 适配器实例：[src/game-session.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/game-session.js)

## 2. `Sudoku` / `Game` 的职责边界

### `Sudoku`

`Sudoku` 表示当前盘面本身，负责和“数独局面”直接相关的事情：

- 持有当前 9x9 grid
- 提供 `guess({ row, col, value })`
- 校验 grid 结构、坐标和值域
- 提供 `getInvalidCells()` 计算行/列/宫冲突
- 提供 `isSolved()` 判断当前局面是否完成
- 提供 `clone()`、`toJSON()`、`toString()`

这里我做了一个有意识的取舍：`Sudoku` 不会因为冲突而拒绝玩家输入，而是允许形成“暂时错误但可见”的局面，再由 `getInvalidCells()` 暴露冲突格。这和现有 UI 的玩法一致，也更适合数独游戏中“输入后高亮错误”的交互。

### `Game`

`Game` 表示“一局游戏”，负责会话级行为：

- 持有当前 `Sudoku`
- 持有 `initialGrid`
- 通过 `initialGrid` 判断 fixed cell，禁止修改题面给定格
- 管理 `undoStack` / `redoStack`
- 提供 `guess()`、`undo()`、`redo()`、`canUndo()`、`canRedo()`
- 提供 `getGrid()`、`getInitialGrid()`、`getInvalidCells()`、`isWon()`
- 提供 `toJSON()` / `createGameFromJSON()`

相比 HW1，这里把“题面 givens 不可改”“胜利判断”“无效历史过滤”“反序列化时必须保留初始题面”这些真正属于游戏会话的规则收回到了 `Game` 中。

## 3. View 层直接消费的是什么

View 层直接消费的是 `gameSession` 这个 store adapter，以及由它导出的包装 store。

主要响应式状态包括：

- `initialGridStore`：题面 givens
- `currentGridStore`：当前玩家局面
- `invalidCellsStore`：冲突格
- `wonStore`：是否获胜
- `canUndoStore`
- `canRedoStore`

为了尽量少改原 starter repo 的组件结构，我保留了 `@sudoku/stores/grid` 和 `@sudoku/stores/game` 这些旧入口，但它们现在已经不再自己管理旧数组逻辑，而只是把 `gameSession` 暴露给原组件：

- [src/node_modules/@sudoku/stores/grid.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/node_modules/@sudoku/stores/grid.js)
- [src/node_modules/@sudoku/stores/game.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/node_modules/@sudoku/stores/game.js)

因此，真实的响应式边界已经从“组件里的旧数组”移动到了 `createGameStore()`。

## 4. 真实游戏流程是如何接入的

### 开始一局游戏

开始游戏的路径现在是：

1. `Welcome.svelte` 或菜单调用 `startNew()` / `startCustom()`
2. [src/node_modules/@sudoku/game.js](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/node_modules/@sudoku/game.js) 生成题面或解码自定义题面
3. 调用 `gameSession.start(...)`
4. `createGameStore()` 内部创建 `createSudoku(...)` 和 `createGame(...)`
5. adapter 生成新的 snapshot，并写入 Svelte store

这满足了“开始一局游戏必须创建 `Game` / `Sudoku`”的要求。

### 界面渲染当前局面

棋盘渲染不再来自组件私有数组，而是来自 adapter：

- [src/components/Board/index.svelte](/C:/Users/陈成钢/Desktop/oo-chenchenggang204-glitch/src/components/Board/index.svelte) 渲染 `$userGrid`
- givens 来自 `$grid`
- 冲突高亮来自 `$invalidCells`

这满足了“UI 中看到的 grid 必须来自领域对象或其导出的响应式视图状态”的要求。

### 用户输入

键盘输入路径现在是：

1. `Keyboard.svelte` 调用 `gameSession.guess(...)`
2. adapter 调用 `Game.guess(...)`
3. `Game` 调用 `Sudoku.guess(...)`
4. adapter 重新计算 `currentGrid / invalidCells / won / canUndo / canRedo`
5. Svelte 通过 store 自动刷新

也就是说，组件事件处理函数里不再保存核心 `guess` 逻辑，它们只负责把动作转发给 adapter。

### Undo / Redo

撤销和重做路径是：

1. `Actions.svelte` 或 `Keyboard.svelte` 调用 `gameSession.undo()` / `redo()`
2. adapter 调用 `Game.undo()` / `redo()`
3. `Game` 回放 move 历史并修改 `Sudoku`
4. adapter 输出新 snapshot
5. UI 自动刷新按钮状态和棋盘

因此 Undo / Redo 的核心逻辑不在 `.svelte` 文件里，而在领域对象中。

## 5. 为什么 Svelte 会刷新

本方案依赖的不是“对象字段内部 mutation 自动可见”，而是：

- `writable` / `derived` store
- 组件中的 `$store`
- 每次领域对象发生变化后，由 adapter 主动生成新的 snapshot 并 `set/update`

`createGameStore()` 内部做的关键事情是：

1. 持有一个真实的 `Game`
2. 在 `guess/undo/redo/load/start` 后重新读取领域对象状态
3. 生成 plain data snapshot：
   `initialGrid`, `currentGrid`, `invalidCells`, `won`, `canUndo`, `canRedo`
4. 把 snapshot 写回 store

所以 UI 刷新的直接原因不是“`Game` 内部字段变了”，而是“adapter 重新发出了一个新的 store 值”。

这正是方案 A 要解决的问题：**让 Svelte 消费 adapter，而不是指望 Svelte 理解闭包对象内部状态变化。**

## 6. 如果直接 mutate 对象，会有什么问题

如果组件直接拿到内部对象或二维数组并原地修改，会有几个问题：

- Svelte 不一定知道该刷新，因为没有发生 store `set/update`
- `$:` reactive statement 也不一定触发，因为它跟踪的是赋值和依赖，不是深层对象字段变化
- 可以绕过 `Game.guess()`，从而绕过 fixed cell 保护、undo/redo 记录和后续会话规则
- 容易出现“数据变了但界面不刷新”或“界面刷新了但历史没记住”的不一致

HW1 里的 `getSudoku()` 会把内部对象直接暴露出去，这次我把它改成返回 clone，就是为了堵住这个封装泄漏。

## 7. 相比 HW1 的改进

这次至少做了下面几项实质性改进：

1. `Sudoku` 不再只是二维数组包装器
   现在会校验坐标和值域，并负责计算冲突格与完成状态。

2. `Game` 真正使用了 `initialGrid`
   题面给定格不能修改，`initialGrid` 不再只是被保存却不参与行为。

3. 修复了封装泄漏
   `Game.getSudoku()` 现在返回 clone，UI 不能绕过 `Game` 直接写内部状态。

4. 历史记录过滤了无效操作
   相同值重复写入不会再制造无意义的 undo 项。

5. 反序列化要求 `initialGrid`
   不再把当前盘面错误地兜底成题面。

6. 真正接入了 Svelte 真实流程
   现在开始游戏、渲染、输入、Undo/Redo 和胜利判断都经过领域对象与 adapter，而不是只在测试里存在。

## 8. Trade-off

这份设计也有明确的 trade-off：

- 为了保证封装与响应式边界清晰，我增加了 snapshot 和 clone，代价是会多一些拷贝开销
- 为了兼容 starter repo 现有组件结构，我保留了 `@sudoku/stores/grid` / `game` 这些旧入口，但它们已经退化成 adapter 的薄包装
- 我没有让 `Sudoku.guess()` 直接拒绝所有冲突输入，而是允许用户先填错再高亮错误；这样更符合现有 UI 玩法，但意味着“合法性判断”是通过 `getInvalidCells()` 暴露，而不是通过 `guess()` 一刀切阻止

## 9. 如果以后迁移到 Svelte 5

最稳定的层会是领域层：

- `Sudoku`
- `Game`

最可能改动的是响应式适配层：

- `createGameStore()`
- 依赖 `$store` 的 UI 包装模块

原因是无论 Svelte 3 还是 Svelte 5，领域对象本身都不依赖具体响应式语法；真正和框架绑定的是 adapter。
