// ===================== SCHEDULE SECTION =====================
// The same sessions the Sessions section lists, laid out as the day runs
// instead of by format: one block per time slot, and inside a slot one row per
// session in room order. A row opens the same panel a session row opens on the
// home page, so the two are the same list read two ways.
//
// A page says where the section goes:
//
//   <div data-schedule></div>
//
// and includes this file BEFORE shared.js, which reads the page as it starts.
// The session panel a row opens is the one the page has in its overlay markup -
// see schedulepreview.html.
//
// Once the page has a speaker list, the section is filled in with:
//
//   buildSchedule(speakers);
//
// A page with no speaker list of its own can let the section fetch one:
//
//   buildScheduleFromSheet();
//
// Anything a page wants to say differently is set on the placeholder:
//
//   <div data-schedule data-title="Schedule" data-note="Subject to change"
//        data-sheet="Sessions2026" data-speakers-sheet="Speakers2026"></div>

const SCHEDULE_DEFAULTS = {
  title: 'Schedule',
  note: '',
  sheet: 'Sessions2026',
  speakersSheet: 'Speakers2026'
};

// The day, in order. A session goes in the last slot that has started by the
// time it begins, so the micro-talks that run four to a slot land with the one
// they belong to rather than needing a slot each. The `label` is what a slot is
// called when it is more than the sessions in it.
const SCHEDULE_SLOTS = [
  { start: '8:00 AM',  end: '9:00 AM',  label: 'Coffee Hour' },
  { start: '9:00 AM',  end: '9:25 AM',  label: 'Introduction' },
  { start: '9:30 AM',  end: '10:15 AM' },
  { start: '10:30 AM', end: '11:15 AM' },
  { start: '11:30 AM', end: '12:15 PM' },
  { start: '12:15 PM', end: '1:45 PM',  label: 'Lunch' },
  { start: '1:45 PM',  end: '2:30 PM' },
  { start: '2:45 PM',  end: '3:30 PM' },
  { start: '3:45 PM',  end: '4:30 PM' },
  { start: '4:45 PM',  end: '5:30 PM' },
  { start: '5:45 PM',  end: '6:30 PM' },
  { start: '6:30 PM',  end: '9:30 PM',  label: 'After-party!' }
];

// The blocks a slot is listed in, in the order it lists them. `key` is what the
// sheet writes in the Room column, unless `rooms` is there to say that several
// of the sheet's rooms belong to the one block. `badge` is the room key panel's
// shorthand for the block, for where the sheet's own is too short to read, and
// `heading` is what the block is called on the page where the format it runs
// under is not the whole story.
//
// A room the sheet uses that is not on this list still gets a block of its own,
// after these, so its sessions stay together rather than scattering.
const SCHEDULE_ROOMS = [
  { key: 'A',  badge: 'AUD', name: 'Auditorium' },
  { key: 'LH', name: 'Lecture Hall' },
  { key: 'AR', name: 'Allen Room' },
  { key: 'NR', name: 'Norcliffe Room' },
  // The roundtables are a room apiece in the sheet - 5A through 5F - but they
  // are the one thing on the schedule: six tables going at once along Level 5.
  // They share a block, listed 5A first, and each row's badge says which table.
  { key: 'L5', rooms: /^5[A-Z]$/, badge: '5A-F', name: 'Roundtables, Level 5' },
  // The breakfast tables, 1A through 1D, run in the Cafe before the day proper
  // opens. Roundtables by format, but they are their own event and say so
  // rather than answering to the word the Level 5 tables go under.
  {
    key: 'L1',
    rooms: /^1[A-Z]$/,
    badge: '1A-D',
    name: 'Café, Level 1',
    heading: 'Women in Games Breakfast Sessions'
  }
];

