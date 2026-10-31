// Outline icons (24×24, stroke = currentColor). Hand-drawn for this app.
const svg = (body) =>
  `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  flame: svg('<path d="M12 21c-3.6 0-6.5-2.6-6.5-6.2 0-2.6 1.5-4.4 3-5.9.3 1.6 1.2 2.6 2.2 3C10.3 8.6 11.6 5.5 14 3c.4 3 2.1 4.6 3.4 6.3A7.4 7.4 0 0 1 18.5 14.8C18.5 18.4 15.6 21 12 21z"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  trophy: svg('<path d="M8 4.5h8v4.5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3.5M8.5 20h7M9.5 20l.5-3.5h4l.5 3.5"/>'),
  note: svg('<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  sliders: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  home: svg('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
  cards: svg('<rect x="7" y="3.5" width="12" height="15" rx="2.5"/><path d="M5 7v11.5A2.5 2.5 0 0 0 7.5 21H15"/>'),
  timer: svg('<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 2.5h4M12 2.5v4M18.5 6.5l1.5-1.5"/>'),
  piano: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M12 5v14M16 5v14"/><path d="M7 5v7h2V5M15 5v7h2V5" fill="currentColor" stroke-width="0"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>'),
  play: svg('<path d="M8 5.5v13l10-6.5z"/>'),
  camera: svg('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>'),
  book: svg('<path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13"/>'),
  metronome: svg('<path d="M9 3.5h6l3.5 17h-13zM12 15l4.5-8M8.2 15h7.6"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
