const DATA_URL = `data/cycle-data.json?v=${Date.now()}`;

let cycleData = null;
let calendarViewDate = null;

const MONTH_NAMES_CS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const DAY_NAMES_CS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('Network response was not ok');
    cycleData = await res.json();
  } catch (err) {
    document.getElementById('data-error').classList.remove('is-hidden');
    return;
  }


  // Each piece renders independently: if one crashes (e.g. a file that
  // wasn't uploaded together with the others leaves some data missing),
  // it's logged to the console instead of silently breaking everything
  // that comes after it in this list.
  safeRun(setupTabs);
  safeRun(setupDetailPanel);
  safeRun(renderToday);
  safeRun(renderMoodChart);

  calendarViewDate = startOfMonth(new Date());
  safeRun(setupCalendarNav);
  safeRun(renderCalendar);
}

function safeRun(fn) {
  try {
    fn();
  } catch (err) {
    console.error(`${fn.name} failed:`, err);
  }
}

function parseAnchorDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bMid - aMid) / msPerDay);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDateCs(date) {
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

// Picks one of several hand-written variants of a line, rotating by cycle
// number so the wording changes cycle to cycle without ever needing manual
// updates. Falls back gracefully if a field only has a single string.
function pickVariant(value, seed) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    const idx = ((seed % value.length) + value.length) % value.length;
    return value[idx];
  }
  return value || '';
}

// Pure day-number version of the phase boundaries, shared by getCycleInfo
// (calendar/detail views) and the mood chart, so the chart's phase bands
// can never drift out of sync with the calendar's phase coloring.
function phaseForCycleDay(cycleDay, periodLength, cycleLength) {
  const ovulationDay = Math.max(1, cycleLength - 13); // last day of the fertile window (13 days before next period)
  // Ovulation window: a 3-day window ending on ovulationDay (e.g. days 13-15 of a 28-day cycle)
  const ovulationWindowStart = Math.max(1, ovulationDay - 2);
  const ovulationWindowEnd = ovulationDay;

  const isPeriodDay = cycleDay <= periodLength;
  const isOvulationDay = cycleDay >= ovulationWindowStart && cycleDay <= ovulationWindowEnd;

  let phase;
  if (isPeriodDay) {
    phase = 'menstrual';
  } else if (isOvulationDay) {
    phase = 'ovulation';
  } else if (cycleDay < ovulationWindowStart) {
    phase = 'follicular';
  } else {
    phase = 'luteal';
  }

  return { phase, isPeriodDay, isOvulationDay, ovulationWindowStart, ovulationWindowEnd };
}

function getCycleInfo(date) {
  const anchor = parseAnchorDate(cycleData.anchorDate);
  const cycleLength = cycleData.cycleSettings.averageCycleLengthDays;
  const periodLength = cycleData.cycleSettings.averagePeriodLengthDays;

  const diff = daysBetween(anchor, date);
  const mod = ((diff % cycleLength) + cycleLength) % cycleLength; // always 0..cycleLength-1
  const cycleDay = mod + 1; // 1-indexed

  const { phase, isPeriodDay, isOvulationDay } = phaseForCycleDay(cycleDay, periodLength, cycleLength);

  // Days since the anchor date. Used to rotate between the hand-written text
  // variants so the wording changes every single day (never repeating on two
  // consecutive days), not just once per ~28-day cycle.
  const variantSeed = diff;

  return { cycleDay, phase, isPeriodDay, isOvulationDay, variantSeed };
}

// Wraps the mood anchors around both ends of the cycle so day 1 blends
// smoothly from the last anchor of the previous cycle, and the last day
// blends smoothly into day 1 of the next one (no hard jump at the seam).
function buildExtendedMoodAnchors(anchors, cycleLength) {
  const sorted = [...anchors].sort((a, b) => a.day - b.day);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return [
    { day: last.day - cycleLength, value: last.value },
    ...sorted,
    { day: first.day + cycleLength, value: first.value }
  ];
}

// Smoothly eases between two neighboring anchors (ease-in-out) instead of a
// straight line, so the curve reads as an organic wave rather than a
// connect-the-dots zigzag.
function moodValueForDay(day, extendedAnchors) {
  for (let i = 0; i < extendedAnchors.length - 1; i++) {
    const a = extendedAnchors[i];
    const b = extendedAnchors[i + 1];
    if (day >= a.day && day <= b.day) {
      const t = b.day === a.day ? 0 : (day - a.day) / (b.day - a.day);
      const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
      return a.value + (b.value - a.value) * smoothT;
    }
  }
  return extendedAnchors[extendedAnchors.length - 1].value;
}

