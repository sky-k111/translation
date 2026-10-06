ba# Product Overview

## What is Word Translation Assistant?

A Chrome browser extension (单词翻译助手) that provides intelligent word translation and vocabulary learning for English learners.

## Core Features

- **Smart Translation**: Select any English text on web pages for instant translation
- **Auto Recording**: Automatically saves and categorizes all translated content (words, phrases, sentences)
- **Learning Modes**: Flashcards, quizzes, spelling practice, and daily challenges
- **Highlight System**: Previously translated words are highlighted on web pages
- **Learning Analytics**: Track usage frequency, learning progress, and statistics
- **Modern UI**: Glass morphism effects, dynamic themes, particle animations

## Architecture

**Hybrid Architecture**: Native JavaScript core extension + embedded React app for rich interactions

- **Core Extension** (Native JS): Content scripts, background service worker, popup UI
- **Embedded React App** (TAROT-main): Game-like experiences with React 19 + Tailwind CSS 4
- **Data Storage**: All data stored locally using Chrome Storage API (privacy-first)

## Translation Services

Multi-tier fallback chain for reliability:
1. OpenAI API (primary)
2. Netease Youdao (backup)
3. MyMemory (backup)
4. Baidu Translate (backup)

## Target Users

English learners who want to:
- Learn vocabulary while browsing the web
- Build a personal word bank
- Practice and review with spaced repetition
- Track learning progress
