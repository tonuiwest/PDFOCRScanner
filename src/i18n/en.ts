// Source strings. Other languages translate these keys; missing keys fall back to English.
// {name} placeholders are filled in by t().
export const en = {
  // common
  cancel: 'Cancel', save: 'Save', delete: 'Delete', back: 'Back', rename: 'Rename', open: 'Open', copy: 'Copy',
  continue: 'Continue', skip: 'Skip', later: 'Later', notNow: 'Not now', discard: 'Discard',
  unknownError: 'Unknown error', loadingAd: 'Loading ad…', watchAd: 'Watch ad', watchNext: 'Watch next',
  noAdTitle: 'No ad available', noAdBody: 'Please try again in a little while.',
  noAdBodySaved: 'Please try again in a little while. Your progress is saved.',
  readingText: 'Reading text…', readingTextProgress: 'Reading text… {done}/{total}',
  noTextTitle: 'No text found', readTextFailed: 'Could not read text', shareFailed: 'Could not share',
  pdf: 'PDF', text: 'Text', documents: 'Documents', settings: 'Settings', extractText: 'Extract text',
  extractedText: 'Extracted text', a4: 'A4', letter: 'Letter',

  // time & sizes
  justNow: 'Just now', minAgo: '{n} min ago', hAgo: '{n} h ago', yesterday: 'Yesterday', daysAgo: '{n} days ago',
  page1: '1 page', pagesN: '{n} pages', file1: '1 file', filesN: '{n} files', defaultDocName: 'Scan {date}',

  // home
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
  appName: 'PDF OCR Scanner', autoEdge: 'AUTO EDGE DETECT', scanDocument: 'Scan document',
  heroSub: 'Auto crop, multi-page PDF and text recognition', startScanning: 'Start scanning',
  photosToPdf: 'Photos to PDF', recent: 'Recent', seeAll: 'See all ({n})',
  noDocsTitle: 'No documents yet', noDocsHome: 'Your scans appear here. Tap Scan document to create your first PDF.',
  noTextPhoto: 'Try a sharper, well-lit photo with the text facing the camera.',

  // premium
  premiumBanner: '{n}-minute Premium · no ads', premiumActive: 'Premium active', premiumActiveLeft: 'Premium active · {n} min left',
  minLeft: '{n} min left', watchNAds: 'Watch {n} ads', continueProgress: 'Continue {done}/{total}', watchedProgress: '{done}/{total} watched',
  premiumTitle: 'Get {min} minutes of Premium',
  premiumBody: 'Watch {n} short video ads to unlock {min} minutes of Premium — no ads, uninterrupted scanning.',
  premiumProgressLine: 'Progress: {done} of {total} watched.',
  premiumStepTitle: '{done} of {total} done',
  premiumStepBody: 'Watch {left} more to unlock {min} minutes of Premium. Your progress is saved.',
  premiumUnlocked: 'Premium unlocked for {min} minutes', premiumRow: '{min}-minute Premium',

  // documents
  scanNewDocument: 'Scan new document', noDocsBody: 'Scan paper documents or convert photos into clean, shareable PDFs.',
  scanADocument: 'Scan a document', searchPlaceholder: 'Search names and text', noMatch: 'No documents match "{q}"',
  sortNewest: 'Newest', sortOldest: 'Oldest', sortName: 'Name', sortBy: 'Sort by {s}', moreOptions: 'More options for {name}',
  sharePdf: 'Share PDF', viewText: 'View extracted text', renameDocument: 'Rename document', renamed: 'Renamed',
  deleteDocTitle: 'Delete document?', deleteDocBody: '"{name}" will be permanently removed from this device.',
  docDeleted: 'Document deleted', noViewerTitle: 'No PDF viewer found',
  noViewerBody: 'Install a PDF viewer app, or use Share to send the file to another app.',
  sharingUnavailable: 'Sharing is not available on this device.',

  // editor
  discardTitle: 'Discard scan?', discardBody: 'Your pages have not been saved yet.', keepEditing: 'Keep editing',
  pageLimitTitle: 'Page limit reached', pageLimitBody: 'A document can have up to {n} pages.',
  rotateFailed: 'Could not rotate', deleteLastTitle: 'Delete last page?', deleteLastBody: 'This will discard the scan.',
  hdTitle: 'Unlock HD export', hdBody: 'Watch a short ad to export this document in high resolution. You can skip and keep Standard quality.',
  hdUnlocked: 'HD export unlocked', noTextPages: 'No readable text was detected on these pages.',
  creatingPdf: 'Creating PDF…', pdfSaved: 'PDF saved', pdfFailed: 'Could not create PDF',
  moveEarlier: 'Move earlier', rotate: 'Rotate', deletePage: 'Delete page', moveLater: 'Move later',
  scanMore: 'Scan more', addPhotos: 'Add photos', pageSize: 'Page size', quality: 'Quality', standard: 'Standard', hd: 'HD',
  saveText: 'Save extracted text', saveTextHint: 'Recognise text so you can copy it later', savePdf: 'Save PDF', documentName: 'Document name',

  // text screen
  copied: 'Copied to clipboard', textSaved: 'Text saved', saveEdits: 'Save edits', noText: 'No text',
  wordsChars: '{w} words · {c} characters', editHint: 'Tap the text to edit before copying or sharing.', shareTxt: 'Share .txt',

  // capture
  scannerUnavailable: 'Scanner unavailable', scannerStartFailed: 'Could not start the document scanner.', photosFailed: 'Could not open photos',

  // settings
  appearance: 'Appearance', theme: 'Theme', light: 'Light', dark: 'Dark', auto: 'Auto', accentColour: 'Accent colour',
  language: 'Language', languageAuto: 'Device language', scanning: 'Scanning', defaultPageSize: 'Default page size',
  textRecognition: 'Text recognition', ocrScript: 'Text script', onDevice: 'On-device · private',
  premium: 'Premium', privacyChoices: 'Privacy & ad choices', storage: 'Storage', deleteAll: 'Delete all documents',
  deleteAllTitle: 'Delete all documents?', deleteAllBody: 'Every saved PDF will be permanently removed from this device.',
  deleteAllConfirm: 'Delete all', allDeleted: 'All documents deleted', tipsTitle: 'Tips for better scans',
  tip1: 'Use even lighting and avoid shadows across the page.',
  tip2: 'Place the page on a dark, contrasting surface for the best edge detection.',
  tip3: 'Hold the phone parallel to the page to keep text straight.',
  tip4: 'Clean, printed fonts give the most accurate text recognition.',
  about: 'About', rateApp: 'Rate the app', shareApp: 'Share with friends', version: 'Version',
  shareAppMessage: 'I scan documents to PDF and copy text with PDF OCR Scanner: {url}',
  scriptLatin: 'Latin (English, Spanish…)', scriptDevanagari: 'Devanagari (Hindi, Marathi…)', scriptChinese: 'Chinese',
  scriptJapanese: 'Japanese', scriptKorean: 'Korean',
  accentOcean: 'Ocean', accentViolet: 'Violet', accentTeal: 'Teal', accentForest: 'Forest', accentSunset: 'Sunset',
  accentRose: 'Rose', accentGraphite: 'Graphite',
};

export type StringKey = keyof typeof en;
export type Dict = Partial<Record<StringKey, string>>;
