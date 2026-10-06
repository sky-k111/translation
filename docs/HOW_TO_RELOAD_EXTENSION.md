# 如何重新加载扩展

**问题**: 重构后扩展无法加载，提示 `ERR_FILE_NOT_FOUND`  
**原因**: Chrome 扩展管理器还记得旧的路径  
**解决**: 重新加载扩展的根目录

---

## 🔧 解决步骤

### 方法 1：移除并重新添加扩展（推荐）⭐

#### 步骤 1：打开扩展管理页面
在 Chrome 浏览器中输入：
```
chrome://extensions/
```

#### 步骤 2：启用开发者模式
确保右上角的"开发者模式"开关是打开的。

#### 步骤 3：移除旧扩展
找到"单词翻译助手"扩展，点击"移除"按钮。

#### 步骤 4：加载新扩展
1. 点击左上角的"加载已解压的扩展程序"按钮
2. 选择项目根目录：
   ```
   /Users/justin/Downloads/TIMS-project-main
   ```
3. 点击"选择"按钮

#### 步骤 5：验证
- ✅ 扩展图标应该显示在工具栏
- ✅ 点击图标应该打开弹窗
- ✅ 没有错误提示

---

### 方法 2：刷新扩展（如果方法1不行）

#### 步骤 1：打开扩展管理页面
```
chrome://extensions/
```

#### 步骤 2：找到扩展
找到"单词翻译助手"扩展。

#### 步骤 3：点击刷新按钮
点击扩展卡片上的刷新图标（圆形箭头）。

#### 步骤 4：如果仍然报错
如果还是显示 `ERR_FILE_NOT_FOUND`，说明 Chrome 缓存了旧路径，需要使用方法 1。

---

## 📁 正确的目录结构

确保你选择的是包含 `manifest.json` 的根目录：

```
/Users/justin/Downloads/TIMS-project-main/
├── manifest.json           ✅ 必须在这里
├── extension/              ✅ 扩展代码
│   ├── background/
│   ├── content/
│   ├── popup/
│   └── ...
├── assets/                 ✅ 静态资源
│   └── icons/
│       └── icon16.png
├── src/
├── build/
├── docs/
├── config/
├── package.json
└── ...
```

**重要**：不要选择子目录（如 `extension/`），必须选择包含 `manifest.json` 的根目录。

---

## 🔍 常见问题

### Q1: 为什么会出现 ERR_FILE_NOT_FOUND？
**A**: Chrome 扩展管理器缓存了旧的文件路径。重构后文件位置改变了，但 Chrome 还在尝试访问旧路径。

### Q2: 重新加载后扩展图标不显示？
**A**: 检查 `manifest.json` 中的图标路径：
```json
{
  "icons": {
    "16": "assets/icons/icon16.png"
  }
}
```
确保文件存在：
```bash
ls assets/icons/icon16.png
```

### Q3: 弹窗无法打开？
**A**: 检查 `manifest.json` 中的弹窗路径：
```json
{
  "action": {
    "default_popup": "extension/popup/popup.html"
  }
}
```
确保文件存在：
```bash
ls extension/popup/popup.html
```

### Q4: 内容脚本不工作？
**A**: 检查 `manifest.json` 中的内容脚本路径：
```json
{
  "content_scripts": [{
    "js": [
      "extension/utils/module-manager.js",
      "extension/content/content.js"
    ]
  }]
}
```
确保所有文件都存在。

---

## ✅ 验证清单

加载扩展后，检查以下项目：

- [ ] 扩展出现在 `chrome://extensions/` 页面
- [ ] 没有错误提示
- [ ] 扩展图标显示在工具栏
- [ ] 点击图标可以打开弹窗
- [ ] 弹窗界面显示正常
- [ ] 在网页上划词可以翻译
- [ ] 翻译功能正常工作

---

## 🚀 快速验证命令

在项目根目录运行以下命令，验证所有文件都在正确位置：

```bash
# 验证 manifest.json
ls -la manifest.json

# 验证扩展代码
ls extension/background/background.js
ls extension/content/content.js
ls extension/popup/popup.html

# 验证图标
ls assets/icons/icon16.png

# 验证所有 content_scripts 文件
ls extension/utils/module-manager.js
ls extension/utils/cache-manager.js
ls extension/utils/event-manager.js
ls extension/utils/performance-monitor.js
ls extension/utils/service-degradation-manager.js
ls extension/services/netease-translate-service.js
ls extension/services/ai-translate-service.js
ls extension/modules/theme-manager.js
ls extension/content/content.js

# 验证 CSS 文件
ls extension/content/content.css
ls extension/components/complex/word-drawer-v2.css
```

如果所有文件都存在，说明重构成功，只需要重新加载扩展即可。

---

## 📝 总结

**问题**: `ERR_FILE_NOT_FOUND`  
**原因**: Chrome 缓存了旧路径  
**解决**: 移除扩展并重新加载根目录

**关键点**：
1. ✅ 选择包含 `manifest.json` 的根目录
2. ✅ 不要选择子目录
3. ✅ 确保所有文件都在正确位置

---

**文档创建时间**: 2026-01-26  
**创建工程师**: Kiro AI Assistant
