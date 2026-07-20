const DATA_URL = 'data/cycle-data.json';

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

  setupTabs();
  setupDetailPanel();
  renderToday();

  calendarViewDate = startOfMonth(new Date());
  setupCalendarNav();
  renderCalendar();
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

function getCycleInfo(date) {
  const anchor = parseAnchorDate(cycleData.anchorDate);
  const cycleLength = cycleData.cycleSettings.averageCycleLengthDays;
  const periodLength = cycleData.cycleSettings.averagePeriodLengthDays;

  const diff = daysBetween(anchor, date);
  const mod = ((diff % cycleLength) + cycleLength) % cycleLength; // always 0..cycleLength-1
  const cycleDay = mod + 1; // 1-indexed

  const ovulationDay = Math.max(1, cycleLength - 13); // ~14 days before next period
  const ovulationWindowStart = ovulationDay - 1;
  const ovulationWindowEnd = ovulationDay + 1;

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

  return { cycleDay, phase, isPeriodDay, isOvulationDay };
}

function renderToday() {
  const info = getCycleInfo(new Date());
  const phase = info.phase;
  const def = cycleData.phaseDefinitions[phase];
  const detail = cycleData.detailedTodayContent[phase];
  const support = cycleData.supportNotes[phase] && cycleData.supportNotes[phase][0];
  const playful = cycleData.playfulLines[phase] && cycleData.playfulLines[phase][0];

  document.getElementById('phase-name').textContent = def.displayName;
  document.getElementById('cycle-day').textContent =
    `Den cyklu ${info.cycleDay} z ${cycleData.cycleSettings.averageCycleLengthDays}`;
  document.getElementById('today-summary').textContent = cycleData.shortTodaySummaries[phase];
  document.getElementById('support-line').textContent = support || '';

  document.getElementById('detail-title').textContent = def.displayName;
  document.getElementById('detail-emotional').textContent = detail.emotionalState;
  document.getElementById('detail-physical').textContent = detail.physicalState;
  document.getElementById('detail-energy').textContent = detail.energy;
  document.getElementById('detail-explanation').textContent = detail.detailedExplanation;
  document.getElementById('detail-playful').textContent = playful || '';
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

function setupDetailPanel() {
  const btn = document.getElementById('more-btn');
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('close-btn');

  function open() {
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
    btn.focus();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
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
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (info.isPeriodDay) cell.classList.add('is-period');
    if (info.isOvulationDay) cell.classList.add('is-ovulation');
    if (daysBetween(today, date) === 0) cell.classList.add('is-today');

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = String(d);
    cell.appendChild(number);
    grid.appendChild(cell);
  }

  const today0 = startOfMonth(new Date());
  const maxMonth = new Date(today0.getFullYear(), today0.getMonth() + 12, 1);
  document.getElementById('cal-prev').disabled = startOfMonth(calendarViewDate) <= today0;
  document.getElementById('cal-next').disabled = startOfMonth(calendarViewDate) >= maxMonth;
}

init();