// "Micro-talk", "micro talk" and "Microtalks" are all the one format
function scheduleFormatKey(format) {
  return String(format || '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
}

// A block of one format running through a slot is a thing with a name, and
// says more with the name above it. The rest of the rooms hold whatever the one
// session in them is, and the title already says what that is.
const SCHEDULE_GROUPS = {
  microtalk: 'Micro-talks',
  roundtable: 'Roundtables'
};

// What the placeholder asked for, over the defaults above
var scheduleConfig = Object.assign({}, SCHEDULE_DEFAULTS);

// ===================== READING THE CLOCK =====================
// The sheet writes a time a few ways - "9:30:00 AM" in the timed columns,
// "1:45 PM" where it was typed by hand. Returns minutes past midnight, or null
// for anything that is not a time.
function scheduleMinutes(text) {
  const parts = String(text || '').trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp])\.?[Mm]\.?$/);
  if (!parts) return null;

  const minute = parseInt(parts[2], 10);
  if (minute > 59) return null;

  let hour = parseInt(parts[1], 10) % 12;
  if (parts[3].toLowerCase() === 'p') hour += 12;

  return hour * 60 + minute;
}

// A roundtable runs twice and carries both of its starts in the one cell -
// "1:45 PM, 2:45 PM" - and means it is on the schedule at both.
function scheduleStarts(cell) {
  const found = [];

  String(cell || '').split(',').forEach(function(part) {
    const at = scheduleMinutes(part);
    if (at !== null && found.indexOf(at) === -1) found.push(at);
  });

  return found.sort(function(a, b) { return a - b; });
}

function scheduleClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return (hour % 12 === 0 ? 12 : hour % 12) + ':' +
    (minute < 10 ? '0' : '') + minute + ' ' + (hour < 12 ? 'AM' : 'PM');
}

// ===================== MARKUP =====================
// The slots are built empty. What goes in them waits on the sheet, which is
// buildSchedule below.
function buildScheduleSection(config) {
  const section = document.createElement('section');
  // No 'reveal' on this one. The scroll reveal in shared.js waits for 15% of a
  // section to be on screen, and a whole day of sessions is taller than any
  // window - 15% of it is never showing, so it would sit at opacity 0 for good.
  section.className = 'section';
  section.id = 'schedule';

  if (config.title) {
    const heading = document.createElement('h2');
    heading.className = 'section__title';
    heading.textContent = config.title;
    section.appendChild(heading);
  }

  // Up from the moment this runs, which is while the page is still parsing, and
  // down once the slots are in. Two sheets have to be fetched and read before
  // there is anything to show, and a couple of seconds of empty page reads as a
  // broken one. role=status so it is spoken as well as shown.
  const status = document.createElement('p');
  status.className = 'schedule-status';
  status.id = 'scheduleStatus';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading...';
  section.appendChild(status);

  const list = document.createElement('div');
  list.className = 'schedule';
  list.id = 'scheduleList';
  section.appendChild(list);

  // The room key, filled in from the rooms the sheet actually used so a room
  // nobody is in this year is not explained to anyone. It is pinned to the
  // corner of the window by the stylesheet, so it comes last in the markup -
  // read straight through, it is a footnote to the day rather than a preamble.
  const legend = document.createElement('ul');
  legend.className = 'schedule-legend';
  legend.id = 'scheduleLegend';
  legend.setAttribute('aria-label', 'Room key');
  legend.hidden = true;
  section.appendChild(legend);

  if (config.note) {
    const note = document.createElement('p');
    note.className = 'section-note schedule-note';
    note.textContent = config.note;
    section.appendChild(note);
  }

  return section;
}

// Put the section in place as this file runs, which is before shared.js reads
// the page.
(function() {
  const placeholder = document.querySelector('[data-schedule]');
  if (!placeholder) return;

  const asked = placeholder.dataset;
  ['title', 'note', 'sheet', 'speakersSheet'].forEach(function(key) {
    if (asked[key] !== undefined) scheduleConfig[key] = asked[key];
  });

  placeholder.parentNode.replaceChild(
    buildScheduleSection(scheduleConfig), placeholder);
})();

