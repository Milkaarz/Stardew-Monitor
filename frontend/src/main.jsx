import { render } from 'preact';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import './styles/base.css';
import './styles/pages.css';
import { App } from './App.jsx';

render(<App />, document.getElementById('app'));
