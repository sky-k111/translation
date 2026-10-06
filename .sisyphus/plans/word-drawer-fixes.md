# Word Drawer V2 修复计划

## TL;DR

> **快速摘要**: 修复单词抽屉组件的4个缺陷：移除重复CSS规则、清理生产环境console.log、优化触摸事件性能、添加骨架屏加载状态
>
> **交付物**:
> - 修复后的 `word-drawer-v2.css`（删除重复CSS）
> - 修复后的 `word-drawer-v2.js`（移除console.log、优化触摸事件、添加loading）
>
> **估计工作量**: Short (~2-3小时)
> **并行执行**: YES - 4个独立任务可并行
> **关键路径**: 无依赖，可任意顺序执行

---

## Context

### Original Request
用户提供了4个明确的缺陷修复需求：
1. CSS代码重复（第407-414行和第426-441行）
2. 生产环境console.log过多（15+处）
3. 触摸事件`passive: false`阻塞滚动
4. `show()`方法缺少loading状态

### Research Findings
- **CSS重复确认**: 第407-414行和426-441行的`.drawer-word-title-row`和`.drawer-title-left`完全重复
- **Console.log位置**: 已定位到第299、334、458、504、833、877、900、934、1002行等
- **现有Skeleton模式**: FeedbackManager已实现骨架屏加载，可复用其CSS动画模式
- **触摸事件模式**: 当前handleTouchMove已有方向判断逻辑，只需优化passive设置

---

## Work Objectives

### Core Objective
修复单词抽屉组件的4个生产环境问题，提升代码质量、性能和用户体验。

### Concrete Deliverables
- `extension/components/complex/word-drawer-v2.css` - 删除重复的CSS规则
- `extension/components/complex/word-drawer-v2.js` - 移除所有console.log，优化触摸事件处理，添加skeleton loading

### Definition of Done
- [ ] CSS重复规则已删除，样式正常
- [ ] 所有生产环境console.log已移除
- [ ] 触摸事件优化后，水平滑动可触发翻页，垂直滑动可正常滚动
- [ ] show()方法在获取detailedInfo时显示skeleton loading
- [ ] 所有修改后功能正常运行，无回归问题

### Must Have
- 保留CSS的原有样式（使用较新的margin-bottom:8px和gap:8px版本）
- 使用Comment out方式移除console.log（便于未来调试时恢复）
- 触摸阈值设为10px（与现有逻辑一致）
- Skeleton loading样式与现有设计系统一致

### Must NOT Have (Guardrails)
- 不得修改业务逻辑（只改调试代码和性能优化）
- 不得删除或修改现有的touch event handler函数
- 不得修改CSS选择器以外的任何CSS属性
- 不得添加新的依赖库

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO（无测试基础设施）
- **User wants tests**: NO（未明确要求）
- **QA approach**: Manual verification（手动验证）

### Manual Verification Procedures

**CSS重复修复验证**:
```bash
# 验证CSS文件无重复规则
grep -n "\.drawer-word-title-row" extension/components/complex/word-drawer-v2.css | wc -l
# Expected: 输出应为2（选择器定义和注释），而非4
```

**Console.log清理验证**:
```bash
# 验证无console.log残留（除注释掉的）
grep -n "console\.log" extension/components/complex/word-drawer-v2.js | grep -v "//"
# Expected: 无输出（无未注释的console.log）
```

**触摸事件优化验证** (使用dev-browser技能):
```
1. 在Chrome扩展中打开单词抽屉
2. 在抽屉内容区域垂直滑动 → 应正常滚动内容
3. 水平滑动超过10px → 应触发单词翻页动画
4. 检查Chrome DevTools Performance面板 → 无滚动阻塞警告
```

**Skeleton Loading验证** (使用dev-browser技能):
```
1. 清除浏览器缓存的单词数据
2. 点击一个之前未查看详情的单词
3. 观察抽屉打开过程 → 应先显示skeleton动画（shimmer效果）
4. 等待数据加载完成 → skeleton应被实际内容替换
5. 检查DOM → 应看到.skeleton-loading类元素
```

---

## Execution Strategy

### Parallel Execution Waves

所有4个任务相互独立，可完全并行执行：

