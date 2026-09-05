/**
 * Plain-English Help Tooltips Dictionary for Admin Panel Action Buttons
 * 
 * Provides clear, jargon-free explanations of what buttons do,
 * what happens when clicked, and whether actions are safe or destructive.
 */

export const BUTTON_HELP = {
  // Overview & Header
  SEED_DATABASE: "Safely populates empty database collections with baseline portfolio data. It will never overwrite your existing content.",
  VIEW_LIVE_SITE: "Opens your live public portfolio website in a new browser tab so you can preview your published changes.",
  GLOBAL_REFRESH: "Purges server-side Next.js caches and re-fetches the latest database records across all open tabs.",
  SIGN_OUT: "Securely ends your admin session and returns you to the login screen.",

  // Mail Center (/admin/mail)
  SEND_MAIL: "Directly delivers this email to the recipient's inbox using Brevo server-side API.",
  SAVE_DRAFT: "Saves your current email subject, recipient, and message to the database so you can finish and send it later.",
  DISCARD_DRAFT: "Clears all text fields in this compose form and resets the editor.",
  RESUME_DRAFT: "Loads this saved draft back into the compose editor so you can edit and send it.",
  DELETE_DRAFT: "Permanently deletes this saved draft from your database.",
  INSPECT_MAIL: "Opens full email details including delivery status, recipient, timestamp, and Brevo message ID.",
  ATTACH_FILES: "Select documents, PDFs, or images (up to 10MB total) to attach to this email.",

  // Inquiries (/admin/inquiries)
  DIRECT_COMPOSE: "Opens a blank compose window to send a direct email to any client or visitor.",
  REPLY_INQUIRY: "Opens a reply form pre-filled with this visitor's name, email, and inquiry subject.",
  DISPATCH_REPLY: "Sends your response directly to the visitor and marks the inquiry as replied in the ledger.",

  // Universal CMS Actions
  SAVE_AND_PUBLISH: "Saves your changes to Firebase and immediately revalidates the live website so visitors see the update instantly.",
  RESET_CHANGES: "Discards any unsaved modifications in this editor and restores the form back to the current saved database state.",
  CREATE_ITEM: "Opens a form to create and publish a new item in this section.",
  EDIT_ITEM: "Opens the editing form to modify this item's details.",
  DELETE_ITEM: "Permanently deletes this item and removes its associated image files from storage.",
  MOVE_UP: "Moves this item up by one position, changing its display order on the live website.",
  MOVE_DOWN: "Moves this item down by one position, changing its display order on the live website.",

  // Specific Domain Actions
  RESET_CARD_DEFAULTS: "Restores this bento grid slot to its original initial design settings and content.",
  ADD_TECH_SKILL: "Adds this technology badge (e.g. React, Next.js) to the card's floating tech stack pills.",
  REMOVE_TECH_SKILL: "Removes this technology badge from the card.",
  UPLOAD_MEDIA: "Uploads an image file to Firebase Storage and records it in your media ledger.",
  UPLOAD_ASSET: "Uploads an image file to Firebase Storage and records it in your media ledger.",
  SWEEP_ORPHANS: "Scans for unused, unlinked files older than 24 hours and permanently deletes them to save storage space.",

  // Database Lifecycle & Purge (/admin/purge)
  DATABASE_AUDIT: "Scans all root Firestore collections, RTDB nodes, and Upstash Redis keys to calculate exact deletion and preservation counts.",
  DRY_RUN: "Simulates discovery, classification, and planning with zero mutations to preview exact impact.",
  PURGE_DATABASE: "Wipes all disposable development inquiries, chats, and emails, and clears lifecycle-managed Redis cache namespaces while keeping static portfolio content and admin login 100% intact.",
  SEED_STATIC_PILLARS: "Populates all 14 canonical static portfolio content pillars into Firestore and dispatches Realtime CMS sync signals with 0 dummy test data.",
  RESET_DATABASE: "Full environment reset: wipes all dynamic records and static portfolio content to zero while keeping admin authentication 100% intact.",
  RECONCILE_DATABASE: "Audits full-system drift across Firestore, RTDB, Redis, and signals; safely repairs missing or drifted static documents.",
  RESET_AND_RESEED: "Wipes dynamic data and repopulates the development database with realistic synthetic dummy inquiries, chats, and mail records.",

  // Legal Center (/admin/legal)
  LEGAL_PUBLISH: "Atomically publishes the new legal version to the live website, archives the previous version to immutable history, and initializes legal notification jobs if marked material.",
  LEGAL_SAVE_DRAFT: "Saves your working changes privately to the database without modifying the live public website.",
  LEGAL_DISCARD_DRAFT: "Discards private unpublished draft changes and restores the current published state.",
  LEGAL_RESTORE_VERSION: "Loads this historical version into the draft editor so you can review and republish it.",
  LEGAL_RETRY_JOB: "Re-queues failed recipient notifications for this legal update and re-triggers the background processor.",
} as const;

export type ButtonHelpKey = keyof typeof BUTTON_HELP;
