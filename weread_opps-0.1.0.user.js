// ==UserScript==
// @name         WeRead 自动滚动阅读
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  在微信读书网页版侧边栏新增"自动滚动"按钮，点击后页面会以设定速度自动向下滚动，再次点击暂停
// @author       你
// @match        https://weread.qq.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @resource     myImage https://gitee.com/StitchHu/images/raw/master/6891758361297_.pic.jpg
// ==/UserScript==

(function () {
  'use strict';

  // ==============================
  // 配置常量
  // ==============================
  const CONFIG = {
    SCROLL_SPEED: 1,
    INTERVAL_MS: 35,
    WIDTH_STEP: 100,
    MIN_WIDTH: 400,
    MAX_WIDTH: 1300,
    HIDE_THRESHOLD: 30,
    HIDE_DISTANCE: 50,
    SHOW_THRESHOLD: 30,
    SHOW_DISTANCE: 50
  };

  // 主题配置
  const THEMES = [
    {
      name: '牛皮纸纹理',
      url: GM_getResourceURL("myImage1"),
      textColor: '#2D1B15',
      backgroundColor: '#2D2419',
      readerButtonColor: '#4F4F4F',
      fontFamily: 'cejkpx'
    },
    {
      name: '森林绿',
      url: GM_getResourceURL("myImage2"),
      textColor: '#222222',
      backgroundColor: '#2D2419',
      readerButtonColor: '#4F4F4F',
      fontFamily: 'cejkpx'
    },
    {
      name: '莫兰迪米绿',
      readerBgColor: '#D6DBBC',
      textColor: '#474E31',
      backgroundColor: '#C8D6B8',
      readerButtonColor: '#4E7B50',
      fontFamily: 'wr_default_fontspx'
    },
    {
      name: '古典羊皮纸',
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

  // SVG 图标配置
  const ICONS = {
    theme: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m20 13.7-2.1-2.1a2 2 0 0 0-2.8 0L9.7 17"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><circle cx="10" cy="8" r="2"/></svg>`,
    scroll: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v14"/><path d="m19 9-7 7-7-7"/><circle cx="12" cy="21" r="1"/></svg>`,
    fullscreen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="8" x="7" y="8" rx="1"/></svg>`,
    decrease: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/></svg>`,
    increase: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`
  };

  // ==============================
  // 工具类
  // ==============================
  class Utils {
    static addStyle(css) {
      GM_addStyle(css);
    }

    static createElement(tag, className, innerHTML) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (innerHTML) element.innerHTML = innerHTML;
      return element;
    }

    static debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    static getCurrentValue(element, property) {
      const value = window.getComputedStyle(element)[property];
      return parseInt(value.replace('px', '')) || 0;
    }
  }

  // ==============================
  // 按钮管理类
  // ==============================
  class ButtonManager {
    constructor() {
      this.buttons = new Map();
    }

    create(config) {
      const controls = document.querySelector('.readerControls');
      if (!controls || controls.querySelector('.' + config.className)) return null;

      const container = Utils.createElement('div', 'wr_tooltip_container');
      container.setAttribute('style', '--offset: 6px;');

      const btn = Utils.createElement('button', `${config.className} readerControls_item`, config.icon);
      const tooltip = Utils.createElement('div', 'wr_tooltip_item wr_tooltip_item--right', config.tooltip);
      tooltip.style.display = 'none';

      container.appendChild(btn);
      container.appendChild(tooltip);

      // 添加悬停效果
      container.addEventListener('mouseenter', () => tooltip.style.display = 'block');
      container.addEventListener('mouseleave', () => tooltip.style.display = 'none');

      if (config.onClick) {
        btn.addEventListener('click', config.onClick);
      }

      controls.appendChild(container);
      this.buttons.set(config.className, btn);
      return btn;
    }

    get(className) {
      return this.buttons.get(className);
    }
  }

  // ==============================
  // 自动滚动管理类
  // ==============================
  class ScrollManager {
    constructor() {
      this.scrolling = false;
      this.scrollTimer = null;
    }

    start() {
      if (this.scrolling) return;
      this.scrolling = true;
      this.scrollTimer = setInterval(() => {
        window.scrollBy(0, CONFIG.SCROLL_SPEED);
      }, CONFIG.INTERVAL_MS);
    }

    stop() {
      this.scrolling = false;
      if (this.scrollTimer) {
        clearInterval(this.scrollTimer);
        this.scrollTimer = null;
      }
    }

    toggle(button) {
      if (this.scrolling) {
        this.stop();
        button.classList.remove('active');
        button.title = '开始自动滚动';
      } else {
        this.start();
        button.classList.add('active');
        button.title = '暂停自动滚动';
      }
    }
  }

  // ==============================
  // 主题管理类
  // ==============================
  class ThemeManager {
    constructor() {
      this.currentTheme = GM_getValue('currentTheme', null);
      this.modal = null;
    }

    applyTheme(theme) {
      const content = document.querySelector('.app_content');
      if (content) {
        if (theme.url) {
          content.style.cssText += `
            background-image: url(${theme.url});
            background-size: auto;
            background-position: center top;
            background-attachment: fixed;
            background-repeat: repeat;
            image-rendering: crisp-edges;
          `;
        } else if (theme.readerBgColor) {
          content.style.cssText += `
            background-image: none;
            background-color: ${theme.readerBgColor};
          `;
        }
      }

      Utils.addStyle(`
        .readerChapterContent {
          color: ${theme.textColor} !important;
          -webkit-text-fill-color: ${theme.textColor} !important;
        }
        .readerContent {
          background-color: ${theme.backgroundColor};
        }
        .readerFooter_button {
          color: ${theme.readerButtonColor};
        }
        .readerHeaderButton {
          color: ${theme.readerButtonColor};
        }
      `);
    }

    openModal() {
      if (this.modal) return;

      const overlay = Utils.createElement('div', 'bg-overlay');
      overlay.addEventListener('click', () => this.closeModal());

      const modal = Utils.createElement('div', 'bg-modal');
      const closeBtn = Utils.createElement('button', 'bg-close', '×');
      closeBtn.addEventListener('click', () => this.closeModal());
      
      const title = Utils.createElement('h3', '', '选择阅读主题');
      const grid = Utils.createElement('div', 'bg-grid');

      THEMES.forEach((theme) => {
        const item = Utils.createElement('div', 'bg-item');
        item.setAttribute('data-name', theme.name);
        
        if (theme.url) {
          item.style.backgroundImage = `url(${theme.url})`;
        } else {
          item.style.backgroundColor = theme.readerBgColor;
        }

        item.addEventListener('click', () => {
          this.applyTheme(theme);
          this.closeModal();
          GM_setValue('currentTheme', theme);
          location.reload();
        });

        grid.appendChild(item);
      });

      modal.appendChild(closeBtn);
      modal.appendChild(title);
      modal.appendChild(grid);
      
      document.body.appendChild(overlay);
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      this.modal = { modal, overlay };
    }

    closeModal() {
      if (!this.modal) return;
      
      const { modal, overlay } = this.modal;
      modal.style.animation = 'slideOut 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards';
      overlay.style.animation = 'fadeOut 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) forwards';
      
      setTimeout(() => {
        modal.remove();
        overlay.remove();
        document.body.style.overflow = '';
        this.modal = null;
      }, 400);
    }

    init() {
      if (this.currentTheme) {
        this.applyTheme(this.currentTheme);
      }
    }
  }

  // ==============================
  // 宽度管理类
  // ==============================
  class WidthManager {
    constructor() {
      this.elements = {
        content: () => document.querySelector(".readerContent .app_content"),
        topBar: () => document.querySelector('.readerTopBar'),
        controls: () => document.querySelector('.readerControls')
      };
    }

    changeWidth(increase) {
      const content = this.elements.content();
      const topBar = this.elements.topBar();
      const controls = this.elements.controls();
      
      if (!content || !topBar) return;

      const currentValue = Utils.getCurrentValue(content, 'maxWidth');
      const currentMargin = Utils.getCurrentValue(controls, 'marginLeft');
      
      let newValue = increase ? 
        Math.min(currentValue + CONFIG.WIDTH_STEP, CONFIG.MAX_WIDTH) :
        Math.max(currentValue - CONFIG.WIDTH_STEP, CONFIG.MIN_WIDTH);
      
      let newMargin = currentMargin + (newValue - currentValue) / 2;

      content.style.maxWidth = newValue + 'px';
      topBar.style.maxWidth = newValue + 'px';
      
      if (controls) {
        controls.style.marginLeft = newMargin + 'px';
        controls.style.transition = 'margin-left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
      }

      window.dispatchEvent(new Event('resize'));
      this.updateButtonStates(newValue);
    }

    updateButtonStates(currentWidth) {
      const decreaseBtn = document.querySelector('.width-decrease-btn');
      const increaseBtn = document.querySelector('.width-increase-btn');
      
      [decreaseBtn, increaseBtn].forEach(btn => {
        if (!btn) return;
        const isDisabled = (btn === decreaseBtn && currentWidth <= CONFIG.MIN_WIDTH) ||
                          (btn === increaseBtn && currentWidth >= CONFIG.MAX_WIDTH);
        btn.style.opacity = isDisabled ? '0.5' : '1';
        btn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
      });
    }
  }

  // ==============================
  // 顶部栏自动隐藏类
  // ==============================
  class TopBarManager {
    constructor() {
      this.lastScrollY = window.scrollY;
      this.baseScrollY = window.scrollY;
      this.currentState = 'visible';
      this.ticking = false;
    }

    setup() {
      const topBar = document.querySelector('.readerTopBar');
      const controls = document.querySelector('.readerControls');

      if (!topBar || !controls) return;

      topBar.style.transition = 'transform 0.3s ease';
      controls.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      controls.style.willChange = 'opacity, transform';

      const onScroll = () => {
        const currentY = window.scrollY;
        const scrollDelta = currentY - this.lastScrollY;

        if (scrollDelta > 0) {
          this.handleDownScroll(currentY, topBar, controls);
        } else if (scrollDelta < 0) {
          this.handleUpScroll(currentY, topBar, controls);
        }

        this.lastScrollY = currentY;
        this.ticking = false;
      };

      window.addEventListener('scroll', () => {
        if (!this.ticking) {
          window.requestAnimationFrame(onScroll);
          this.ticking = true;
        }
      });
    }

    handleDownScroll(currentY, topBar, controls) {
      if (this.currentState === 'visible' || this.currentState === 'showing') {
        this.baseScrollY = currentY;
        this.currentState = 'hiding';
      }

      if (this.currentState === 'hiding' || this.currentState === 'hidden') {
        const hideScroll = currentY - this.baseScrollY;
        if (hideScroll > CONFIG.HIDE_THRESHOLD) {
          const hideProgress = Math.min((hideScroll - CONFIG.HIDE_THRESHOLD) / CONFIG.HIDE_DISTANCE, 1);
          topBar.style.transform = `translateY(${-100 * hideProgress}%)`;
          controls.style.opacity = 1 - hideProgress;
          controls.style.transform = 'none';

          if (hideProgress >= 1) {
            this.currentState = 'hidden';
          }
        }
      }
    }

    handleUpScroll(currentY, topBar, controls) {
      if (this.currentState === 'hidden' || this.currentState === 'hiding') {
        this.baseScrollY = currentY;
        this.currentState = 'showing';
      }

      if (this.currentState === 'showing' || this.currentState === 'visible') {
        const showScroll = this.baseScrollY - currentY;
        if (showScroll > CONFIG.SHOW_THRESHOLD) {
          const showProgress = Math.min((showScroll - CONFIG.SHOW_THRESHOLD) / CONFIG.SHOW_DISTANCE, 1);
          const hideProgress = 1 - showProgress;
          
          topBar.style.transform = `translateY(${-100 * hideProgress}%)`;
          controls.style.opacity = 1 - hideProgress;
          controls.style.transform = 'none';

          if (showProgress >= 1) {
            this.currentState = 'visible';
          }
        }
      }
    }
  }

  // ==============================
  // 主应用类
  // ==============================
  class WeReadEnhancer {
    constructor() {
      this.buttonManager = new ButtonManager();
      this.scrollManager = new ScrollManager();
      this.themeManager = new ThemeManager();
      this.widthManager = new WidthManager();
      this.topBarManager = new TopBarManager();
      this.observer = null;
    }

    init() {
      this.addStyles();
      this.createButtons();
      this.setupObserver();
      this.themeManager.init();
      
      // 延迟初始化顶部栏管理器，确保DOM已完全加载
      setTimeout(() => {
        this.topBarManager.setup();
      }, 500);
    }

    addStyles() {
      Utils.addStyle(`
        /* 通用按钮样式 */
        .readerControls_item {
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
          color: #868C96;
        }
        
        .readerControls_item:hover {
          color: #212832;
          transform: scale(1.05);
        }
        
        .auto-scroll-btn.active {
          color: #1D88EE;
        }
        
        .width-control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 主题选择器样式 */
        .bg-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 9998;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.3s ease;
        }
        
        .bg-modal {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          padding: 32px;
          z-index: 9999;
          width: 90%;
          max-width: 540px;
          max-height: 80vh;
          overflow-y: auto;
          animation: slideIn 0.3s ease;
        }
        
        .bg-modal h3 {
          margin: 0 0 28px 0;
          font-size: 22px;
          font-weight: 600;
          text-align: center;
          color: #333;
        }
        
        .bg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 20px;
        }
        
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
        
        .bg-item:hover {
          border-color: #4caf50;
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
        }
        
        .bg-item::after {
          content: attr(data-name);
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          color: white;
          padding: 16px 8px 8px;
          font-size: 12px;
          text-align: center;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }
        
        .bg-item:hover::after {
          opacity: 1;
          transform: translateY(0);
        }
        
        .bg-close {
          position: absolute;
          top: 16px; right: 16px;
          width: 32px; height: 32px;
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
        }

        /* 动画 */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes slideOut {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        }

        /* 暗色模式适配 */
        @media (prefers-color-scheme: dark) {
          .bg-modal {
            background: #2a2a2a;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }
          .bg-modal h3 {
            color: #fff;
          }
          .bg-close {
            background: rgba(255, 255, 255, 0.1);
            color: #ccc;
          }
        }
      `);
    }

    createButtons() {
      const buttonConfigs = [
        {
          className: 'auto-scroll-btn',
          icon: ICONS.scroll,
          tooltip: '自动滚动',
          onClick: () => {
            const btn = this.buttonManager.get('auto-scroll-btn');
            this.scrollManager.toggle(btn);
          }
        },
        {
          className: 'bg-select-btn',
          icon: ICONS.theme,
          tooltip: '切换主题',
          onClick: () => this.themeManager.openModal()
        },
        {
          className: 'full-screen-btn',
          icon: ICONS.fullscreen,
          tooltip: '沉浸式',
          onClick: () => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }
        },
        {
          className: 'width-decrease-btn',
          icon: ICONS.decrease,
          tooltip: '减宽',
          onClick: () => this.widthManager.changeWidth(false)
        },
        {
          className: 'width-increase-btn',
          icon: ICONS.increase,
          tooltip: '加宽',
          onClick: () => this.widthManager.changeWidth(true)
        }
      ];

      buttonConfigs.forEach(config => this.buttonManager.create(config));
    }

    setupObserver() {
      this.observer = new MutationObserver(Utils.debounce(() => {
        this.createButtons();
        // 确保顶部栏管理器重新初始化
        setTimeout(() => {
          this.topBarManager.setup();
        }, 100);
        if (this.themeManager.currentTheme) {
          this.themeManager.applyTheme(this.themeManager.currentTheme);
        }
      }, 100));

      this.observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    }
  }

  // ==============================
  // 启动应用
  // ==============================
  const app = new WeReadEnhancer();
  app.init();
})();