// Test data and fixtures for tool testing

export const mockDOMSnapshots = {
  simple: '<html><body><h1>Simple Page</h1><p>Some content</p></body></html>',
  complex: `
    <html>
      <head><title>Complex Page</title></head>
      <body>
        <header>
          <nav>
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>
        </header>
        <main>
          <section id="hero">
            <h1>Welcome to Our Site</h1>
            <p>This is a complex page with multiple elements.</p>
            <button class="cta-button">Get Started</button>
          </section>
          <section id="features">
            <h2>Features</h2>
            <div class="feature-grid">
              <div class="feature-card">
                <h3>Feature 1</h3>
                <p>Description of feature 1</p>
              </div>
              <div class="feature-card">
                <h3>Feature 2</h3>
                <p>Description of feature 2</p>
              </div>
            </div>
          </section>
          <form id="contact-form">
            <input type="text" name="name" placeholder="Your Name" />
            <input type="email" name="email" placeholder="Your Email" />
            <textarea name="message" placeholder="Your Message"></textarea>
            <button type="submit">Send Message</button>
          </form>
        </main>
        <footer>
          <p>&copy; 2024 Test Company</p>
        </footer>
      </body>
    </html>
  `,
  withScripts: `
    <html>
      <head>
        <title>Page with Scripts</title>
        <script>console.log('header script');</script>
        <style>body { margin: 0; }</style>
      </head>
      <body>
        <h1>Content</h1>
        <script>console.log('body script');</script>
        <noscript>JavaScript is disabled</noscript>
      </body>
    </html>
  `
};

export const mockAccessibilityTrees = {
  simple: {
    role: 'WebArea',
    name: 'Simple Page',
    children: [
      {
        role: 'heading',
        name: 'Simple Page',
        level: 1
      },
      {
        role: 'text',
        name: 'Some content'
      }
    ]
  },
  complex: {
    role: 'WebArea',
    name: 'Complex Page',
    children: [
      {
        role: 'banner',
        name: 'Header',
        children: [
          {
            role: 'navigation',
            name: 'Main Navigation',
            children: [
              { role: 'link', name: 'Home' },
              { role: 'link', name: 'About' },
              { role: 'link', name: 'Contact' }
            ]
          }
        ]
      },
      {
        role: 'main',
        name: 'Main Content',
        children: [
          {
            role: 'region',
            name: 'Hero Section',
            children: [
              { role: 'heading', name: 'Welcome to Our Site', level: 1 },
              { role: 'text', name: 'This is a complex page with multiple elements.' },
              { role: 'button', name: 'Get Started' }
            ]
          },
          {
            role: 'region',
            name: 'Features Section',
            children: [
              { role: 'heading', name: 'Features', level: 2 },
              { role: 'heading', name: 'Feature 1', level: 3 },
              { role: 'text', name: 'Description of feature 1' },
              { role: 'heading', name: 'Feature 2', level: 3 },
              { role: 'text', name: 'Description of feature 2' }
            ]
          },
          {
            role: 'form',
            name: 'Contact Form',
            children: [
              { role: 'textbox', name: 'Your Name' },
              { role: 'textbox', name: 'Your Email' },
              { role: 'textbox', name: 'Your Message' },
              { role: 'button', name: 'Send Message' }
            ]
          }
        ]
      },
      {
        role: 'contentinfo',
        name: 'Footer',
        children: [
          { role: 'text', name: '© 2024 Test Company' }
        ]
      }
    ]
  }
};

export const mockElementQueries = {
  buttons: [
    '<button class="cta-button">Get Started</button>',
    '<button type="submit">Send Message</button>'
  ],
  inputs: [
    '<input type="text" name="name" placeholder="Your Name" />',
    '<input type="email" name="email" placeholder="Your Email" />',
    '<textarea name="message" placeholder="Your Message"></textarea>'
  ],
  links: [
    '<a href="/home">Home</a>',
    '<a href="/about">About</a>',
    '<a href="/contact">Contact</a>'
  ],
  headings: [
    '<h1>Welcome to Our Site</h1>',
    '<h2>Features</h2>',
    '<h3>Feature 1</h3>',
    '<h3>Feature 2</h3>'
  ]
};

export const mockPageText = {
  simple: 'Simple Page\nSome content',
  complex: `Welcome to Our Site
This is a complex page with multiple elements.
Get Started
Features
Feature 1
Description of feature 1
Feature 2
Description of feature 2
Your Name
Your Email
Your Message
Send Message
© 2024 Test Company`,
  empty: '',
  whitespaceOnly: '   \n\t   \n   '
};

export const mockScreenshotData = {
  small: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
  large: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Minimal JPEG
  base64Only: 'mock-base64-screenshot-data-here'
};

export const mockDialogScenarios = {
  alert: {
    type: 'alert',
    message: 'This is an alert dialog',
    defaultValue: ''
  },
  confirm: {
    type: 'confirm',
    message: 'Are you sure you want to continue?',
    defaultValue: ''
  },
  prompt: {
    type: 'prompt',
    message: 'Please enter your name:',
    defaultValue: 'Default Name'
  }
};

export const mockNavigationScenarios = {
  success: {
    url: 'https://example.com',
    title: 'Example Domain',
    status: 200
  },
  notFound: {
    url: 'https://example.com/not-found',
    title: 'Page Not Found',
    status: 404
  },
  timeout: {
    url: 'https://slow-site.com',
    error: 'Navigation timeout'
  },
  networkError: {
    url: 'https://invalid-domain.xyz',
    error: 'Network error'
  }
};

