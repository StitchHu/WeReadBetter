// ==UserScript==
// @name         WeRead 自动滚动阅读
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在微信读书网页版侧边栏新增"自动滚动"按钮，点击后页面会以设定速度自动向下滚动，再次点击暂停
// @author       你
// @match        https://weread.qq.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @resource     myImage https://gitee.com/StitchHu/images/raw/master/6891758361297_.pic.jpg
// ==/UserScript==

const url = GM_getResourceURL("myImage");
const url1 = GM_getResourceURL("myImage1");
const url2 = GM_getResourceURL("myImage2");
const url3 = GM_getResourceURL("myImage3");

(function () {
  'use strict';
//==============================
// ============公共类：控制栏按钮创建=================
//==============================
function createButton(btn_class_name, svg_url, btn_tips) {
  const controls = document.querySelector('.readerControls');
  if (!controls || controls.querySelector('.' + btn_class_name)) return null;

  // 创建容器
  const wr_tooltip_container = document.createElement('div');
  wr_tooltip_container.className = 'wr_tooltip_container';
  wr_tooltip_container.setAttribute('style', '--offset: 6px;');

  // 创建按钮
  const btn = document.createElement('button');
  btn.className = btn_class_name + ' readerControls_item';
  btn.innerHTML = svg_url;

  wr_tooltip_container.appendChild(btn);

  // 创建提示框
  const tips = document.createElement('div');
  tips.className = 'wr_tooltip_item wr_tooltip_item--right';
  tips.style.display = 'none';
  tips.textContent = btn_tips;

  wr_tooltip_container.appendChild(tips);

  // 添加事件监听器
  wr_tooltip_container.addEventListener('mouseenter', () => {
    tips.style.display = 'block'; 
  });
  wr_tooltip_container.addEventListener('mouseleave', () => {
    tips.style.display = 'none';
  });

  controls.appendChild(wr_tooltip_container);
  return btn;
}


// 自定义提示系统的CSS样式
GM_addStyle(`
  /* 自定义提示框样式 */
  .custom-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .custom-tooltip.show {
    opacity: 1;
    transform: translateX(0);
  }
  
  /* 提示框箭头 */
  .custom-tooltip::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 6px 6px 6px 0;
    border-color: transparent rgba(0, 0, 0, 0.9) transparent transparent;
  }
  
  /* 深色模式适配 */
  @media (prefers-color-scheme: dark) {
    .custom-tooltip {
      background: rgba(40, 40, 40, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .custom-tooltip::before {
      border-color: transparent rgba(40, 40, 40, 0.95) transparent transparent;
    }
  }
  
  /* 美化版提示框 */
  .custom-tooltip.premium {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(40, 40, 40, 0.9) 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    letter-spacing: 0.3px;
  }
`);

// 创建和管理提示框的类
class CustomTooltip {
  constructor() {
    this.tooltip = null;
    this.showTimeout = null;
    this.hideTimeout = null;
  }
  
  // 创建提示框元素
  createTooltip() {
    if (this.tooltip) return this.tooltip;
    
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'custom-tooltip premium';
    document.body.appendChild(this.tooltip);
    return this.tooltip;
  }
  
  // 显示提示框
  show(element, text, delay = 500) {
    clearTimeout(this.hideTimeout);
    
    this.showTimeout = setTimeout(() => {
      const tooltip = this.createTooltip();
      tooltip.textContent = text;
      
      // 计算位置
      const rect = element.getBoundingClientRect();
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      
      // 基础位置：按钮右侧
      let left = rect.right + 12;
      let top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
      
      // 边界检测和调整
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // 右边界检测
      if (left + tooltipWidth > windowWidth - 10) {
        left = rect.left - tooltipWidth - 12; // 显示在左侧
        tooltip.style.setProperty('--arrow-position', 'right');
      }
      
      // 上下边界检测
      if (top < 10) {
        top = 10;
      } else if (top + tooltipHeight > windowHeight - 10) {
        top = windowHeight - tooltipHeight - 10;
      }
      
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      
      // 显示动画
      requestAnimationFrame(() => {
        tooltip.classList.add('show');
      });
    }, delay);
  }
  
  // 隐藏提示框
  hide(delay = 100) {
    clearTimeout(this.showTimeout);
    
    this.hideTimeout = setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.classList.remove('show');
        setTimeout(() => {
          if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
            this.tooltip = null;
          }
        }, 300);
      }
    }, delay);
  }
}

