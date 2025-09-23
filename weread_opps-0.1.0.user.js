// ==UserScript==
// @name         WeRead 自动滚动阅读
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在微信读书网页版侧边栏新增“自动滚动”按钮，点击后页面会以设定速度自动向下滚动，再次点击暂停
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

//GM_addStyle(".readerChapterContent{color: #226273 !important;}");




(function () {
  'use strict';

  /********************
   * 配置项
   ********************/
  const SCROLL_SPEED = 1;   // 每次滚动的像素距离
  const INTERVAL_MS  = 35;  // 滚动间隔（毫秒），数值越小速度越快，20ms≈50帧/秒

  /********************
   * 样式
   ********************/
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
    }
    .auto-scroll-btn:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
    .auto-scroll-btn.active {
      color: #4caf50; /* 启动时按钮变绿 */
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
  function insertButton() {
    const controls = document.querySelector('.readerControls');
    if (!controls || controls.querySelector('.auto-scroll-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'auto-scroll-btn readerControls_item';
    // btn.style.backgroundImage = `url('${url}')`; // 使用油猴资源 URL
    // btn.style.backgroundSize = 'cover';
    // btn.style.backgroundRepeat = 'no-repeat';
    btn.textContent = '⇣'; // 你可以换成其他 emoji 或图标
    //btn.innerHTML = url;
    btn.title = '开始自动滚动';
    btn.addEventListener('click', () => toggleScroll(btn));

    controls.appendChild(btn);
  }



  /********************
   * 配置区：每项都包含背景图和对应字体颜色
   ********************/
  const themes = [
    {
      name: '牛皮纸纹理',
      url: url1,
      textColor: 'rgba(53, 53, 56, 1)' // 灰字
    },
    {
      name: '森林绿',
      url: url2,
      textColor: '#222222' // 深灰字
    },
    {
      name: '纸张纹理',
      url: url3,
      textColor: '#000000' // 黑字
    }
  ];

  /********************
   * 样式
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
      transition: background-color 0.2s;
    }
    @media (prefers-color-scheme: dark) {
      .bg-select-btn { background-color: #1C1C1D !important; }
    }
    .bg-select-btn:hover { background-color: rgba(0,0,0,0.1); }
    .bg-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.3);
      padding: 16px;
      z-index: 9999;
      max-width: 80%;
      max-height: 70%;
      overflow-y: auto;
    }
    .bg-modal h3 {
      margin-top: 0;
      font-size: 18px;
      text-align: center;
      color: #222; /* 深色字体 */
    }
    .bg-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 120px);
      gap: 12px;
      justify-content: center;
      margin-top: 12px;
    }
    .bg-item {
      width: 120px;
      height: 80px;
      background-size: cover;
      background-position: center;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.2s;
    }
    .bg-item:hover { border-color: #4caf50; }
    .bg-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.3);
      z-index: 9998;
    }
  `);

  /********************
   * 创建按钮
   ********************/
  function createBackgroundButton() {
    const controls = document.querySelector('.readerControls');
    if (!controls || controls.querySelector('.bg-select-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'bg-select-btn readerControls_item';
    btn.title = '选择主题';
    btn.textContent = '🎨';
    btn.addEventListener('click', openModal);
    controls.appendChild(btn);
  }

  /********************
   * 弹框逻辑
   ********************/
  function openModal() {
    const overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.addEventListener('click', closeModal);

    const modal = document.createElement('div');
    modal.className = 'bg-modal';
    modal.innerHTML = `<h3>请选择阅读主题</h3>`;

    const grid = document.createElement('div');
    grid.className = 'bg-grid';

    themes.forEach(theme => {
      const item = document.createElement('div');
      item.className = 'bg-item';
      item.title = theme.name;
      item.style.backgroundImage = `url(${theme.url})`;
      item.addEventListener('click', () => {
        applyTheme(theme);
        closeModal();
        GM_setValue('currentTheme', theme); // 保存主题
        location.reload();                      // 刷新页面
      });
      grid.appendChild(item);
    });

    modal.appendChild(grid);
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  function closeModal() {
    document.querySelector('.bg-modal')?.remove();
    document.querySelector('.bg-overlay')?.remove();
  }

    //读取上次选择
    const currentTheme = GM_getValue('currentTheme', null);
    console.log('currentTheme:',currentTheme)
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
      content.style.backgroundImage = `url(${theme.url})`;
      content.style.backgroundSize = 'cover';
      content.style.backgroundPosition = 'center';
      content.style.backgroundAttachment = 'fixed';
    }
    GM_addStyle(`
      .readerChapterContent {
          color: ${theme.textColor} !important;
          -webkit-text-fill-color: ${theme.textColor} !important;
      }
    `);
  }

  // 增加按钮
  // 监听页面变化，确保进入阅读页时按钮能出现
  const observer = new MutationObserver(() => {
    insertButton();
    createBackgroundButton();
    applyTheme(currentTheme);//每次页面变化后重新更新字体颜色，确保能更新
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 初始尝试
  insertButton();

  // 初次尝试
  createBackgroundButton();
})();