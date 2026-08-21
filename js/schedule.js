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
  {
    key: 'L5',
    rooms: /^5[A-Z]$/,
    badge: '5A-F',
    name: 'Roundtables, Level 5',
    place: 'Table '
  },
  // The breakfast tables, 1A through 1D, run in the Cafe before the day proper
  // opens. Roundtables by format, but they are their own event and say so
  // rather than answering to the word the Level 5 tables go under.
  //
  // 1A to 1D and no further: the rest of Level 1 is other rooms holding other
  // things, and 1F is the Creative Clinic. js/sessions.js keeps a copy of this
  // range for the session list, and the two have to say the same thing.
  {
    key: 'L1',
    rooms: /^1[A-D]$/,
    badge: '1A-D',
    name: 'Café, Level 1',
    place: 'Café Table ',
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

// ===================== FIXTURES =====================
// What the day holds that the sheet does not. Nobody is speaking at these, so
// they carry their own room, place and hours rather than being looked up -
// which is also what keeps them out of the room key and out of the session
// list, where they would be noise rather than sessions.
//
// `at` names the slots a fixture sits in and which end of each it sits at.
// `everySlot` puts one at the foot of every slot except the ones it names, and
// `from`/`until` narrow that to the slots starting inside a stretch of the day.
//
// Fixtures sharing a `group` share a block, in the order they are written here,
// which is how the Creative Clinic comes to sit under the playtest floor. The
// standing group is gathered into a section of its own at the foot of a day
// shown whole, rather than repeating under all twelve slots.
const SCHEDULE_FIXTURES = [
  {
    title: 'Coffee in the 2nd Floor Lobby',
    synopsis: 'Coffee is sponsored by Phantom Friends and is available from ' +
      '8:00-10:30am in the second floor lobby outside of the Auditorium doors.',
    room: 'L2',
    place: 'Level 2 Lobby',
    when: '8:00-10:30am',
    at: [
      { start: '8:00 AM', edge: 'top' },
      { start: '9:00 AM', edge: 'bottom' },
      // The one slot where it needs saying which of the blocks is which
      { start: '9:30 AM', edge: 'bottom', heading: 'Coffee' }
    ]
  },
  {
    title: 'Playtesting Club / Bring Your Own Laptop Area',
    synopsis: "Bring your own laptop and show off what you've been working " +
      "on, or just come stroll around and check out what the community's been " +
      "up to. This is first-come, first served, and there's plenty of space. " +
      "If you can't find a spot, try again later, as there's plenty else to " +
      "enjoy at the conference!",
    room: 'L1',
    place: 'Level 1 Lobby',
    when: '8:00am-9:30pm',
    heading: 'All Day',
    group: 'standing',
    everySlot: true,
    // Lunch has the note below to make instead
    except: ['12:15 PM']
  },
  {
    title: 'Creative Clinic',
    synopsis: 'Have a game, pitch, or prototype in the works? Stop by the Creative ' +
      'Clinic for an opportunity to get dedicated, 1-on-1 consultations with ' +
      'seasoned industry veterans. Whether you need hands-on feedback on game ' +
      'design, strategic advice on business and publishing, marketing ' +
      'direction, or production guidance, our roster of experts are here to ' +
      'help you solve tough roadblocks and bring your vision to life.\n' +
      'Take advantage of this unique opportunity to get tailored, actionable ' +
      'feedback - whether you schedule a session in advance or drop in during ' +
      'the event!',
    room: '1F',
    when: '10:00am-5:00pm',
    // Under the playtest floor, in the slots that start inside its hours
    group: 'standing',
    everySlot: true,
    except: ['12:15 PM'],
    from: '10:00 AM',
    until: '5:00 PM'
  },
  {
    title: 'Speed Networking',
    room: '1A',
    place: 'Level 1 Café',
    when: '7:00-8:00pm',
    at: [{ start: '6:30 PM', edge: 'bottom' }]
  }
];

// The fixtures gathered under one heading at the foot of a day shown whole
const SCHEDULE_STANDING = { group: 'standing', heading: 'All Day' };

// A slot with something to say and nothing on. Page text rather than a card,
// since there is nothing to open.
const SCHEDULE_NOTES = [
  {
    start: '12:15 PM',
    text: 'Lunch is not served within McCaw Hall, so we encourage you to ' +
      'check out some of the wonderful options nearby! Want a quick bite? ' +
      'Check out the many food service venues within the Seattle Center Armory.'
  }
];

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

// The rooms a session runs in, in the order the sheet lists them
function scheduleRooms(cell) {
  return String(cell || '').split(',')
    .map(function(part) { return part.trim(); })
    .filter(Boolean);
}

// A roundtable runs twice and carries both of its sittings in the one pair of
// cells: Time "10:30 AM, 11:30 AM" against Room "5A, 5D" means 10:30 at 5A and
// 11:30 at 5D. A single room is the same room for every sitting, which is the
// usual case - one table, twice. Returns one sitting per start the Time cell
// can be read for, paired off by position and then put in clock order, so a
// cell written back to front still hands each start the room beside it.
function scheduleSittings(timeCell, roomCell) {
  const rooms = scheduleRooms(roomCell);
  const found = [];

  String(timeCell || '').split(',').forEach(function(part, at) {
    const startsAt = scheduleMinutes(part);
    if (startsAt === null) return;

    const already = found.some(function(sitting) {
      return sitting.startsAt === startsAt;
    });
    if (already) return;

    found.push({
      startsAt: startsAt,
      // One room covers the lot. Several and they are taken in turn, and a
      // sheet naming fewer rooms than sittings stays put in the last of them.
      room: rooms.length < 2 ? (rooms[0] || '') :
        (rooms[at] || rooms[rooms.length - 1])
    });
  });

  return found.sort(function(a, b) { return a.startsAt - b.startsAt; });
}

function scheduleClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return (hour % 12 === 0 ? 12 : hour % 12) + ':' +
    (minute < 10 ? '0' : '') + minute + ' ' + (hour < 12 ? 'AM' : 'PM');
}

