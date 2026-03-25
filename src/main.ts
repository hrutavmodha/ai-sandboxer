const root = document.getElementById('app');

if (!root) {
  throw new Error('Root element #app not found');
}

const app: HTMLElement = root;

// Temporary confirmation of DOM access
app.innerHTML = '<p>App mounting...</p>';
app.innerHTML = '';
