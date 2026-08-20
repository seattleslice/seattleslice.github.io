// ===================== TAB BARS =====================
// A row of buttons with a filled pill that slides to whichever one is showing,
// and the swap the panel under it does when the pill moves.
//
// The Sessions section had one of each written into it. There are three bars
// now - the switch between the schedule and the session list, the run of time
// slots under the schedule, and the formats under the session list - and they
// should all behave the same way, so the behaviour lives here once.
//
//   const bar = tabBar({ id: 'sessionTabs', label: 'Session formats' });
//   bar.setTabs([{ key: 'panel', label: 'Panels' }], function(key, animate) {
//     ...show that format...
//   });
//   bar.select('panel', false);
//
// The pill is measured from the button it sits behind, so it follows whatever
// the labels have wrapped to at this width. Anything that changes those widths
// has to say so with reflow() - a resize and the fonts arriving are handled
// here, but a bar that was hidden while its buttons were built has no widths
// to measure until it is shown.

function tabBar(config) {
  const settings = config || {};

  const element = document.createElement('div');
  element.className = 'session-tabs' +
    (settings.className ? ' ' + settings.className : '');
  element.setAttribute('role', 'tablist');
  if (settings.id) element.id = settings.id;
  if (settings.label) element.setAttribute('aria-label', settings.label);
  element.hidden = true;

  const glider = document.createElement('span');
  glider.className = 'session-tabs__glider';
  glider.setAttribute('aria-hidden', 'true');
  element.appendChild(glider);

  let tabs = [];
  // null rather than '', which is a key a tab can genuinely have: a session
  // with nothing in its Format cell groups under the empty string, and a
  // sentinel that collided with it would leave that tab unable to be selected.
  let activeKey = null;
  let onSelect = null;
  let pending = false;

  function panel() {
    return settings.controls ? document.getElementById(settings.controls) : null;
  }

  // Instant while the window is being resized, or while a bar is arriving -
  // it has no move of its own to make from wherever it was last left.
  function moveGlider(instant) {
    if (!tabs.length) return;

    const active = tabs.filter(function(tab) {
      return tab.dataset.tabKey === activeKey;
    })[0];
    // A bar that is hidden, or whose fonts have not landed, has nothing worth
    // measuring yet. It will be back through here when it is shown.
    if (!active || !active.offsetWidth) return;

    if (instant) glider.style.transition = 'none';
    glider.style.width = active.offsetWidth + 'px';
    glider.style.height = active.offsetHeight + 'px';
    glider.style.transform =
      'translate(' + active.offsetLeft + 'px, ' + active.offsetTop + 'px)';
    if (instant) {
      void glider.offsetWidth;
      glider.style.transition = '';
    }

    element.classList.add('session-tabs--glide');
  }

  function sync(instant) {
    const labelled = panel();

    tabs.forEach(function(tab) {
      const on = tab.dataset.tabKey === activeKey;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      // Roving focus: Tab reaches the row of buttons, the arrow keys move
      // along it.
      tab.tabIndex = on ? 0 : -1;
      if (on && labelled) labelled.setAttribute('aria-labelledby', tab.id);
    });

    moveGlider(instant);
  }

  function select(key, animate) {
    if (key === activeKey) return false;

    const known = tabs.some(function(tab) {
      return tab.dataset.tabKey === key;
    });
    if (!known) return false;

    activeKey = key;
    sync(!animate);
    if (onSelect) onSelect(key, animate);
    return true;
  }

  // Everything the bar was showing, replaced. The handler is what to do when
  // one is pressed - the bar itself only moves the pill.
  function setTabs(list, handler) {
    onSelect = handler || null;

    tabs.forEach(function(tab) { element.removeChild(tab); });
    tabs = [];
    activeKey = null;
    element.classList.remove('session-tabs--glide');

    list.forEach(function(entry) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'session-tab';
      tab.id = (settings.id || 'tabs') + '-' +
        String(entry.key).replace(/[^A-Za-z0-9]+/g, '');
      tab.dataset.tabKey = entry.key;
      tab.textContent = entry.label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      if (settings.controls) tab.setAttribute('aria-controls', settings.controls);
      tab.tabIndex = -1;

      tab.addEventListener('click', function() {
        select(entry.key, true);
      });

      element.appendChild(tab);
      tabs.push(tab);
    });

    element.hidden = !tabs.length;
  }

  // The buttons arriving one after another, which is what a bar does when its
  // view is switched to. Held back from the first paint so a bar that is only
  // being shown again does not flash at full strength before it starts.
  function playIn(stagger, cap) {
    tabs.forEach(function(tab, at) {
      tab.classList.remove('session-tab--in');
      void tab.offsetWidth;
      tab.style.animationDelay = Math.min(at * stagger, cap) + 'ms';
      tab.classList.add('session-tab--in');
    });
  }

  element.addEventListener('keydown', function(e) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step || !tabs.length) return;
    e.preventDefault();

    let at = 0;
    tabs.forEach(function(tab, i) {
      if (tab.dataset.tabKey === activeKey) at = i;
    });

    const next = tabs[(at + step + tabs.length) % tabs.length];
    next.focus();
    select(next.dataset.tabKey, true);
  });

  // The buttons move when the row rewraps, and again when Bungee arrives and
  // every label changes width, so the pill is placed again for both.
  window.addEventListener('resize', function() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function() {
      pending = false;
      moveGlider(true);
    });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { moveGlider(true); });
  }

  return {
    element: element,
    setTabs: setTabs,
    select: select,
    playIn: playIn,
    reflow: function() { moveGlider(true); },
    active: function() { return activeKey; },
    count: function() { return tabs.length; }
  };
}

