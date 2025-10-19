// Aegis2FA Documentation - Custom JavaScript

// Enhanced Mermaid configuration
window.mermaidConfig = {
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
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
    actorBorder: '#673ab7',
    actorBkg: '#e1bee7',
    actorTextColor: '#4a148c',
    labelBoxBkgColor: '#9575cd',
    labelTextColor: '#ffffff',
    noteBkgColor: '#f3e5f5',
    noteTextColor: '#4a148c',
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
  },
};

// Initialize Mermaid
if (typeof mermaid !== 'undefined') {
  mermaid.initialize(window.mermaidConfig);
}

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
