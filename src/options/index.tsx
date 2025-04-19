// React is needed for JSX
import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Options } from './Options';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<Options />);