```
Wave 1 (Start Immediately - All Parallel):
├── Task 1: 修复CSS重复规则
├── Task 2: 移除console.log
├── Task 3: 优化触摸事件
└── Task 4: 添加skeleton loading

No Wave 2 needed - all tasks are independent

Parallel Speedup: ~75% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (CSS重复) | None | None | 2, 3, 4 |
| 2 (Console.log) | None | None | 1, 3, 4 |
| 3 (触摸事件) | None | None | 1, 2, 4 |
| 4 (Skeleton) | None | None | 1, 2, 3 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3, 4 | All `visual-engineering` with `frontend-ui-ux` skill |

---

## TODOs

### Task 1: 修复CSS重复规则

**What to do**:
1. 打开 `extension/components/complex/word-drawer-v2.css`
2. 定位第407-414行和第426-441行
3. 删除第一组（407-415行），保留第二组（426-442行）
4. 保留注释 `/* 标题行 */` 和 `/* 旧样式已删除，使用新的紧凑布局样式 */`

**Must NOT do**:
- 不得修改CSS属性值
- 不得移动其他CSS规则的位置
- 不得删除与重复无关的代码

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: CSS样式修改任务
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: CSS优化和清理

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
- **Blocks**: None
- **Blocked By**: None

**References**:
- `extension/components/complex/word-drawer-v2.css:407-441` - 重复CSS规则位置
- `extension/components/complex/word-drawer-v2.css:408-414` - 要删除的第一组
- `extension/components/complex/word-drawer-v2.css:426-441` - 要保留的第二组

**Acceptance Criteria**:
- [ ] 第407-415行已删除（第一组CSS规则）
- [ ] 第426-442行保留（第二组CSS规则，较新的margin-bottom:8px和gap:8px）
- [ ] `.drawer-word-title-row` 选择器只剩2处（保留的1处+可能的注释）
- [ ] 单词抽屉UI样式显示正常

**Verification**:
```bash
# 验证重复已移除
grep -n "\.drawer-word-title-row" extension/components/complex/word-drawer-v2.css
# Expected: 只显示1处选择器定义

# 验证CSS文件语法正确
cat extension/components/complex/word-drawer-v2.css | head -450 | tail -60
# Expected: 无语法错误，第407行开始是注释
```

**Commit**: YES
- Message: `refactor(word-drawer): remove duplicate CSS rules`
- Files: `extension/components/complex/word-drawer-v2.css`

---

### Task 2: 移除生产环境console.log

**What to do**:
1. 打开 `extension/components/complex/word-drawer-v2.js`
2. 找到并注释掉所有console.log语句（使用 `//` 而不是删除）
3. 目标console.log位置（已确认）：
   - 第299行: `console.log('prepareWordData 输入:', item);`
   - 第318行: `console.log('prepareWordData 输出:', prepared);`
   - 第371行: `console.log('从存储中获取到有效 detailedInfo:', wordData.detailedInfo);`
   - 第374行: `console.log('detailedInfo 无效或为空，重新获取...', wordData.detailedInfo);`
   - 第458行: `console.log('renderContent 接收到的数据:', {...});`
   - 第504行: `console.log('解析后的数据:', { phonetic, definitions, examples });`
   - 第833行: `console.log('getDefinitions 输入数据:', {...});`
   - 第844行: `console.log('使用 detailedInfo.definitions:', data.detailedInfo.definitions);`
   - 第876行: `console.log('使用 basic.explains:', data.detailedInfo.basic.explains);`
   - 第916行: `console.log('使用 web 释义:', data.detailedInfo.web);`
   - 第992行: `console.log('getDefinitions 输出:', uniqueDefinitions);`
   - 第1002行: `console.log('getExamples 输入:', {...});`

**Must NOT do**:
- 不得使用 `console.error`, `console.warn`, `console.info` 替换
- 不得删除console.log行，只能注释
- 不得修改任何业务逻辑代码

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 简单的搜索替换任务
- **Skills**: [`git-master`]
  - `git-master`: 用于提交时的原子性验证

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
- **Blocks**: None
- **Blocked By**: None

**References**:
- `extension/components/complex/word-drawer-v2.js:299` - prepareWordData输入log
- `extension/components/complex/word-drawer-v2.js:334` - 实际行号371，从存储获取detailedInfo log
- `extension/components/complex/word-drawer-v2.js:458` - renderContent接收数据log
- `extension/components/complex/word-drawer-v2.js:504` - 解析后数据log
- `extension/components/complex/word-drawer-v2.js:833` - getDefinitions输入log
- `extension/components/complex/word-drawer-v2.js:877` - basic.explains log
- `extension/components/complex/word-drawer-v2.js:934` - 实际行号992，getDefinitions输出log
- `extension/components/complex/word-drawer-v2.js:1002` - getExamples输入log

**Acceptance Criteria**:
- [ ] 所有console.log行已添加 `//` 注释前缀
- [ ] 执行 `grep -n "console\.log" file.js | grep -v "//"` 返回空
- [ ] 扩展功能正常运行，无console输出

**Verification**:
```bash
# 验证所有console.log已注释
grep -n "console\.log" extension/components/complex/word-drawer-v2.js | grep -v "//"
# Expected: 无输出

# 统计注释掉的console.log数量
grep -c "//.*console\.log" extension/components/complex/word-drawer-v2.js
# Expected: 12+（所有console.log都已注释）
```