// 创建全局提示管理器
const tooltipManager = new CustomTooltip();

// 为元素添加自定义提示的函数
function addCustomTooltip(element, text) {
  if (!element) return;
  
  // 移除原有的title属性，避免冲突
  element.removeAttribute('title');
  
  element.addEventListener('mouseenter', () => {
    console.log("mouseenter")
    tooltipManager.show(element, text);
  });
  
  element.addEventListener('mouseleave', () => {
    console.log("mouseleave")
    tooltipManager.hide();
  });
  
  // 当元素被移除时也隐藏提示
  element.addEventListener('DOMNodeRemoved', () => {
    tooltipManager.hide(0);
  });
}

//==============================
// ============新增阅读主题按钮=================
//==============================

  /********************
   * 配置区：每项都包含背景图和对应字体颜色
   ********************/
  const themes = [
    {
      name: '牛皮纸纹理',
      url: url1,
      textColor: '#2D1B15', //字体 深灰色
      backgroundColor: '#2D2419', //背景 深褐色
      readerButtonColor: '#4F4F4F', //按钮 
      fontFamily: 'cejkpx'
    },
    {
      name: '森林绿',
      url: url2,
      textColor: '#222222', // 深灰字
      backgroundColor: '#2D2419', //周围背景 深褐色
      readerButtonColor: '#4F4F4F', //按钮 
      fontFamily: 'cejkpx'
    },
    //纯色背景：无url
    {
      name: '莫兰迪米绿',
      readerBgColor: '#D6DBBC', //纯色背景
      textColor: '#474E31',
      backgroundColor: '#C8D6B8',
      readerButtonColor: '#4E7B50',
      fontFamily: 'wr_default_fontspx'
    },
    {
      name: '复古羊皮纸',
      readerBgColor: '#F5ECD9',
      textColor: '#3A2F24',
      backgroundColor: '#E6D9BC',
      readerButtonColor: '#B48A5A',
      fontFamily: 'wr_default_fontspx'
    },
    {
      name: '暗夜柔灰',
      readerBgColor: '#2E2E2E',
      textColor: '#EAEAEA',
      backgroundColor: '#242424',
      readerButtonColor: '#8AA9FF',
      fontFamily: 'wr_default_fontspx'
    }
  ];


  /********************
   * 阅读主题弹框样式
   ********************/
  GM_addStyle(`
    .bg-select-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 18px;
      border-radius: 50%;
      transition: all 0.3s ease;
      color: #868C96; /* 默认颜色 */

    }
    @media (prefers-color-scheme: dark) {
      .bg-select-btn { background-color: #1C1C1D !important; }
    }
    .bg-select-btn:hover { 
      color: #212832; /* 微信读书的深灰色 */
    }
    
    /* 遮罩层 */
    .bg-overlay {
      position: fixed;
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9998;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.3s ease;
    }
    
    /* 弹窗主体 */
    .bg-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
      padding: 32px;
      z-index: 9999;
      width: 90%;
      max-width: 540px;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideIn 0.3s ease;
    }
    
    @media (prefers-color-scheme: dark) {
      .bg-modal {
        background: #2a2a2a;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      }
    }
    
    /* 弹窗标题 */
    .bg-modal h3 {
      margin: 0 0 28px 0;
      font-size: 22px;
      font-weight: 600;
      text-align: center;
      color: #333;
      letter-spacing: 0.5px;
    }
    
    @media (prefers-color-scheme: dark) {
      .bg-modal h3 {
        color: #fff;
      }
    }
    
    /* 主题网格 */
    .bg-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 20px;
      justify-content: center;
    }
    
    /* 主题项 */
    .bg-item {
      width: 100%;
      height: 100px;
      background-size: cover;
      background-position: center;
      border-radius: 12px;
      cursor: pointer;
      border: 3px solid transparent;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .bg-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0);
      transition: background 0.3s ease;
      border-radius: 9px;
    }
    
    .bg-item:hover {
      border-color: #4caf50;
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
    }
    
    .bg-item:hover::before {
      background: rgba(76, 175, 80, 0.1);
    }
    
    /* 主题名称标签 */
    .bg-item::after {
      content: attr(data-name);
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      color: white;
      padding: 16px 8px 8px;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    
    .bg-item:hover::after {
      opacity: 1;
      transform: translateY(0);
    }
    
    /* 关闭按钮 */
    .bg-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #666;
      transition: all 0.3s ease;
    }
    
    .bg-close:hover {
      background: rgba(255, 0, 0, 0.1);
      color: #ff4444;
      transform: scale(1.1);
    }
    
    @media (prefers-color-scheme: dark) {
      .bg-close {
        background: rgba(255, 255, 255, 0.1);
        color: #ccc;
      }
      .bg-close:hover {
        background: rgba(255, 0, 0, 0.2);
        color: #ff6666;
      }
    }
    
    /* 动画 */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.9); 
      }
      to { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1); 
      }
    }
    

    /* 优化的渐变动画 */
    @keyframes gradientFadeIn {
      from { 
        opacity: 0; 
      }
      50% {
        opacity: 1;
      }
      to { 
        opacity: 0; 
      }
    }

    /* 或者分别定义淡入淡出 */
    @keyframes gradientFadeInOut {
      0% { 
        opacity: 0; 
        transform: scale(0.98);
      }
      30% {
        opacity: 1;
        transform: scale(1);
      }
      70% {
        opacity: 1;
        transform: scale(1);
      }
      100% { 
        opacity: 0; 
        transform: scale(1.02);
      }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes slideOut {
      from { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1); 
      }
      to { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.95); 
      }
    }

    /* 响应式设计 */
    @media (max-width: 640px) {
      .bg-modal {
        padding: 24px;
        width: 95%;
        border-radius: 16px;
      }
      
      .bg-modal h3 {
        font-size: 20px;
        margin-bottom: 20px;
      }
      
      .bg-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 16px;
      }
      
      .bg-item {
        height: 80px;
      }
    }
  `);

  /********************
   * 创建按钮
   ********************/
  function createBackgroundButton() {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-image-icon lucide-book-image"><path d="m20 13.7-2.1-2.1a2 2 0 0 0-2.8 0L9.7 17"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><circle cx="10" cy="8" r="2"/></svg>
      `
    const btn = createButton('bg-select-btn', svg, '切换主题');
    if (btn) {
      btn.addEventListener('click', openModal);
    }
  }

  /********************
   * 弹框逻辑
   ********************/
  function openModal() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.addEventListener('click', closeModal);

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'bg-modal';
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'bg-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', closeModal);
    modal.appendChild(closeBtn);
    
    // 添加标题
    const title = document.createElement('h3');
    title.textContent = '选择阅读主题';
    modal.appendChild(title);

    // 创建主题网格
    const grid = document.createElement('div');
    grid.className = 'bg-grid';

    themes.forEach((theme, index) => {
      const item = document.createElement('div');
      item.className = 'bg-item';
      item.setAttribute('data-name', theme.name);
      if(theme.url){
        item.style.backgroundImage = `url(${theme.url})`;
      }else{
        item.style.backgroundColor = theme.readerBgColor;
      }
      item.addEventListener('click', () => {
        applyTheme(theme);
        closeModal();
        GM_setValue('currentTheme', theme); // 保存主题
        location.reload(); // 刷新页面
      });
      grid.appendChild(item);
    });

    modal.appendChild(grid);
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // 阻止页面滚动
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.querySelector('.bg-modal');
    const overlay = document.querySelector('.bg-overlay');
    
    if (modal && overlay) {
      // 添加关闭动画
      modal.style.animation = 'slideOut 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards';
      overlay.style.animation = 'fadeOut 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards';
      
      // 为关闭过程添加渐变遮罩效果
      const closeOverlay = document.createElement('div');
      closeOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(
          45deg, 
          rgba(76, 175, 80, 0.1) 0%, 
          rgba(0, 0, 0, 0.3) 50%, 
          rgba(33, 150, 243, 0.1) 100%
        );
        z-index: 9997;
        pointer-events: none;
        opacity: 0;
        animation: gradientFadeInOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      `;
      document.body.appendChild(closeOverlay);
      
      // 分阶段移除元素，避免卡顿
      setTimeout(() => {
        modal.remove();
        overlay.remove();
      }, 400);
      
      // 稍晚移除渐变遮罩，确保完全淡出
      setTimeout(() => {
        if (closeOverlay.parentNode) {
          closeOverlay.remove();
        }
        document.body.style.overflow = ''; // 恢复页面滚动
      }, 500);
    }
  }

  // 读取上次选择
  const currentTheme = GM_getValue('currentTheme', null);
  console.log('currentTheme:', currentTheme);
  
  // 如果有保存的主题 → 在页面加载时应用
  if (currentTheme) {
    applyTheme(currentTheme);
  }

  /********************
   * 应用背景 + 字体颜色
   ********************/
  function applyTheme(theme) {
    const content = document.querySelector('.app_content');
    if (content) {
      if (theme.url) {
        // 图片背景
        content.style.backgroundImage = `url(${theme.url})`;
        content.style.backgroundSize = 'auto';
        content.style.backgroundPosition = 'center top';
        content.style.backgroundAttachment = 'fixed';
        content.style.backgroundRepeat = 'repeat';
        content.style.imageRendering = 'crisp-edges'; // 保持图像锐利
        content.style.backgroundColor = ''; // 清空纯色
      } else if (theme.readerBgColor) {
        // 纯色背景
        content.style.backgroundImage = 'none';      // 取消图片
        content.style.backgroundColor = theme.readerBgColor; // 设置纯色
      }
    }
    GM_addStyle(`
      .readerChapterContent {
          color: ${theme.textColor} !important;
          -webkit-text-fill-color: ${theme.textColor} !important;
      }
      .readerContent {
          background-color: ${theme.backgroundColor};
      }
    `);

    // 设置按钮字体颜色
    const footerBtn = document.querySelector('.readerFooter_button');
    if (footerBtn) {
      footerBtn.style.color = theme.readerButtonColor;
    }

    const readerHeaderButton = document.querySelector('.readerHeaderButton');
    if (readerHeaderButton) {
      readerHeaderButton.style.color = theme.readerButtonColor;
    }

    // 切换字体
    // GM_addStyle("*{font-family: TsangerJinKai05 !important;}");
  }


