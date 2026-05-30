import path from 'path';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    'kepler.gl',
    '@kepler.gl/components',
    '@kepler.gl/actions',
    '@kepler.gl/reducers',
    '@kepler.gl/styles',
    '@kepler.gl/layers',
    '@kepler.gl/processors',
    '@kepler.gl/utils',
    'react-palm',
    'styled-components',
    'deck.gl',
    '@deck.gl/core',
    '@deck.gl/layers',
    '@deck.gl/react',
    '@deck.gl/geo-layers',
    '@deck.gl/mesh-layers',
    '@deck.gl/extensions',
    '@deck.gl/aggregation-layers',
    '@deck.gl/json',
    'luma.gl',
    '@luma.gl/constants',
    '@luma.gl/core',
    '@luma.gl/engine',
    '@luma.gl/shadertools',
    '@luma.gl/webgl',
    '@luma.gl/gltools',
    '@luma.gl/effects',
    '@luma.gl/gltf',
    '@math.gl/core',
    '@math.gl/proj4',
    '@math.gl/web-mercator',
    '@loaders.gl/core',
    '@loaders.gl/images',
    '@loaders.gl/textures',
    '@loaders.gl/gltf',
    '@loaders.gl/loader-utils',
    '@loaders.gl/worker-utils',
    '@loaders.gl/schema'
  ],

  // Bypasses Next.js 16's strict Turbopack enforcement out of the box
  turbopack: {},

  webpack: (config) => {
    // Disable minification to prevent SWC WorkerError crashes with massive deck.gl chunks
    config.optimization.minimize = false;

    // Alias react-dom to our shim to fix findDOMNode missing in React 19
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-dom-lib': path.resolve(process.cwd(), 'node_modules/react-dom'),
      'react-dom$': path.resolve(process.cwd(), 'react-dom-shim.js'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      canvas: false,
      child_process: false,
      os: false,
      net: false,
      tls: false,
      // Optional native deps of `ws` — not available in the browser/edge bundle
      bufferutil: false,
      'utf-8-validate': false,
    };
    return config;
  },

  serverExternalPackages: ['ssr-window'],
  experimental: {
    workerThreads: false,
    memoryBasedWorkersCount: true,
  },
  // NOTE: ignoreBuildErrors was removed. Fix TypeScript errors rather than hiding them.
  // Re-enable temporarily only if you need an emergency deploy: typescript: { ignoreBuildErrors: true }
};

export default nextConfig;