**Commit**: YES
- Message: `chore(word-drawer): comment out debug console.log statements`
- Files: `extension/components/complex/word-drawer-v2.js`

---

### Task 3: 优化触摸事件性能

**What to do**:
1. 打开 `extension/components/complex/word-drawer-v2.js`
2. 定位第167-169行的事件监听器绑定
3. 修改 `touchmove` 的 passive 选项为动态设置
4. 在 `handleTouchStart` 中初始化滚动方向检测
5. 在 `handleTouchMove` 中根据滚动方向决定是否阻止默认行为

**具体修改方案**:

**修改第168行**:
```javascript
// 旧代码:
this.elements.content.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

// 新代码:
this.elements.content.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
// 注：将阻止默认行为移到handler内部条件判断
```

**修改 handleTouchMove 方法**（第196-207行）:
```javascript
handleTouchMove(e) {
  if (!this.touchStartX) return;
  
  const diffX = e.touches[0].clientX - this.touchStartX;
  const diffY = e.touches[0].clientY - this.touchStartY;
  
  // 判断是否为水平滑动（滑动阈值10px）
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
    this.isSwiping = true;
    // 只有在确定是水平滑动时才阻止默认行为
    e.preventDefault();
  }
  // 如果是垂直滑动，不调用e.preventDefault()，允许正常滚动
}
```

**Must NOT do**:
- 不得修改 `handleTouchStart` 或 `handleTouchEnd` 的函数签名
- 不得修改滑动阈值（保持10px）
- 不得修改滑动导航逻辑（navigateToPrev/Next）

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: 触摸交互优化
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: 移动端触摸事件最佳实践

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
- **Blocks**: None
- **Blocked By**: None

**References**:
- `extension/components/complex/word-drawer-v2.js:167-169` - 事件监听器绑定
- `extension/components/complex/word-drawer-v2.js:196-207` - handleTouchMove方法
- `extension/popup/modules/word-list-manager.js:376` - 现有的passive事件使用示例
- Google Developers: "Passive Event Listeners" - https://developers.google.com/web/updates/2016/06/passive-event-listeners

**Acceptance Criteria**:
- [ ] `touchmove` 监听器改为 `{ passive: true }`
- [ ] `handleTouchMove` 中仅在水平滑动时调用 `e.preventDefault()`
- [ ] 垂直滑动时内容区域可正常滚动
- [ ] 水平滑动超过10px时触发单词切换

**Verification** (使用dev-browser技能):
```
# 在Chrome扩展中测试:
1. 打开单词抽屉，查看一个长内容单词
2. 垂直滑动 → 内容应平滑滚动
3. 水平滑动（从左到右）→ 应切换到上一个单词
4. 水平滑动（从右到左）→ 应切换到下一个单词
5. 打开Chrome DevTools → Performance → 确认无"touchmove handler"警告
```

**Commit**: YES
- Message: `perf(word-drawer): optimize touch events with passive listeners`
- Files: `extension/components/complex/word-drawer-v2.js`

---

### Task 4: 添加Skeleton Loading状态

**What to do**:
1. 在 `word-drawer-v2.css` 中添加skeleton loading样式
2. 修改 `show()` 方法，在获取detailedInfo时显示skeleton
3. 在数据加载完成后隐藏skeleton并显示内容

**Step 1: 添加CSS样式**（添加到word-drawer-v2.css末尾）:
```css
/* Skeleton Loading Styles */
.drawer-skeleton-container {
  padding: 20px;
}

.drawer-skeleton-line {
  height: 20px;
  margin-bottom: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, 
    rgba(212, 165, 116, 0.1) 25%, 
    rgba(212, 165, 116, 0.2) 50%, 
    rgba(212, 165, 116, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: drawer-skeleton-shimmer 1.5s ease-in-out infinite;
}

.drawer-skeleton-line:last-child {
  margin-bottom: 0;
  width: 60%;
}

.drawer-skeleton-title {
  height: 32px;
  width: 40%;
  margin-bottom: 20px;
}

.drawer-skeleton-phonetic {
  height: 16px;
  width: 30%;
  margin-bottom: 20px;
}

@keyframes drawer-skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**Step 2: 添加showSkeleton方法**（在word-drawer-v2.js中添加新方法）:
```javascript
/**
 * 显示骨架屏loading
 */
