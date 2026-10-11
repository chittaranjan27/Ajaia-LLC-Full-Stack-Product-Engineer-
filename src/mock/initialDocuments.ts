import type { DocumentItem } from '../types/document';

export const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Product Requirements Document — Ajaia Docs v1',
    content: `
      <h1>Product Requirements Document (PRD)</h1>
      <p><strong>Status:</strong> In Progress | <strong>Target Release:</strong> Q4 2026</p>
      <h2>1. Overview</h2>
      <p>Ajaia Docs is a modern, lightweight collaborative document editor designed for fast, frictionless documentation and real-time team collaboration.</p>
      <h2>2. Core Goals</h2>
      <ul>
        <li>Deliver a fluid and responsive rich-text editing experience inspired by Google Docs.</li>
        <li>Offer clean document organization with personal and shared workspaces.</li>
        <li>Ensure keyboard accessibility and modern productivity aesthetics.</li>
      </ul>
      <h2>3. Feature Scope</h2>
      <p>Key editor capabilities include standard rich text formatting, headings, lists, underline, and instant document state updates.</p>
    `,
    updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    ownership: 'owned',
    authorName: 'You',
    isStarred: true,
    isTrash: false,
  },
  {
    id: 'doc-2',
    title: 'Frontend Architecture & State Strategy',
    content: `
      <h1>Frontend Architecture & State Strategy</h1>
      <p>This document details the modular component boundaries and state design for Ajaia Docs.</p>
      <h2>Key Decisions</h2>
      <ol>
        <li><strong>Editor Core:</strong> Tiptap headless editor coupled with Tailwind styling.</li>
        <li><strong>Navigation:</strong> Tab-based filtering across personal and shared documents.</li>
        <li><strong>Modularity:</strong> Decoupled UI components for header, sidebar, canvas, and toolbar.</li>
      </ol>
      <p>Keep state mutations localized to maintain high frame rates during rapid text entry.</p>
    `,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    ownership: 'owned',
    authorName: 'You',
    isStarred: false,
    isTrash: false,
  },
  {
    id: 'doc-3',
    title: 'Sprint Planning & Team Roadmap',
    content: `
      <h1>Sprint Planning & Team Roadmap</h1>
      <p><em>Shared with you by Sarah Chen (Product Lead)</em></p>
      <h2>Sprint 42 Deliverables</h2>
      <ul>
        <li>Document management dashboard layout</li>
        <li>Rich-text Tiptap integration with heading & list support</li>
        <li>Export and mock sharing modal</li>
      </ul>
      <p>Next steps: Supabase database and real-time collaboration pipeline.</p>
    `,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    ownership: 'shared',
    authorName: 'Sarah Chen',
    authorEmail: 'sarah.chen@ajaia.io',
    isStarred: true,
    isTrash: false,
  },
  {
    id: 'doc-4',
    title: 'Weekly Engineering Sync Notes',
    content: `
      <h1>Weekly Engineering Sync Notes</h1>
      <p><em>Shared with you by Alex Rivera (Tech Lead)</em></p>
      <h2>Attendees</h2>
      <p>Alex Rivera, Chittaranjan, Sarah Chen, Design Team</p>
      <h2>Discussion Points</h2>
      <ul>
        <li>Verified responsive layout behavior on mobile and tablet screens.</li>
        <li>Confirmed keyboard accessibility standards (WAI-ARIA).</li>
        <li>Discussed upcoming Supabase persistence patterns for collaborative cursors.</li>
      </ul>
    `,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    ownership: 'shared',
    authorName: 'Alex Rivera',
    authorEmail: 'alex.rivera@ajaia.io',
    isStarred: false,
    isTrash: false,
  },
  {
    id: 'doc-5',
    title: 'Client Proposal — Full Stack Web App',
    content: `
      <h1>Client Proposal: Enterprise Cloud Solution</h1>
      <h2>Executive Summary</h2>
      <p>A high-performance modern web application leveraging React, TypeScript, and edge storage.</p>
      <h2>Milestones & Timelines</h2>
      <ol>
        <li>Phase 1: UI Foundation and Editor Canvas</li>
        <li>Phase 2: Database Schema & Authentication</li>
        <li>Phase 3: Multi-tenant collaboration & deployment</li>
      </ol>
    `,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    ownership: 'owned',
    authorName: 'You',
    isStarred: false,
    isTrash: false,
  },
  {
    id: 'doc-6',
    title: 'Old Deprecated Draft Spec (Archived)',
    content: `
      <h1>Archived Legacy Notes</h1>
      <p>This draft is kept in Trash for demonstration purposes.</p>
    `,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    ownership: 'owned',
    authorName: 'You',
    isStarred: false,
    isTrash: true,
  },
];