function tabsReducedMotion() {
  return window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// How long the items take to leave, the step between the ones arriving, and
// how long a box spends resizing between the two sets.
const TAB_SWAP = {
  outMs: 120,
  staggerMs: 24,
  staggerMaxMs: 180,
  heightMs: 350
};

// Swap what a box is showing: the old set leaves together, the new set arrives
// one after another, and the box carries its own height across the two so
// nothing below it jumps when the second set is the taller.
//
// `show` is handed a flag saying whether the arrivals should be stepped in, and
// is the only thing that knows which items belong to what.
//
// Returns the timers it set, so a second press part way through can call them
// off - see tabSwapCancel.
function tabSwap(box, show, config) {
  const settings = config || {};
  const items = settings.itemSelector || '.session-row';
  const outClass = settings.outClass || 'session-row--out';
  const timers = { out: 0, settle: 0 };

  if (!settings.animate || tabsReducedMotion()) {
    box.classList.remove('is-swapping');
    box.style.height = '';
    show(false);
    return timers;
  }

  // What the box stands at now. The next set is only measured once the old one
  // has gone, so the two heights are the ends of the move.
  const startHeight = box.offsetHeight;

  box.querySelectorAll(items + ':not([hidden])').forEach(function(item) {
    item.style.animationDelay = '';
    item.classList.add(outClass);
  });

  timers.out = setTimeout(function() {
    box.classList.remove('is-swapping');
    box.style.height = '';
    show(true);

    const endHeight = box.offsetHeight;
    box.classList.add('is-swapping');
    box.style.height = startHeight + 'px';
    void box.offsetHeight;
    box.style.height = endHeight + 'px';

    // Clipping is only wanted while the height is moving - at rest the rows
    // need the room outside the box for their hover glow. A timer rather than
    // transitionend, which goes missing when a second tab is pressed part way
    // through.
    timers.settle = setTimeout(function() {
      box.classList.remove('is-swapping');
      box.style.height = '';
    }, TAB_SWAP.heightMs + 60);
  }, TAB_SWAP.outMs);

  return timers;
}

function tabSwapCancel(timers) {
  if (!timers) return;
  clearTimeout(timers.out);
  clearTimeout(timers.settle);
}

// The delay an item arriving at position `at` waits before it starts
function tabSwapDelay(at) {
  return Math.min(at * TAB_SWAP.staggerMs, TAB_SWAP.staggerMaxMs) + 'ms';
}
