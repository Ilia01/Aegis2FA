/* ==========================================
   Custom JavaScript for 2FA Docs
   ========================================== */

// ========== Mermaid Configuration ==========
window.mermaidConfig = {
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    // Primary colors
    primaryColor: '#667eea',
    primaryTextColor: '#fff',
    primaryBorderColor: '#764ba2',

    // Secondary colors
    secondaryColor: '#84fab0',
    secondaryTextColor: '#333',
    secondaryBorderColor: '#8fd3f4',

    // Tertiary colors
    tertiaryColor: '#fa709a',
    tertiaryTextColor: '#fff',
    tertiaryBorderColor: '#fee140',

    // Background and lines
    background: '#f8f9fa',
    mainBkg: '#ffffff',
    secondBkg: '#f0f0f0',
    lineColor: '#764ba2',
    border1: '#667eea',
    border2: '#84fab0',

    // Text
    textColor: '#333',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '16px',

    // Notes and labels
    noteBkgColor: '#fff3cd',
    noteTextColor: '#856404',
    noteBorderColor: '#ffc107',

    // Actor (sequence diagrams)
    actorBkg: '#667eea',
    actorBorder: '#764ba2',
    actorTextColor: '#fff',
    actorLineColor: '#764ba2',

    // Signal colors (sequence diagrams)
    signalColor: '#333',
    signalTextColor: '#333',
    labelBoxBkgColor: '#667eea',
    labelBoxBorderColor: '#764ba2',
    labelTextColor: '#fff',

    // Loop/alt/opt background
    loopTextColor: '#333',
    activationBkgColor: '#84fab0',
    activationBorderColor: '#8fd3f4',

    // Sequence numbers
    sequenceNumberColor: '#fff',

    // Git graph
    git0: '#667eea',
    git1: '#84fab0',
    git2: '#fa709a',
    git3: '#fee140',
    git4: '#8fd3f4',
    git5: '#764ba2',
    git6: '#30cfd0',
    git7: '#330867',

    // Class diagram
    classText: '#333',

    // State colors
    labelColor: '#fff',

    // Error
    errorBkgColor: '#ff6b6b',
    errorTextColor: '#fff',

    // Pie chart
    pie1: '#667eea',
    pie2: '#84fab0',
    pie3: '#fa709a',
    pie4: '#fee140',
    pie5: '#8fd3f4',
    pie6: '#764ba2',
    pie7: '#30cfd0',
    pie8: '#330867',
    pie9: '#ff6b6b',
    pie10: '#4ecdc4',
    pie11: '#45b7d1',
    pie12: '#f7b731',
  },

  // Flowchart configuration
  flowchart: {
    curve: 'basis',
    padding: 20,
    useMaxWidth: true,
    htmlLabels: true,
    rankSpacing: 65,
    nodeSpacing: 50,
    diagramPadding: 8,
  },

  // Sequence diagram configuration
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: true,
    bottomMarginAdj: 1,
    useMaxWidth: true,
    rightAngles: false,
    showSequenceNumbers: false,
    actorFontSize: 14,
    actorFontFamily: 'Inter, sans-serif',
    noteFontSize: 13,
    messageFontSize: 14,
  },

  // Gantt configuration
  gantt: {
    titleTopMargin: 25,
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    leftPadding: 75,
    gridLineStartPadding: 35,
    fontSize: 12,
    numberSectionStyles: 4,
    axisFormat: '%Y-%m-%d',
  },

  // Class diagram configuration
  class: {
    arrowMarkerAbsolute: false,
  },

  // State diagram configuration
  state: {
    dividerMargin: 10,
    sizeUnit: 5,
    padding: 8,
    textHeight: 10,
    titleShift: -15,
    noteMargin: 10,
    forkWidth: 70,
    forkHeight: 7,
    miniPadding: 2,
    fontSizeFactor: 5.02,
    fontSize: 24,
    labelHeight: 16,
    edgeLengthFactor: '20',
    compositTitleSize: 35,
    radius: 5,
  },
};

// ========== Dark Mode Mermaid Theme ==========
function updateMermaidTheme() {
  const isDark = document.querySelector('[data-md-color-scheme="slate"]');

  if (isDark) {
    window.mermaidConfig.themeVariables = {
      ...window.mermaidConfig.themeVariables,
      background: '#1e1e1e',
      mainBkg: '#2d2d2d',
      secondBkg: '#3d3d3d',
      textColor: '#e0e0e0',
      lineColor: '#667eea',
      noteBkgColor: '#3d3d3d',
      noteTextColor: '#e0e0e0',
      signalTextColor: '#e0e0e0',
      classText: '#e0e0e0',
    };
  }

  // Reload mermaid diagrams if present
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize(window.mermaidConfig);
  }
}

// ========== Smooth Scroll to Anchor ==========
document.addEventListener('DOMContentLoaded', function() {
  // Update mermaid theme on page load
  updateMermaidTheme();

  // Listen for color scheme changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'data-md-color-scheme') {
        updateMermaidTheme();
      }
    });
  });

  const body = document.querySelector('body');
  if (body) {
    observer.observe(body, { attributes: true });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Add copy feedback to code blocks
  document.querySelectorAll('.md-clipboard').forEach(button => {
    button.addEventListener('click', function() {
      const originalTitle = this.getAttribute('title');
      this.setAttribute('title', 'Copied! ✓');

      setTimeout(() => {
        this.setAttribute('title', originalTitle || 'Copy to clipboard');
      }, 2000);
    });
  });

  // Add animation to cards on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const cardObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '0';
        entry.target.style.transform = 'translateY(20px)';

        setTimeout(() => {
          entry.target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, 100);

        cardObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.md-typeset .grid.cards > *').forEach(card => {
    cardObserver.observe(card);
  });

  // Add click-to-zoom for mermaid diagrams
  document.querySelectorAll('.mermaid').forEach(diagram => {
    diagram.style.cursor = 'pointer';
    diagram.setAttribute('title', 'Click to zoom');

    diagram.addEventListener('click', function() {
      this.classList.toggle('zoomed');

      if (this.classList.contains('zoomed')) {
        this.style.transform = 'scale(1.3)';
        this.style.zIndex = '1000';
        this.style.position = 'relative';
        this.style.transition = 'transform 0.3s ease-out';
      } else {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '';
        this.style.position = '';
      }
    });
  });
});

// ========== Table of Contents Highlight ==========
window.addEventListener('scroll', function() {
  const tocLinks = document.querySelectorAll('.md-nav--secondary a');
  const scrollPos = window.scrollY + 100;

  tocLinks.forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        tocLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    }
  });
});

// ========== Progress Bar on Scroll ==========
window.addEventListener('scroll', function() {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;

  let progressBar = document.querySelector('.scroll-progress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      z-index: 10000;
      transition: width 0.3s ease-out;
    `;
    document.body.appendChild(progressBar);
  }

  progressBar.style.width = scrolled + '%';
});

// ========== Keyboard Shortcuts ==========
document.addEventListener('keydown', function(e) {
  // Press 's' to focus search
  if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.target.matches('input, textarea')) {
    e.preventDefault();
    const searchInput = document.querySelector('.md-search__input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Press 'Escape' to close search
  if (e.key === 'Escape') {
    const searchInput = document.querySelector('.md-search__input');
    if (searchInput && document.activeElement === searchInput) {
      searchInput.blur();
    }
  }
});

console.log('🚀 2FA Documentation - Enhanced with beautiful custom styling!');