// ===================== FILLING IT IN =====================
function buildSchedule(speakers) {
  const section = document.getElementById('schedule');
  const list = document.getElementById('scheduleList');
  const legendEl = document.getElementById('scheduleLegend');
  const statusEl = document.getElementById('scheduleStatus');
  if (!section || !list) return;

  // The wait is over either way. Where the Sessions section can hide itself and
  // let the rest of the home page carry on, this page is only the schedule -
  // it says what went wrong rather than leaving a title over nothing.
  function clearStatus() {
    if (statusEl) statusEl.hidden = true;
  }

  function failStatus() {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.classList.add('schedule-status--failed');
    statusEl.textContent =
      'The schedule could not be loaded. Please try again in a moment.';
  }

  // No speakers means nothing can pass the seat check in loadSessions
  if (!speakers || !speakers.length) {
    failStatus();
    return;
  }

  // The block a room belongs to. Named outright by most of them, matched by
  // pattern for the run of roundtable tables. A block answers to its own key
  // too, which is how the room key panel looks one up without a room in hand.
  function roomEntry(room) {
    return SCHEDULE_ROOMS.filter(function(entry) {
      return entry.key === room || (entry.rooms && entry.rooms.test(room));
    })[0];
  }

  function blockKey(room) {
    const known = roomEntry(room);
    return known ? known.key : room;
  }

  function blockOrder(room) {
    const known = roomEntry(room);
    return known ? SCHEDULE_ROOMS.indexOf(known) : SCHEDULE_ROOMS.length;
  }

  function roomName(room) {
    const known = roomEntry(room);
    return known ? known.name : '';
  }

  // A block holding several rooms lets every row say which of them it is in.
  // One that is a room outright can be renamed whole, which is how the sheet's
  // bare A reaches the page as AUD.
  function roomBadge(room) {
    const known = roomEntry(room);
    if (!known || known.rooms) return room;
    return known.badge || known.key;
  }

  // A slot holds its blocks, a block holds the sessions in it. Both keep the
  // order they are shown in - blocks by the list above, sessions by the clock.
  const slots = SCHEDULE_SLOTS.map(function(def) {
    return {
      def: def,
      startsAt: scheduleMinutes(def.start),
      rooms: new Map()
    };
  });

  // Anything the sheet has not given a time yet, so a session still being
  // placed is visible rather than missing. Goes away once the sheet is filled.
  const untimed = [];
  const blocksSeen = new Map();

  // The last slot that has started by then. A session somehow earlier than the
  // first slot still has to go somewhere, so it goes at the top of the day.
  function slotFor(minutes) {
    let found = slots[0];
    slots.forEach(function(slot) {
      if (slot.startsAt !== null && slot.startsAt <= minutes) found = slot;
    });
    return found;
  }

  function placeIn(slot, session, startsAt, sitting, sittings) {
    const room = session.room || '';
    const key = blockKey(room);
    let block = slot.rooms.get(key);

    if (!block) {
      block = { key: key, order: blockOrder(room), items: [] };
      slot.rooms.set(key, block);
    }

    block.items.push({
      session: session,
      startsAt: startsAt,
      sitting: sitting,
      sittings: sittings
    });

    if (room && !blocksSeen.has(key)) blocksSeen.set(key, blockOrder(room));
  }

  function buildRow(item, showTime) {
    const session = item.session;

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'session-row schedule-row';

    if (session.room) {
      const badge = document.createElement('span');
      badge.className = 'schedule-row__room';
      badge.textContent = roomBadge(session.room);

      const name = roomName(session.room);
      if (name) badge.title = name;
      row.appendChild(badge);
    }

    const at = document.createElement('span');
    at.className = 'schedule-row__time';
    at.textContent = showTime && item.startsAt !== null ?
      scheduleClock(item.startsAt) : '';
    row.appendChild(at);

    const text = document.createElement('span');
    text.className = 'session-row__text';

    const title = document.createElement('span');
    title.className = 'session-row__title';
    title.textContent = session.title;
    text.appendChild(title);

    // Which sitting this row is, for a session the day holds more than once.
    // Nothing to say about the ones that run the once, so nothing is said.
    if (item.sittings > 1) {
      text.appendChild(document.createTextNode(' '));

      const sitting = document.createElement('span');
      sitting.className = 'schedule-row__sitting';
      sitting.textContent = '(' + item.sitting + ' of ' + item.sittings + ')';
      text.appendChild(sitting);
    }

    const names = session.speakers.map(function(speaker) {
      return speaker.name;
    }).join(', ');

    if (names) {
      // A plain space between the two, so a row too narrow to hold both can
      // still break where the title ends
      text.appendChild(document.createTextNode(' '));

      const lineup = document.createElement('span');
      lineup.className = 'session-row__speakers';
      lineup.textContent = names;
      text.appendChild(lineup);
    }

    row.appendChild(text);

    const chevron = document.createElement('span');
    chevron.className = 'session-row__chevron';
    chevron.innerHTML = '&#9654;';
    row.appendChild(chevron);

    row.addEventListener('click', function() {
      openSessionOverlay(session);
    });

    return row;
  }

  function buildHead(timeText, label) {
    const head = document.createElement('h3');
    head.className = 'schedule-slot__head';

    const when = document.createElement('span');
    when.className = 'schedule-slot__time';
    when.textContent = timeText;
    head.appendChild(when);

    if (label) {
      const name = document.createElement('span');
      name.className = 'schedule-slot__label';
      name.textContent = label;
      head.appendChild(name);
    }

    return head;
  }

  // One room's sessions, in clock order. The times are shown when the block
  // holds a session that does not start with the slot - the micro-talks run
  // through a slot four at a time, and the run only reads as a run if every
  // row in it says when it is.
  function buildRoomBlock(group, slot) {
    // The clock leads, since that is what a slot is read down. Rooms break the
    // tie, so a block covering several of them - the roundtable tables all
    // going at once - runs 5A, 5B, 5C rather than however the sheet was typed.
    group.items.sort(function(a, b) {
      if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt;

      const rooms = String(a.session.room).localeCompare(String(b.session.room));
      if (rooms) return rooms;

      return a.session.title.localeCompare(b.session.title);
    });

    const showTimes = group.items.some(function(item) {
      return item.startsAt !== slot.startsAt;
    });

    const block = document.createElement('div');
    block.className = 'schedule-room';
    if (showTimes) block.classList.add('schedule-room--timed');

    const heading = groupHeading(group);
    if (heading) {
      const head = document.createElement('p');
      head.className = 'schedule-room__head';
      head.textContent = heading;
      block.appendChild(head);
    }

    group.items.forEach(function(item) {
      block.appendChild(buildRow(item, showTimes));
    });

    return block;
  }

  // A block that is an event in its own right carries the name it was given.
  // Otherwise the format names it, and only when everything in the block is
  // that one format - the odd lecture sharing a room should not put the rest
  // under the wrong word.
  function groupHeading(group) {
    const entry = roomEntry(group.key);
    if (entry && entry.heading) return entry.heading;

    const format = scheduleFormatKey(group.items[0].session.format);

    const same = group.items.every(function(item) {
      return scheduleFormatKey(item.session.format) === format;
    });

    return same ? (SCHEDULE_GROUPS[format] || '') : '';
  }

  function buildSlot(slot) {
    const rooms = Array.from(slot.rooms.values()).sort(function(a, b) {
      return a.order - b.order;
    });

    const block = document.createElement('section');
    block.className = 'schedule-slot';
    block.id = 'slot-' + slot.def.start.replace(/[^0-9]/g, '') +
      (slot.def.start.indexOf('PM') !== -1 ? 'pm' : 'am');

    block.appendChild(buildHead(
      slot.def.start + ' - ' + slot.def.end, slot.def.label));

    rooms.forEach(function(room) {
      block.appendChild(buildRoomBlock(room, slot));
    });

    return block;
  }

  function buildUntimedSlot() {
    const block = document.createElement('section');
    block.className = 'schedule-slot';
    block.appendChild(buildHead('Time to be announced', ''));

    const rows = document.createElement('div');
    rows.className = 'schedule-room';
    block.appendChild(rows);

    untimed
      .sort(function(a, b) { return a.title.localeCompare(b.title); })
      .forEach(function(session) {
        rows.appendChild(buildRow(
          { session: session, startsAt: null, sitting: 1, sittings: 1 }, false));
      });

    return block;
  }

  // One line per block rather than per room, so the six roundtable tables are
  // explained once, as 5A-F, instead of six times over.
  function buildLegend() {
    if (!legendEl || !blocksSeen.size) return;

    Array.from(blocksSeen.keys())
      .sort(function(a, b) { return blocksSeen.get(a) - blocksSeen.get(b); })
      .forEach(function(key) {
        const entry = roomEntry(key);
        const name = entry ? entry.name : '';
        if (!name) return;

        const item = document.createElement('li');
        item.className = 'schedule-legend__item';

        const badge = document.createElement('span');
        badge.className = 'schedule-row__room';
        badge.textContent = entry.badge || entry.key;
        item.appendChild(badge);

        const label = document.createElement('span');
        label.className = 'schedule-legend__name';
        label.textContent = name;
        item.appendChild(label);

        legendEl.appendChild(item);
      });

    legendEl.hidden = !legendEl.children.length;
  }

  const loading = loadSessions(scheduleConfig.sheet, speakers, function(sessions) {
    if (!sessions.length) {
      failStatus();
      return;
    }

    sessions.forEach(function(session) {
      const starts = scheduleStarts(session.time);

      if (!starts.length) {
        untimed.push(session);
        return;
      }

      // A roundtable that runs twice is the one session in two slots, so both
      // rows open the same panel. Each row is told which of the sittings it is,
      // so somebody who misses the first can see there is a second.
      starts.forEach(function(startsAt, at) {
        placeIn(slotFor(startsAt), session, startsAt, at + 1, starts.length);
      });
    });

    buildLegend();

    slots.forEach(function(slot) {
      list.appendChild(buildSlot(slot));
    });

    if (untimed.length) list.appendChild(buildUntimedSlot());

    // The day is on the page, so the wait is over
    clearStatus();

    // The arrows on the panel step through the sessions in sheet order, which
    // on this page should be the order the page is read in. Sorting in place -
    // it is the same array shared.js keeps as `sessions`.
    sessions.sort(function(a, b) {
      const at = scheduleStarts(a.time);
      const bt = scheduleStarts(b.time);
      const first = (at.length ? at[0] : Infinity) - (bt.length ? bt[0] : Infinity);
      if (first) return first;

      const blocks = blockOrder(a.room) - blockOrder(b.room);
      if (blocks) return blocks;

      const rooms = String(a.room).localeCompare(String(b.room));
      if (rooms) return rooms;

      return a.title.localeCompare(b.title);
    });
  }, { requireSynopsis: false });

  if (loading && typeof loading.catch === 'function') {
    loading.catch(function(err) {
      console.error('Could not load the session sheet', err);
      failStatus();
    });
  }
}

// For a page that is only showing the schedule and so has no speaker list of
// its own.
function buildScheduleFromSheet() {
  const loading = loadSpeakers(scheduleConfig.speakersSheet, function(speakers) {
    buildSchedule(speakers);
  });

  if (loading && typeof loading.catch === 'function') {
    loading.catch(function(err) {
      console.error('Could not load the speaker sheet', err);
      // Sessions are checked against the speaker list, so without it the
      // schedule cannot be shown either. Say so by hiding, not by sitting empty.
      buildSchedule([]);
    });
  }
}
