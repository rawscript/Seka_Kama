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
    '@math.gl/web-mercator'
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
            crypto: false,
            canvas: false,
            child_process: false,
            os: false
        };
    }
    return config;
  },
};

export default nextConfig;
