/// <reference types="vite/client" />

// Allow importing SVGs as raw strings (used for tinting the marker SVG)
declare module '*.svg?raw' {
    const content: string;
    export default content;
}