export const mockFormInteractions = {
  textInput: {
    selector: 'input[name="name"]',
    value: 'John Doe',
    expectedResult: 'Typed "John Doe" into input[name="name"]'
  },
  emailInput: {
    selector: 'input[type="email"]',
    value: 'john@example.com',
    expectedResult: 'Typed "john@example.com" into input[type="email"]'
  },
  textarea: {
    selector: 'textarea[name="message"]',
    value: 'This is a test message with\nmultiple lines.',
    expectedResult: 'Typed "This is a test message with\nmultiple lines." into textarea[name="message"]'
  },
  invalidSelector: {
    selector: 'input[name="nonexistent"]',
    value: 'test',
    expectedError: 'Error typing into \'input[name="nonexistent"]|test\''
  }
};

export const mockClickInteractions = {
  buttonBySelector: {
    input: '.cta-button',
    expectedResult: 'Clicked selector: .cta-button'
  },
  buttonByText: {
    input: 'Get Started',
    expectedResult: 'Clicked element containing text: Get Started'
  },
  linkBySelector: {
    input: 'a[href="/home"]',
    expectedResult: 'Clicked selector: a[href="/home"]'
  },
  linkByText: {
    input: 'Home',
    expectedResult: 'Clicked element containing text: Home'
  },
  invalidSelector: {
    input: '.nonexistent-element',
    expectedError: 'Error clicking \'.nonexistent-element\''
  },
  invalidText: {
    input: 'Nonexistent Text',
    expectedError: 'Error clicking \'Nonexistent Text\''
  }
};

export const mockKeyboardInteractions = {
  singleKey: {
    key: 'Enter',
    expectedResult: 'Pressed key: Enter'
  },
  modifierCombo: {
    key: 'Control+A',
    expectedResult: 'Pressed key combination: Control+A'
  },
  textInput: {
    text: 'Hello World',
    expectedResult: 'Typed text: Hello World'
  },
  specialCharacters: {
    text: '!@#$%^&*()',
    expectedResult: 'Typed text: !@#$%^&*()'
  }
};

export const mockMouseInteractions = {
  click: {
    x: 100,
    y: 200,
    expectedResult: 'Clicked at coordinates (100, 200)'
  },
  move: {
    x: 300,
    y: 400,
    expectedResult: 'Moved mouse to (300, 400)'
  },
  dragAndDrop: {
    fromX: 100,
    fromY: 100,
    toX: 200,
    toY: 200,
    expectedResult: 'Dragged from (100, 100) to (200, 200)'
  },
  scroll: {
    deltaX: 0,
    deltaY: 100,
    expectedResult: 'Scrolled by (0, 100)'
  }
};

export const mockTabScenarios = {
  singleTab: {
    tabs: [
      { id: 1, url: 'https://example.com', title: 'Example Domain', active: true }
    ]
  },
  multipleTabs: {
    tabs: [
      { id: 1, url: 'https://example.com', title: 'Example Domain', active: false },
      { id: 2, url: 'https://google.com', title: 'Google', active: true },
      { id: 3, url: 'https://github.com', title: 'GitHub', active: false }
    ]
  },
  newTab: {
    url: 'https://new-tab.com',
    expectedTab: { id: 4, url: 'https://new-tab.com', title: 'New Tab', active: true }
  }
};

export const mockMemoryData = {
  simple: {
    key: 'test-memory',
    value: 'This is a test memory',
    timestamp: Date.now()
  },
  complex: {
    key: 'complex-memory',
    value: {
      type: 'interaction',
      element: 'button.submit',
      action: 'click',
      result: 'success',
      metadata: {
        page: 'https://example.com/form',
        timestamp: Date.now()
      }
    },
    timestamp: Date.now()
  },
  list: [
    { key: 'memory-1', value: 'First memory', timestamp: Date.now() - 1000 },
    { key: 'memory-2', value: 'Second memory', timestamp: Date.now() - 500 },
    { key: 'memory-3', value: 'Third memory', timestamp: Date.now() }
  ]
};

export const mockErrorScenarios = {
  networkError: new Error('Network request failed'),
  timeoutError: new Error('Operation timed out'),
  elementNotFound: new Error('Element not found'),
  permissionDenied: new Error('Permission denied'),
  invalidInput: new Error('Invalid input provided'),
  pageNotLoaded: new Error('Page not loaded'),
  scriptError: new Error('Script execution failed')
};

// Helper functions for test data generation
export function generateMockHTML(elementCount: number = 10): string {
  const elements: string[] = [];
  for (let i = 0; i < elementCount; i++) {
    elements.push(`<div class="element-${i}" id="element-${i}">Element ${i}</div>`);
  }
  return `<html><body>${elements.join('\n')}</body></html>`;
}

export function generateMockAccessibilityTree(depth: number = 3, breadth: number = 3): any {
  function createNode(level: number, index: number): any {
    const node: any = {
      role: level === 0 ? 'WebArea' : `element-${level}-${index}`,
      name: `Element Level ${level} Index ${index}`,
      children: []
    };

    if (level < depth) {
      for (let i = 0; i < breadth; i++) {
        node.children.push(createNode(level + 1, i));
      }
    }

    return node;
  }

  return createNode(0, 0);
}

export function generateLargeText(wordCount: number = 1000): string {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit'];
  const result: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    result.push(words[i % words.length]);
  }
  return result.join(' ');
}
