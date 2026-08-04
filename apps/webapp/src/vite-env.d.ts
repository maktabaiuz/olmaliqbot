/// <reference types="vite/client" />

interface Window {
  Telegram?: {
    WebApp?: {
      initData?: string;
      colorScheme?: 'light' | 'dark';
      ready?: () => void;
      expand?: () => void;
      close?: () => void;
    };
  };
}