//==============================
// ============新增自动滚动按钮=================
//==============================
  const SCROLL_SPEED = 1;   // 每次滚动的像素距离
  const INTERVAL_MS  = 35;  // 滚动间隔（毫秒），数值越小速度越快，20ms≈50帧/秒

  GM_addStyle(`
    .auto-scroll-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 18px;
      border-radius: 50%;
      transition: background-color 0.2s;
      color: #868C96; /* 默认颜色 */
    }
    .auto-scroll-btn:hover {
      color: #212832; /* 悬浮时深灰色 */
    }
    .auto-scroll-btn.active {
      color: #1D88EE /* 滚动时蓝色 */
    }
  `);

  /********************
   * 自动滚动逻辑
   ********************/
  let scrolling = false;
  let scrollTimer = null;

  function startAutoScroll() {
    if (scrolling) return;
    scrolling = true;
    scrollTimer = setInterval(() => {
      window.scrollBy(0, SCROLL_SPEED);
    }, INTERVAL_MS);
  }

  function stopAutoScroll() {
    scrolling = false;
    if (scrollTimer) {
      clearInterval(scrollTimer);
      scrollTimer = null;
    }
  }

  function toggleScroll(button) {
    if (scrolling) {
      stopAutoScroll();
      button.classList.remove('active');
      button.title = '开始自动滚动';
    } else {
      startAutoScroll();
      button.classList.add('active');
      button.title = '暂停自动滚动';
    }
  }

  /********************
   * 在阅读工具栏插入按钮
   ********************/
  // 创建自动滚动按钮
  function createAutoScrollButton() {
    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v14"/>
    <path d="m19 9-7 7-7-7"/>
    <circle cx="12" cy="21" r="1"/>
  </svg>`;
    
    const btn = createButton('auto-scroll-btn', svg, '自动滚动');
    if (btn) {
      btn.addEventListener('click', () => toggleScroll(btn));
    }
  }

//==============================
// ============新增全屏按钮=================
//==============================

 GM_addStyle(`
    .full-screen-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 18px;
      border-radius: 50%;
      transition: all 0.3s ease;
      color: #868C96; /* 默认颜色 */
    }
    @media (prefers-color-scheme: dark) {
      .full-screen-btn { background-color: #1C1C1D !important; }
    }
    .full-screen-btn:hover { 
      color: #212832; /* 微信读书的深灰色 */    }
 `);

  //==============================
  // 1.切换全屏按钮
  //==============================
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      // 进入全屏
      document.documentElement.requestFullscreen?.();
    } else {
      // 退出全屏
      document.exitFullscreen?.();
    }
  }

// 使用修复后的函数创建全屏按钮
function createFullscreenButton() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fullscreen-icon lucide-fullscreen"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="8" x="7" y="8" rx="1"/>
        </svg>`;
  const btn = createButton('full-screen-btn', svg, '沉浸式');
  if (btn) {
    btn.addEventListener('click', toggleFullscreen);
  }
}

// ==============================
// 功能：双向渐变的顶部栏滚动隐藏/显示
// ==============================
function setupTopBarAutoHide() {
  const topBar = document.querySelector('.readerTopBar');
  const controls = document.querySelector('.readerControls');

  if (!topBar) return;
  if (!controls) return;

  let lastScrollY = window.scrollY;
  let baseScrollY = window.scrollY; // 基准滚动位置
  let currentState = 'visible'; // 'visible', 'hiding', 'hidden', 'showing'
  let ticking = false;
  
  const HIDE_THRESHOLD = 30;   // 向下滚动开始隐藏的距离
  const HIDE_DISTANCE = 50;    // 完全隐藏需要的滚动距离
  const SHOW_THRESHOLD = 30;    // 向上滚动开始显示的距离
  const SHOW_DISTANCE = 50;    // 完全显示需要的滚动距离

  // 设置过渡属性:可调节动画效果
  controls.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  topBar.style.transition = 'transform 0.3s ease';
  controls.style.willChange = 'opacity, transform';

  function onScroll() {
    const currentY = window.scrollY;
    const scrollDelta = currentY - lastScrollY;
    const relativeScroll = currentY - baseScrollY;
    
    // 向下滚动逻辑
    if (scrollDelta > 0) {
      // 如果当前是显示状态或正在显示，切换到隐藏模式
      if (currentState === 'visible' || currentState === 'showing') {
        baseScrollY = currentY;
        currentState = 'hiding';
      }
      
      // 计算隐藏进度
      if (currentState === 'hiding' || currentState === 'hidden') {
        const hideScroll = currentY - baseScrollY;
        
        if (hideScroll > HIDE_THRESHOLD) {
          const hideProgress = Math.min((hideScroll - HIDE_THRESHOLD) / HIDE_DISTANCE, 1);
          
          // 应用隐藏变换
          topBar.style.transform = `translateY(${-100 * hideProgress}%)`;
          // 隐藏进度时
          controls.style.opacity = 1 - hideProgress;
          controls.style.transform = 'none';   // 不再水平移动
          
          if (hideProgress >= 1) {
            currentState = 'hidden';
          }
        }
      }
    }
    // 向上滚动逻辑
    else if (scrollDelta < 0) {
      // 如果当前是隐藏状态或正在隐藏，切换到显示模式
      if (currentState === 'hidden' || currentState === 'hiding') {
        baseScrollY = currentY;
        currentState = 'showing';
      }
      
      // 计算显示进度
      if (currentState === 'showing' || currentState === 'visible') {
        const showScroll = baseScrollY - currentY; // 注意：这里是反向计算
        
        if (showScroll > SHOW_THRESHOLD) {
          const showProgress = Math.min((showScroll - SHOW_THRESHOLD) / SHOW_DISTANCE, 1);
          
          // 应用显示变换（从隐藏状态逐渐显示）
          const hideProgress = 1 - showProgress;
          topBar.style.transform = `translateY(${-100 * hideProgress}%)`;
          controls.style.opacity = 1 - hideProgress;
          controls.style.transform = 'none';   // 不再水平移动
          
          if (showProgress >= 1) {
            currentState = 'visible';
          }
        }
      }
    }
    
    lastScrollY = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  });
}

