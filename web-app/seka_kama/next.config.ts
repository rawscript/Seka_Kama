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
    'styled-components'
  ],
};

export default nextConfig;