function renderMoodChart() {
  const card = document.querySelector('.mood-card');
  const hasAnchors = Array.isArray(cycleData.moodCurveAnchors) && cycleData.moodCurveAnchors.length >= 2;
  if (!hasAnchors) {
    // Data for this feature isn't present (e.g. an older data file got
    // uploaded on its own) — hide the card cleanly instead of showing a
    // title and legend with a blank gap where the chart should be.
    if (card) card.style.display = 'none';
    return;
  }
  if (card) card.style.display = '';

  const cycleLength = cycleData.cycleSettings.averageCycleLengthDays;
  const periodLength = cycleData.cycleSettings.averagePeriodLengthDays;
  const extended = buildExtendedMoodAnchors(cycleData.moodCurveAnchors, cycleLength);
  const todayCycleDay = getCycleInfo(new Date()).cycleDay;

  const width = 320;
  const height = 130;
  const padX = 6;
  const padTop = 14;
  const padBottom = 22;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const xForDay = (day) => padX + ((day - 1) / (cycleLength - 1)) * chartW;
  const yForValue = (value) => padTop + ((100 - value) / 100) * chartH;

  const points = [];
  for (let day = 1; day <= cycleLength; day++) {
    points.push({ day, value: moodValueForDay(day, extended) });
  }

  // Phase-colored background bands, using the exact same boundaries as the
  // calendar so the chart never disagrees with it.
  const bandColor = {
    menstrual: 'var(--color-dark)',
    follicular: 'rgba(201, 166, 122, 0.35)',
    ovulation: 'var(--color-accent)',
    luteal: 'rgba(43, 38, 34, 0.12)'
  };
  const bandOpacity = { menstrual: 0.24, follicular: 1, ovulation: 0.5, luteal: 1 };
  let bandsSvg = '';
  let segStart = 1;
  let segPhase = phaseForCycleDay(1, periodLength, cycleLength).phase;
  for (let day = 2; day <= cycleLength + 1; day++) {
    const phase = day <= cycleLength ? phaseForCycleDay(day, periodLength, cycleLength).phase : null;
    if (phase !== segPhase) {
      const x1 = xForDay(segStart);
      const x2 = day <= cycleLength ? xForDay(day) : width - padX;
      bandsSvg += `<rect x="${x1.toFixed(1)}" y="0" width="${Math.max(0, x2 - x1).toFixed(1)}" height="${height}" fill="${bandColor[segPhase]}" opacity="${bandOpacity[segPhase]}"></rect>`;
      segStart = day;
      segPhase = phase;
    }
  }

  const linePoints = points.map(p => `${xForDay(p.day).toFixed(1)},${yForValue(p.value).toFixed(1)}`).join(' ');
  const areaPoints = `${xForDay(1).toFixed(1)},${(height - padBottom).toFixed(1)} ${linePoints} ${xForDay(cycleLength).toFixed(1)},${(height - padBottom).toFixed(1)}`;

  const todayValue = moodValueForDay(todayCycleDay, extended);
  const todayX = xForDay(todayCycleDay);
  const todayY = yForValue(todayValue);

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" class="mood-chart-svg" role="img" aria-label="Graf nálady během cyklu, dnešek zvýrazněn tečkou">
      <g class="mood-bands">${bandsSvg}</g>
      <polygon points="${areaPoints}" class="mood-area"></polygon>
      <polyline points="${linePoints}" class="mood-line"></polyline>
      <line x1="${todayX.toFixed(1)}" y1="${todayY.toFixed(1)}" x2="${todayX.toFixed(1)}" y2="${(height - padBottom).toFixed(1)}" class="mood-today-guide"></line>
      <circle cx="${todayX.toFixed(1)}" cy="${todayY.toFixed(1)}" r="5.5" class="mood-today-dot"></circle>
      <text x="${todayX.toFixed(1)}" y="${height - 6}" class="mood-today-label" text-anchor="middle">dnes</text>
    </svg>
  `;

  document.getElementById('mood-chart').innerHTML = svg;
}

function renderToday() {
  const info = getCycleInfo(new Date());
  const phase = info.phase;
  const def = cycleData.phaseDefinitions[phase];

  document.getElementById('phase-name').textContent = def.displayName;
  document.getElementById('cycle-day').textContent =
    `Den cyklu ${info.cycleDay} z ${cycleData.cycleSettings.averageCycleLengthDays}`;
  document.getElementById('today-summary').textContent =
    pickVariant(cycleData.shortTodaySummaries[phase], info.variantSeed);
}

function populateDetailPanel(date) {
  const info = getCycleInfo(date);
  const phase = info.phase;
  const def = cycleData.phaseDefinitions[phase];
  const detail = cycleData.detailedTodayContent[phase];
  const seed = info.variantSeed;

  document.getElementById('detail-title').textContent = def.displayName;
  document.getElementById('detail-date').textContent = formatDateCs(date);
  document.getElementById('detail-emotional').textContent = pickVariant(detail.emotionalState, seed);
  document.getElementById('detail-physical').textContent = pickVariant(detail.physicalState, seed);
  document.getElementById('detail-energy').textContent = pickVariant(detail.energy, seed);
  document.getElementById('detail-explanation').textContent = detail.detailedExplanation;
  document.getElementById('detail-contraception').textContent = detail.contraceptionExplanation;
  document.getElementById('playful-line').textContent = pickVariant(cycleData.playfulLines[phase], seed);
  document.getElementById('disclaimer').textContent = cycleData.disclaimer;
}

function setupTabs() {
  const tabToday = document.getElementById('tab-today');
  const tabCal = document.getElementById('tab-calendar');
  const viewToday = document.getElementById('view-today');
  const viewCal = document.getElementById('view-calendar');

  function activate(which) {
    const showToday = which === 'today';
    tabToday.classList.toggle('is-active', showToday);
    tabCal.classList.toggle('is-active', !showToday);
    tabToday.setAttribute('aria-selected', String(showToday));
    tabCal.setAttribute('aria-selected', String(!showToday));
    viewToday.classList.toggle('is-hidden', !showToday);
    viewCal.classList.toggle('is-hidden', showToday);
  }

  tabToday.addEventListener('click', () => activate('today'));
  tabCal.addEventListener('click', () => activate('calendar'));
}

let openDetailForDate = null;

function setupDetailPanel() {
  const btn = document.getElementById('more-btn');
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('close-btn');
  let lastFocused = null;

  function open(date) {
    populateDetailPanel(date);
    lastFocused = document.activeElement;
    panel.classList.add('is-open');
    overlay.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    closeBtn.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  btn.addEventListener('click', () => open(new Date()));
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  openDetailForDate = open;
}

function setupCalendarNav() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    const today = startOfMonth(new Date());
    const prev = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
    if (prev >= today) {
      calendarViewDate = prev;
      renderCalendar();
    }
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    const today = startOfMonth(new Date());
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + 12, 1);
    const next = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    if (next <= maxMonth) {
      calendarViewDate = next;
      renderCalendar();
    }
  });
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const label = document.getElementById('cal-month-label');
  label.textContent = `${MONTH_NAMES_CS[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()}`;

  DAY_NAMES_CS.forEach(name => {
    const cell = document.createElement('div');
    cell.className = 'day-name';
    cell.textContent = name;
    grid.appendChild(cell);
  });

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7; // Monday-first week

  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-cell is-empty';
    grid.appendChild(blank);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const info = getCycleInfo(date);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `day-cell is-${info.phase}`;
    if (daysBetween(today, date) === 0) cell.classList.add('is-today');

    const def = cycleData.phaseDefinitions[info.phase];
    cell.setAttribute('aria-label', `${d}. ${MONTH_NAMES_CS[month]} – ${def.displayName}, den cyklu ${info.cycleDay}`);

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = String(d);
    cell.appendChild(number);

    cell.addEventListener('click', () => {
      if (openDetailForDate) openDetailForDate(date);
    });

    grid.appendChild(cell);
  }

  const today0 = startOfMonth(new Date());
  const maxMonth = new Date(today0.getFullYear(), today0.getMonth() + 12, 1);
  document.getElementById('cal-prev').disabled = startOfMonth(calendarViewDate) <= today0;
  document.getElementById('cal-next').disabled = startOfMonth(calendarViewDate) >= maxMonth;
}

init();