//==============================
// ============新增阅读栏宽度调节按钮=================
//==============================

// 宽度调节相关样式
GM_addStyle(`
  .width-control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    border-radius: 50%;
    transition: all 0.3s ease;
    --default-color: #868C96;
    --hover-color: #212832;
    color: var(--default-color);
  }

  .width-control-btn:hover { 
    color: var(--hover-color);
    transform: scale(1.05);
  }

  .readerControls {
    transition: margin-left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
  }
  
  /* 为极宽屏幕优化 */
  @media (min-width: 1600px) {
    .readerControls {
      /* 在超宽屏幕上可以有更多调整空间 */
      position: fixed;
    }
  }
`);

// 获取当前控制栏的 margin-left
function getCurrentMarginLeft() {
  const controls = document.querySelector('.readerControls');
  if (!controls) return 0;
  
  const style = window.getComputedStyle(controls);
  const marginLeft = style.marginLeft;
  console.log("readerControls-marginLeft:",marginLeft)
  return parseInt(marginLeft.replace('px', '')) || 0;
}

// 获取当前宽度调节
function getCurrentMaxWidth(element) {
  let currentValue = window.getComputedStyle(element).maxWidth;
  currentValue = currentValue.substring(0, currentValue.indexOf('px'));
  currentValue = parseInt(currentValue);
  return currentValue;
}