showSkeleton() {
  const skeletonHTML = `
    <div class="drawer-skeleton-container">
      <div class="drawer-skeleton-line drawer-skeleton-title"></div>
      <div class="drawer-skeleton-line drawer-skeleton-phonetic"></div>
      <div class="drawer-skeleton-line"></div>
      <div class="drawer-skeleton-line"></div>
      <div class="drawer-skeleton-line"></div>
      <div class="drawer-skeleton-line"></div>
    </div>
  `;
  this.elements.content.innerHTML = skeletonHTML;
}
```

**Step 3: 修改show()方法**（在第342行的show方法中）:
```javascript
async show(wordData, index = -1) {
  if (!wordData || this.isAnimating) return;

  this.isAnimating = true;
  
  // 先显示skeleton loading
  this.showSkeleton();
  this.openDrawer();
  
  // ... 原有的detailedInfo检查逻辑 ...
  
  // 如果没有有效的detailedInfo，显示skeleton并获取数据
  if (!hasValidDetailedInfo(wordData.detailedInfo)) {
    try {
      // skeleton已经在上面显示
      const key = (wordData.key || wordData.word || wordData.text || '').toLowerCase();
      // ... 获取数据逻辑 ...
    } catch (error) {
      // 显示错误状态而非无限loading
      this.elements.content.innerHTML = `
        <div class="drawer-error-state">
          <p>加载失败，请重试</p>
          <button onclick="location.reload()">刷新</button>
        </div>
      `;
    }
  }
  
  // 数据准备好后渲染内容（这会替换skeleton）
  this.currentWord = this.prepareWordData(wordData);
  this.renderContent(this.currentWord);
  // ... 其余逻辑 ...
}
```

**Must NOT do**:
- 不得修改FeedbackManager（应独立实现）
- 不得在加载完成后仍保留skeleton元素
- 不得在无网络/错误情况下无限显示skeleton

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: UI动画和loading状态
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Skeleton loading设计模式

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
- **Blocks**: None
- **Blocked By**: None

**References**:
- `extension/components/utils/feedback-manager.js` - 现有的skeleton实现参考
- `extension/components/complex/word-drawer-v2.js:342` - show()方法位置
- `extension/components/complex/word-drawer-v2.css` - 添加skeleton样式位置

**Acceptance Criteria**:
- [ ] CSS中添加skeleton相关样式（4个class + 1个animation）
- [ ] JS中添加showSkeleton()方法
- [ ] show()方法在获取数据前调用showSkeleton()
- [ ] 数据加载完成后自动替换skeleton为实际内容
- [ ] Skeleton具有shimmer动画效果（与design system一致）

**Verification** (使用dev-browser技能):
```
# 测试场景1: 正常加载
1. 打开扩展，点击一个单词
2. 观察抽屉打开过程 → 应看到shimmer动画（金色渐变闪烁）
3. 等待 ~1-2秒 → shimmer应被实际单词内容替换

# 测试场景2: 已缓存数据
1. 重新打开同一单词
2. 由于detailedInfo已缓存，应直接显示内容（无skeleton）

# 测试场景3: 检查DOM
1. 打开Chrome DevTools
2. 触发单词详情加载
3. 在Elements面板中检查 → 应看到.drawer-skeleton-container临时存在
4. 加载完成后 → 该元素应被移除
```

**Commit**: YES
- Message: `feat(word-drawer): add skeleton loading for async data fetch`
- Files: `extension/components/complex/word-drawer-v2.css`, `extension/components/complex/word-drawer-v2.js`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 (CSS重复) | `refactor(word-drawer): remove duplicate CSS rules` | word-drawer-v2.css | grep验证 |
| 2 (Console.log) | `chore(word-drawer): comment out debug console.log` | word-drawer-v2.js | grep验证 |
| 3 (触摸事件) | `perf(word-drawer): optimize touch events` | word-drawer-v2.js | DevTools测试 |
| 4 (Skeleton) | `feat(word-drawer): add skeleton loading` | word-drawer-v2.css, word-drawer-v2.js | 视觉验证 |

---

## Success Criteria

### Verification Commands
```bash
# 1. CSS重复检查
grep -n "\.drawer-word-title-row" extension/components/complex/word-drawer-v2.css | wc -l
# Expected: 2

# 2. Console.log检查  
grep -n "console\.log" extension/components/complex/word-drawer-v2.js | grep -v "//"
# Expected: 0 lines

# 3. Skeleton样式检查
grep -n "drawer-skeleton" extension/components/complex/word-drawer-v2.css | wc -l
# Expected: 10+ lines

# 4. Skeleton方法检查
grep -n "showSkeleton" extension/components/complex/word-drawer-v2.js | wc -l
# Expected: 2+ lines
```

### Final Checklist
- [x] 所有 "Must Have" 已完成
- [x] 所有 "Must NOT Have" 未触发
- [x] CSS无重复规则
- [x] 无生产环境console.log
- [x] 触摸事件优化后滚动流畅
- [x] Skeleton loading正常工作
