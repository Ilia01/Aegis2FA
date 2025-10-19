// Aegis2FA Documentation - Custom JavaScript

// Detect dark mode
function isDarkMode() {
  return document.querySelector('[data-md-color-scheme="slate"]') !== null;
}

// Get Mermaid configuration based on theme
function getMermaidConfig() {
  const darkMode = isDarkMode();

  return {
    startOnLoad: true,
    theme: 'base',
    themeVariables: darkMode ? {
      // Dark mode theme
      primaryColor: '#9575cd',
      primaryTextColor: '#e0e0e0',
      primaryBorderColor: '#667eea',
      lineColor: '#764ba2',
      secondaryColor: '#7c4dff',
      tertiaryColor: '#b39ddb',
      background: '#2d2d2d',
      mainBkg: '#2d2d2d',
      secondBkg: '#1e1e1e',
      nodeBorder: '#667eea',
      clusterBkg: 'rgba(102, 126, 234, 0.1)',
      clusterBorder: '#667eea',
      titleColor: '#e0e0e0',
      edgeLabelBackground: '#1e1e1e',
      textColor: '#e0e0e0',
      actorBorder: '#667eea',
      actorBkg: '#2d2d2d',
      actorTextColor: '#e0e0e0',
      labelBoxBkgColor: '#1e1e1e',
      labelTextColor: '#e0e0e0',
      noteBkgColor: '#2d2d2d',
      noteTextColor: '#e0e0e0',
      // ER diagram specific
      attributeBackgroundColorOdd: '#2d2d2d',
      attributeBackgroundColorEven: '#1e1e1e',
      entityBackgroundColor: '#2d2d2d',
      entityBorderColor: '#667eea',
    } : {
      // Light mode theme
      primaryColor: '#9575cd',
      primaryTextColor: '#fff',
      primaryBorderColor: '#673ab7',
      lineColor: '#764ba2',
      secondaryColor: '#7c4dff',
      tertiaryColor: '#b39ddb',
      background: '#ffffff',
      mainBkg: '#e1bee7',
      secondBkg: '#ce93d8',
      nodeBorder: '#673ab7',
      clusterBkg: '#f3e5f5',
      clusterBorder: '#9575cd',
      titleColor: '#4a148c',
      edgeLabelBackground: '#ffffff',
      textColor: '#333333',
      actorBorder: '#673ab7',
      actorBkg: '#e1bee7',
      actorTextColor: '#4a148c',
      labelBoxBkgColor: '#9575cd',
      labelTextColor: '#ffffff',
      noteBkgColor: '#f3e5f5',
      noteTextColor: '#4a148c',
      // ER diagram specific
      attributeBackgroundColorOdd: '#f3e5f5',
      attributeBackgroundColorEven: '#e1bee7',
      entityBackgroundColor: '#e1bee7',
      entityBorderColor: '#673ab7',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 15,
      useMaxWidth: true,
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      mirrorActors: true,
      useMaxWidth: true,
    },
    er: {
      useMaxWidth: true,
      fontSize: 14,
      layoutDirection: 'TB',
    },
  };
}

// Initialize Mermaid with dynamic config
window.mermaidConfig = getMermaidConfig();

if (typeof mermaid !== 'undefined') {
  mermaid.initialize(window.mermaidConfig);
}

// Reinitialize Mermaid when theme changes
document.addEventListener('DOMContentLoaded', function() {
  // Watch for theme changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'data-md-color-scheme') {
        // Reinitialize Mermaid with new theme
        window.mermaidConfig = getMermaidConfig();
        if (typeof mermaid !== 'undefined') {
          mermaid.initialize(window.mermaidConfig);
          // Force re-render of all diagrams
          document.querySelectorAll('.mermaid').forEach(function(element) {
            const content = element.textContent;
            element.removeAttribute('data-processed');
            element.textContent = content;
          });
          mermaid.init(undefined, '.mermaid');
        }
      }
    });
  });

  const body = document.querySelector('body');
  if (body) {
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['data-md-color-scheme']
    });
  }
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// Make tables responsive
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('table').forEach(table => {
    if (!table.parentElement.classList.contains('table-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      wrapper.style.overflowX = 'auto';
      wrapper.style.marginBottom = '1rem';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
});