// ===================== ROOMS =====================
// The block a room belongs to. Named outright by most of them, matched by
// pattern for the run of roundtable tables. A block answers to its own key too,
// which is how the room key panel looks one up without a room in hand.
function scheduleRoomEntry(room) {
  return SCHEDULE_ROOMS.filter(function(entry) {
    return entry.key === room || (entry.rooms && entry.rooms.test(room));
  })[0];
}

function scheduleBlockKey(room) {
  const known = scheduleRoomEntry(room);
  return known ? known.key : room;
}

function scheduleBlockOrder(room) {
  const known = scheduleRoomEntry(room);
  return known ? SCHEDULE_ROOMS.indexOf(known) : SCHEDULE_ROOMS.length;
}

function scheduleRoomName(room) {
  const known = scheduleRoomEntry(room);
  return known ? known.name : '';
}

// A block holding several rooms lets every row say which of them it is in. One
// that is a room outright can be renamed whole, which is how the sheet's bare A
// reaches the page as AUD.
function scheduleRoomBadge(room) {
  const known = scheduleRoomEntry(room);
  if (!known || known.rooms) return room;
  return known.badge || known.key;
}

// Where a session is, said the way somebody would say it out loud: the room's
// own name where the block is one room, and which table where it is a run of
// them - "Allen Room", "Table 5D".
function scheduleRoomPlace(room) {
  const known = scheduleRoomEntry(room);
  if (!known) return room;
  if (!known.rooms) return known.name || known.key;
  return (known.place || '') + room;
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
  status.className = 'section-status';
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

// The label a slot wears on a tab. The am or pm is only worth saying twice
// when the slot crosses from the one to the other.
function scheduleSlotLabel(def) {
  const from = String(def.start).trim().split(/\s+/);
  const to = String(def.end).trim().split(/\s+/);
  const crosses = (from[1] || '').toUpperCase() !== (to[1] || '').toUpperCase();

  return (crosses ? from.join('').toLowerCase() : from[0]) +
    '-' + to.join('').toLowerCase();
}

// The key the Show All tab goes under, which is no slot in particular
const SCHEDULE_ALL = 'all';

// The slot a time belongs to: the last one that has started by then. The
// schedule works this out again while it lays the day out, over its own copy of
// the slots; this is the same question asked from outside, by the panel.
function scheduleSlotFor(minutes) {
  let found = SCHEDULE_SLOTS[0];

  SCHEDULE_SLOTS.forEach(function(def) {
    const at = scheduleMinutes(def.start);
    if (at !== null && at <= minutes) found = def;
  });

  return found;
}

// When and where a session runs, for the line above its title in the panel:
//
//   ['10:30-11:15am', 'Allen Room']
//   ['4:45-5:30pm & 5:45-6:30pm', 'Table 5D']
//
// A roundtable moving tables between its two sittings cannot say the one place
// for both, so that one says where beside each time instead and comes back as
// a single part:
//
//   ['4:45-5:30pm (Table 5C) & 5:45-6:30pm (Table 5A)']
//
// Empty for anything the sheet has not placed yet, which is how the panel knows
// to show nothing rather than a gap.
function scheduleWhenAndWhere(session) {
  // A fixture is not in the sheet and has no sittings to read off it - it was
  // written down knowing when and where it is.
  if (session.when || session.place) {
    return [session.when, session.place].filter(Boolean);
  }

  const sittings = scheduleSittings(session.time, session.room);
  if (!sittings.length) return [];

  const times = sittings.map(function(sitting) {
    return scheduleSlotLabel(scheduleSlotFor(sitting.startsAt));
  });

  const places = sittings.map(function(sitting) {
    return sitting.room ? scheduleRoomPlace(sitting.room) : '';
  });

  const settled = places.every(function(place) { return place === places[0]; });

  if (settled) {
    return [times.join(' & '), places[0]].filter(Boolean);
  }

  return [times.map(function(time, at) {
    return places[at] ? time + ' (' + places[at] + ')' : time;
  }).join(' & ')];
}

// ===================== LAYING OUT THE DAY =====================
// Puts the day into `list` and the room key into `legendEl`, and hands back
// what it laid out - one entry per block, in the order they were appended - so
// whoever asked can put a row of tabs over the top and show them one at a time.
// Everything above this is about reading the sheet; everything below is about
// who is asking.
function scheduleRender(sessions, list, legendEl) {
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

  // The room comes in with the sitting rather than off the session: the two
  // sittings of a roundtable can be at different tables.
  // One session object per fixture, so every row of one opens the same panel
  const fixtureSessions = new Map();

  function fixtureSession(fixture) {
    let made = fixtureSessions.get(fixture);

    if (!made) {
      // The shape the panel expects of a session, with nobody on the bill
      made = {
        title: fixture.title,
        format: '',
        synopsis: fixture.synopsis || '',
        time: '',
        room: fixture.room || '',
        speakers: [],
        when: fixture.when || '',
        place: fixture.place || ''
      };
      fixtureSessions.set(fixture, made);
    }

    return made;
  }

  function fixtureItem(fixture) {
    return {
      session: fixtureSession(fixture),
      startsAt: null,
      room: fixture.room || '',
      when: fixture.when || '',
      place: fixture.place || '',
      fixture: true,
      sitting: 1,
      sittings: 1
    };
  }

  // Before every room, or after every room. The standing one goes after even
  // that, so a slot reads rooms first, then what is going on around them.
  const FIXTURE_TOP = -1;
  const FIXTURE_BOTTOM = 1000;
  const FIXTURE_STANDING = 2000;

  function placeFixtures() {
    slots.forEach(function(slot) {
      SCHEDULE_FIXTURES.forEach(function(fixture, at) {
        const key = 'fixture-' + at;

        // Fixtures naming the same group land in the one block, in the order
        // they are written, so the Clinic follows the playtest floor.
        function put(edge, heading) {
          const at = fixture.group ? 'fixture-' + fixture.group : key;
          let block = slot.rooms.get(at);

          if (!block) {
            block = {
              key: at,
              order: edge === 'top' ? FIXTURE_TOP :
                (fixture.everySlot ? FIXTURE_STANDING : FIXTURE_BOTTOM),
              heading: heading || '',
              allDay: fixture.group === SCHEDULE_STANDING.group,
              fixture: true,
              items: []
            };
            slot.rooms.set(at, block);
          }

          block.items.push(fixtureItem(fixture));
        }

        if (fixture.everySlot) {
          const spared = (fixture.except || []).indexOf(slot.def.start) !== -1;
          if (spared) return;

          // Only the slots that start inside the stretch it runs for
          if (fixture.from) {
            const opens = scheduleMinutes(slot.def.start);
            const from = scheduleMinutes(fixture.from);
            const until = scheduleMinutes(fixture.until);
            if (opens === null || opens < from || opens >= until) return;
          }

          put('bottom', fixture.heading);
          return;
        }

        (fixture.at || []).forEach(function(where) {
          if (where.start === slot.def.start) put(where.edge, where.heading);
        });
      });
    });
  }

  function slotNote(def) {
    return SCHEDULE_NOTES.filter(function(note) {
      return note.start === def.start;
    })[0];
  }

  function placeIn(slot, session, startsAt, room, sitting, sittings) {
    const key = scheduleBlockKey(room);
    let block = slot.rooms.get(key);

    if (!block) {
      block = { key: key, order: scheduleBlockOrder(room), items: [] };
      slot.rooms.set(key, block);
    }

    block.items.push({
      session: session,
      startsAt: startsAt,
      room: room,
      sitting: sitting,
      sittings: sittings
    });

    if (room && !blocksSeen.has(key)) blocksSeen.set(key, scheduleBlockOrder(room));
  }

  // Which session a row on the page stands for, so a click can work out what
  // else was on offer beside it
  const rowSessions = new Map();

  function buildRow(item, showTime) {
    const session = item.session;

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'session-row schedule-row';

    if (item.fixture) row.classList.add('schedule-row--fixture');

    if (item.room) {
      const badge = document.createElement('span');
      badge.className = 'schedule-row__room';
      badge.textContent = scheduleRoomBadge(item.room);

      // A fixture says where it is outright or says nothing. Going through the
      // room table would have 1A read as a breakfast table at the after-party
      // and 1F as one at four in the afternoon.
      const name = item.fixture ? item.place : scheduleRoomName(item.room);
      if (name) badge.title = name;
      row.appendChild(badge);
    }

    const at = document.createElement('span');
    at.className = 'schedule-row__time';
    // A fixture runs for a stretch rather than starting at a moment, so it
    // brings its own hours along and shows them whatever the block is doing.
    at.textContent = item.when ? item.when :
      (showTime && item.startsAt !== null ? scheduleClock(item.startsAt) : '');
    row.appendChild(at);

    const text = document.createElement('span');
    text.className = 'session-row__text';

    const title = document.createElement('span');
    title.className = 'session-row__title';
    title.textContent = session.title;
    text.appendChild(title);

    // Everything that follows the title travels together - see
    // .session-row__meta, which is what keeps it from being split up.
    const meta = document.createElement('span');
    meta.className = 'session-row__meta';

    // Which sitting this row is, for a session the day holds more than once.
    // Nothing to say about the ones that run the once, so nothing is said.
    if (item.sittings > 1) {
      const sitting = document.createElement('span');
      sitting.className = 'schedule-row__sitting';
      sitting.textContent = '(' + item.sitting + ' of ' + item.sittings + ')';
      meta.appendChild(sitting);
    }

    const names = session.speakers.map(function(speaker) {
      return speaker.name;
    }).join(', ');

    if (names) {
      if (meta.childNodes.length) meta.appendChild(document.createTextNode(' '));

      const lineup = document.createElement('span');
      lineup.className = 'session-row__speakers';
      lineup.textContent = names;
      meta.appendChild(lineup);
    }

    if (meta.childNodes.length) {
      // The gap between the title and what follows, carried as white space
      // rather than as a margin on the title. A margin at the end of a line is
      // still charged to that line, so a title near the edge would wrap a word
      // early to leave room for a gap that has gone down with the block anyway
      // - and a row with no metadata at all would pay for a gap separating it
      // from nothing. White space hangs at a break instead, and is also what
      // lets the line break here in the first place.
      const gap = document.createElement('span');
      gap.className = 'session-row__gap';
      gap.textContent = ' ';
      text.appendChild(gap);

      text.appendChild(meta);
    }

    row.appendChild(text);

    const chevron = document.createElement('span');
    chevron.className = 'session-row__chevron';
    chevron.innerHTML = '&#9654;';
    row.appendChild(chevron);

    rowSessions.set(row, session);

    row.addEventListener('click', function() {
      // The rows on screen right now, which is to say the slot being read, or
      // the whole day under Show All. Worked out when the row is pressed
      // rather than when it was built - which slot is showing decides it.
      const shown = overlayVisible(list, '.schedule-row');

      openSessionOverlay(session, shown.map(function(el) {
        return rowSessions.get(el);
      }), shown.indexOf(row));
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
    //
    // A block of fixtures is left alone: they were written in the order they
    // are meant to be read, and have no clock to be sorted by.
    if (!group.fixture) group.items.sort(function(a, b) {
      if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt;

      const rooms = String(a.room).localeCompare(String(b.room));
      if (rooms) return rooms;

      return a.session.title.localeCompare(b.session.title);
    });

    const showTimes = group.items.some(function(item) {
      return item.startsAt !== slot.startsAt;
    });

    const block = document.createElement('div');
    block.className = 'schedule-room';
    if (showTimes) block.classList.add('schedule-room--timed');

    // The standing fixture belongs to a slot read on its own. With the whole
    // day on screen it is the section at the foot instead, so it starts down
    // and the tabs raise it when a single slot is picked.
    if (group.allDay) {
      block.classList.add('schedule-room--allday');
      block.hidden = true;
    }

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
    // A fixture block was told what it is called when it was put there
    if (group.heading !== undefined) return group.heading;

    const entry = scheduleRoomEntry(group.key);
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

    const note = slotNote(slot.def);
    if (note) {
      const text = document.createElement('p');
      text.className = 'schedule-slot__note';
      text.textContent = note.text;
      block.appendChild(text);
    }

    rooms.forEach(function(room) {
      block.appendChild(buildRoomBlock(room, slot));
    });

    return block;
  }

  // The standing fixtures once more, under a heading of their own, for the foot
  // of a day shown whole. Saying them twelve times over, once per slot, would be
  // a drum beat rather than information.
  function buildStandingSlot() {
    const members = SCHEDULE_FIXTURES.filter(function(fixture) {
      return fixture.group === SCHEDULE_STANDING.group;
    });
    if (!members.length) return null;

    const block = document.createElement('section');
    block.className = 'schedule-slot schedule-slot--standing';
    block.appendChild(buildHead(SCHEDULE_STANDING.heading, ''));

    // --timed like every other block holding a fixture: it is what orders the
    // badge ahead of the hours once a phone stacks the two onto their own line.
    const rows = document.createElement('div');
    rows.className = 'schedule-room schedule-room--timed';
    block.appendChild(rows);

    members.forEach(function(fixture) {
      rows.appendChild(buildRow(fixtureItem(fixture), true));
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
        rows.appendChild(buildRow({
          session: session,
          startsAt: null,
          room: scheduleRooms(session.room)[0] || '',
          sitting: 1,
          sittings: 1
        }, false));
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
        const entry = scheduleRoomEntry(key);
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
  sessions.forEach(function(session) {
    const sittings = scheduleSittings(session.time, session.room);

    if (!sittings.length) {
      untimed.push(session);

      // It still shows a badge, so the key still has to explain it. Only
      // placeIn registers a room, and an untimed session never reaches it.
      const room = scheduleRooms(session.room)[0] || '';
      const block = scheduleBlockKey(room);
      if (room && !blocksSeen.has(block)) {
        blocksSeen.set(block, scheduleBlockOrder(room));
      }

      return;
    }

    // A roundtable that runs twice is the one session in two slots, so both
    // rows open the same panel. Each row is told which of the sittings it is,
    // so somebody who misses the first can see there is a second, and carries
    // the room that sitting is in - the two need not be the same table.
    sittings.forEach(function(sitting, at) {
      placeIn(slotFor(sitting.startsAt), session, sitting.startsAt,
        sitting.room, at + 1, sittings.length);
    });
  });

  buildLegend();
  placeFixtures();

  const laid = [];

  slots.forEach(function(slot) {
    const block = buildSlot(slot);
    list.appendChild(block);
    laid.push({
      key: block.id,
      label: scheduleSlotLabel(slot.def),
      block: block,
      // What the sheet put here, which is what decides where the day opens.
      // The coffee and the playtest floor stand in nearly every slot, so
      // counting them would make every slot look like it has something on.
      rows: block.querySelectorAll(
        '.schedule-row:not(.schedule-row--fixture)').length
    });
  });

  // Only there while the sheet is short a time or two, so it gets a tab of its
  // own rather than being findable only under Show All.
  if (untimed.length) {
    const block = buildUntimedSlot();
    block.id = 'slot-tba';
    list.appendChild(block);
    laid.push({
      key: block.id,
      label: 'Time TBA',
      block: block,
      rows: untimed.length
    });
  }

  // Last of all, after even the untimed, so it reads as a footnote to the day
  // rather than a part of it
  const standing = buildStandingSlot();
  if (standing) {
    standing.id = 'slot-standing';
    list.appendChild(standing);
    laid.push({
      key: standing.id,
      label: SCHEDULE_STANDING.heading,
      block: standing,
      rows: 0,
      standing: true
    });
  }

  // Put the shared list into the order the day runs in. The arrows no longer
  // walk this array - they walk the run they were opened from - but the list of
  // a speaker's own sessions on their panel is filtered straight out of it, and
  // reading those down the day beats reading them in sheet order. In place: it
  // is the same array shared.js keeps as `sessions`.
  sessions.sort(function(a, b) {
    // Where each one first turns up on the page, which for a roundtable is
    // the earlier of its two sittings and the table that one is at.
    const at = scheduleSittings(a.time, a.room)[0];
    const bt = scheduleSittings(b.time, b.room)[0];

    const aStarts = at ? at.startsAt : Infinity;
    const bStarts = bt ? bt.startsAt : Infinity;
    if (aStarts !== bStarts) return aStarts - bStarts;

    const aRoom = at ? at.room : '';
    const bRoom = bt ? bt.room : '';

    const blocks = scheduleBlockOrder(aRoom) - scheduleBlockOrder(bRoom);
    if (blocks) return blocks;

    const rooms = aRoom.localeCompare(bRoom);
    if (rooms) return rooms;

    return a.title.localeCompare(b.title);
  });

  return laid;
}

// ===================== THE STANDALONE PAGE =====================
// A page that is nothing but the schedule: it owns the section, fetches the
// sheet itself and shows the day whole.
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
    statusEl.classList.add('section-status--failed');
    statusEl.textContent =
      'The schedule could not be loaded. Please try again in a moment.';
  }

  // No speakers means nothing can pass the seat check in loadSessions
  if (!speakers || !speakers.length) {
    failStatus();
    return;
  }

  const loading = loadSessions(scheduleConfig.sheet, speakers, function(sessions) {
    if (!sessions.length) {
      failStatus();
      return;
    }

    scheduleRender(sessions, list, legendEl);

    // The day is on the page, so the wait is over
    clearStatus();
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

// ===================== THE SCHEDULE AS A VIEW =====================
// The home page shows the day as one of two views of the same sessions, inside
// the Sessions section rather than a section of its own - see js/sessions.js.
// The whole day is laid out once and a row of tabs picks which slot is on
// screen, so moving through the day never goes back to the sheet.
//
// Builds its tabs and its list into `host`, and hands back a fill() for once
// the sheet has arrived.
function buildScheduleView(host) {
  const bar = tabBar({
    id: 'scheduleTabs',
    label: 'Time slots',
    controls: 'scheduleList',
    className: 'session-tabs--slots'
  });
  host.appendChild(bar.element);

  const list = document.createElement('div');
  list.className = 'schedule schedule--tabbed';
  list.id = 'scheduleList';
  list.setAttribute('role', 'tabpanel');
  host.appendChild(list);

  // Inline here rather than pinned to the corner of the window: this is one
  // section of a long page, and a key that outlived it would sit over the rest.
  const legend = document.createElement('ul');
  legend.className = 'schedule-legend schedule-legend--inline';
  legend.id = 'scheduleLegend';
  legend.setAttribute('aria-label', 'Room key');
  legend.hidden = true;
  host.appendChild(legend);

  let laid = [];
  let swapping = null;

  // Show one slot, or the lot. The arrivals are stepped in one after another,
  // which is what the delay is for.
  function show(key, animate) {
    let shown = 0;
    const whole = key === SCHEDULE_ALL;

    laid.forEach(function(entry) {
      // The standing fixture is a section of its own only when the day is shown
      // whole; read a slot at a time, it belongs to the foot of each slot.
      const on = entry.standing ? whole : (whole || entry.key === key);

      entry.block.querySelectorAll('.schedule-room--allday')
        .forEach(function(block) { block.hidden = whole; });

      entry.block.classList.remove('schedule-slot--out');
      entry.block.classList.remove('schedule-slot--in');
      entry.block.style.animationDelay = '';
      entry.block.hidden = !on;
      if (!on) return;

      if (animate) {
        entry.block.style.animationDelay = tabSwapDelay(shown);
        entry.block.classList.add('schedule-slot--in');
      }
      shown++;
    });
  }

  function fill(sessions) {
    laid = scheduleRender(sessions, list, legend);
    if (!laid.length) return false;

    const pickable = laid.filter(function(entry) { return !entry.standing; });

    bar.setTabs(
      pickable.map(function(entry) {
        return { key: entry.key, label: entry.label };
      }).concat([{ key: SCHEDULE_ALL, label: 'Show All' }]),
      function(key, animate) {
        tabSwapCancel(swapping);
        swapping = tabSwap(list, function(stagger) {
          show(key, stagger);
        }, {
          animate: animate,
          itemSelector: '.schedule-slot',
          outClass: 'schedule-slot--out'
        });
      }
    );

    // The day opens where the day opens: the first slot with anything in it.
    const first = pickable.filter(function(entry) { return entry.rows; })[0];
    bar.select(first ? first.key : pickable[0].key, false);
    return true;
  }

  return {
    fill: fill,
    // A bar built while its view was hidden has no widths to measure, so the
    // pill is placed the first time the view is actually on screen.
    reflow: function() { bar.reflow(); },
    playIn: function() { bar.playIn(TAB_SWAP.staggerMs, TAB_SWAP.staggerMaxMs); }
  };
}
