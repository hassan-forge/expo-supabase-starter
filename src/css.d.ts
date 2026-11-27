// Lets TypeScript accept `import '@/global.css'` without the generated expo-env.d.ts,
// which is git-ignored and therefore missing on CI.
declare module '*.css';