// 修改主界面宽度，同时移动控制栏
function changeWidth(increase) {
  const step = 100;
  const item1 = document.querySelector(".readerContent .app_content");
  const item2 = document.querySelector('.readerTopBar');
  
  if (!item1 || !item2) return;
  
  const currentValue = getCurrentMaxWidth(item1);
  const currentControlMarginLeft = getCurrentMarginLeft();

  console.log("readerContent currentMaxValue:",currentValue);
  let changedValue;
  let changeControlMarginLeft;
  if (increase) {
    changedValue = currentValue + step;
    changeControlMarginLeft = currentControlMarginLeft + step/2;
  } else {
    changedValue = currentValue - step;
    changeControlMarginLeft = currentControlMarginLeft - step/2;
  }
  
  const minWidth = 400;
  const maxWidth = 1300;
  
  if (changedValue < minWidth) {
    changedValue = minWidth;
    changeControlMarginLeft = currentControlMarginLeft;
  } else if (changedValue > maxWidth) {
    changedValue = maxWidth;
    changeControlMarginLeft = currentControlMarginLeft;
  }
  
  item1.style['max-width'] = changedValue + 'px';
  item2.style['max-width'] = changedValue + 'px';
  
  const myEvent = new Event('resize');
  window.dispatchEvent(myEvent);
  
  updateWidthButtonsState(changedValue, minWidth, maxWidth);
  
  // 调整控制栏位置
  const controls = document.querySelector('.readerControls');
  if (controls) {
    controls.style.marginLeft = changeControlMarginLeft + 'px';
    controls.style.transition = 'margin-left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
  }
}

