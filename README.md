# RSS Proxy

Simple RSS proxy server using Express and CORS.

## Usage

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   npm start
   ```
3. Build and run with Docker:
   ```sh
   docker build -t rss-proxy .
   docker run -p 3000:3000 rss-proxy
   ```

## Description

This project provides a simple proxy for RSS feeds, allowing cross-origin requests using Express and CORS.
