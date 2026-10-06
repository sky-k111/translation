/**
 * 页面管理模块
 * 处理页面切换和显示逻辑
 */

// 当前显示的页面状态
let currentPage = 'home';

/**
 * 显示指定的页面
 * 处理页面切换逻辑和相应的数据加载
 *
 * @param {string} pageName - 要显示的页面名称 ('home', 'settings', 'learning', 'dashboard' 或具体的过滤器类型)
 */
function showPage(pageName) {
  // 获取所有页面元素
  const homePage = document.getElementById('homePage');
  const wordListPage = document.getElementById('wordListPage');
  const settingsPage = document.getElementById('settingsPage');
  const learningPage = document.getElementById('learningPage');
  const modeSelectionPage = document.getElementById('modeSelectionPage');
  
  // 获取学习相关界面元素
  const learningSummary = document.getElementById('learningSummary');
  const learningArea = document.getElementById('learningArea');

  // 移除所有页面的 active 类
  homePage.classList.remove('active');
  wordListPage.classList.remove('active');
  settingsPage.classList.remove('active');
  learningPage.classList.remove('active');
  if (modeSelectionPage) modeSelectionPage.classList.remove('active');

  // 隐藏学习相关元素，默认状态下不显示学习内容
  if (learningSummary) learningSummary.style.display = 'none';
  if (learningArea) learningArea.style.display = 'none';

  // 停止粒子特效（如果之前在运行）
  if (window.particleNetwork) {
    window.particleNetwork.stop();
  }

  // 根据 pageName 显示对应的页面
  switch (pageName) {
    case 'home':
      // 显示首页
      homePage.classList.add('active');
      currentPage = 'home';
      window.currentPage = currentPage; // 同步更新全局变量
      if (typeof window.loadHomePage === 'function') {
        window.loadHomePage();
      }
      break;
    case 'modeSelection':
      // 显示模式选择页面
      if (modeSelectionPage) modeSelectionPage.classList.add('active');
      currentPage = 'modeSelection';
      window.currentPage = currentPage; // 同步更新全局变量
      // 启动粒子特效
      if (window.particleNetwork) {
        window.particleNetwork.start();
      }
      break;
    case 'settings':
      // 显示设置页面
      settingsPage.classList.add('active');
      currentPage = 'settings';
      window.currentPage = currentPage; // 同步更新全局变量
      if (typeof window.loadSettings === 'function') {
        window.loadSettings();
      }
      break;
    case 'learning':
      // 显示学习页面
      learningPage.classList.add('active');
      currentPage = 'learning';
      window.currentPage = currentPage; // 同步更新全局变量
      // 学习页面需要显示学习区域
      if (learningArea) learningArea.style.display = 'block';
      // 学习页面由 learningManager 管理，不需要额外加载
      break;
    case 'dashboard':
      // 跳转到dashboard页面
      currentPage = 'dashboard';
      window.currentPage = currentPage; // 同步更新全局变量
      window.location.href = 'dashboard.html';
      break;
    default:
      // 显示单词列表页面
      wordListPage.classList.add('active');
      currentPage = 'wordList';
      window.currentPage = currentPage; // 同步更新全局变量
      window.currentFilter = pageName;
      if (typeof window.loadWordListPage === 'function') {
        window.loadWordListPage(pageName);
      }
      break;
  }
}

/**
 * 获取当前页面
 * @returns {string} 当前页面名称
 */
function getCurrentPage() {
  return currentPage;
}

/**
 * 切换Dashboard内容区域
 * @param {string} sectionId - 要显示的section ID
 */
function switchDashboardSection(sectionId) {
  // 获取所有section元素
  const sections = document.querySelectorAll('.content-section');
  const navItems = document.querySelectorAll('.nav-item');
  
  // 移除所有section的active类
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  // 移除所有nav-item的active类
  navItems.forEach(item => {
    item.classList.remove('active');
  });
  
  // 显示指定的section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // 激活对应的导航项
  const targetNavItem = document.querySelector(`.nav-link[href="#${sectionId}"]`);
  if (targetNavItem) {
    targetNavItem.closest('.nav-item').classList.add('active');
  }
}

/**
 * 切换侧边栏显示状态
 */
function toggleSidebar() {
  const sidebar = document.getElementById('dashboard-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

/**
 * 返回首页
 * 在dashboard.html中跳转到popup.html，在popup.html中切换到home页面
 */
function goHome() {
  // 检查当前页面是否是dashboard页面
  const isDashboard = window.location.pathname.includes('dashboard.html');
  if (isDashboard) {
    // 如果是dashboard页面，直接跳转到popup.html
    window.location.href = 'popup.html';
  } else {
    // 如果是popup页面，切换到home页面
    showPage('home');
  }
}

// 兼容传统脚本加载（popup.html 使用）
if (typeof window !== 'undefined') {
  window.currentPage = currentPage;
  window.showPage = showPage;
  window.getCurrentPage = getCurrentPage;
  window.switchDashboardSection = switchDashboardSection;
  window.toggleSidebar = toggleSidebar;
  window.goHome = goHome;
}
