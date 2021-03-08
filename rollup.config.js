import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/mod.ts',
  output: {
    file: 'dist/common.js',
    format: 'cjs'
  },
  plugins: [
    typescript({
      target: 'ES2018'
    })
  ]
};