// 更新按钮状态（达到极值时禁用相应按钮）
function updateWidthButtonsState(currentWidth, minWidth, maxWidth) {
  const decreaseBtn = document.querySelector('.width-decrease-btn');
  const increaseBtn = document.querySelector('.width-increase-btn');
  
  if (decreaseBtn) {
    if (currentWidth <= minWidth) {
      decreaseBtn.style.opacity = '0.5';
      decreaseBtn.style.cursor = 'not-allowed';
    } else {
      decreaseBtn.style.opacity = '1';
      decreaseBtn.style.cursor = 'pointer';
    }
  }
  
  if (increaseBtn) {
    if (currentWidth >= maxWidth) {
      increaseBtn.style.opacity = '0.5';
      increaseBtn.style.cursor = 'not-allowed';
    } else {
      increaseBtn.style.opacity = '1';
      increaseBtn.style.cursor = 'pointer';
    }
  }
}

function createDecreaseWidthButton() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-minus-icon lucide-square-minus"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/></svg>
  `;

  const btn = createButton('width-decrease-btn', svg, '减宽');
  if (btn) {
    btn.className = 'width-control-btn width-decrease-btn readerControls_item'
    btn.addEventListener('click', () => changeWidth(false));
  }
}

// 创建加宽按钮
function createIncreaseWidthButton() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-plus-icon lucide-square-plus"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
  `;

  const btn = createButton('width-increase-btn', svg, '加宽');
  if (btn) {
    btn.className = 'width-control-btn width-increase-btn readerControls_item'
    btn.addEventListener('click', () => changeWidth(true));
  }
}

// 判断是否为深色模式
function isDarkMode() {
  const darkModeButton = document.querySelector(
    ".readerControls_item.white, .readerControls_item.dark"
  );
  return darkModeButton && darkModeButton.classList.contains("white");
}

// ==============================
// 监听页面变化，确保在页面内容最后一次变化后，能重新加载自定义内容：
// 1.添加的按钮能出现
// 2.实现顶部栏收缩与展示
// 3.重置背景与字体
// ==============================
  const observer = new MutationObserver(() => {
    createAutoScrollButton();
    createBackgroundButton();
    createFullscreenButton();
    createIncreaseWidthButton();  
    createDecreaseWidthButton();
    setupTopBarAutoHide();
    if (currentTheme) {
      applyTheme(currentTheme); 
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();