// ===================== GOOGLE SHEETS IMPORT =====================
function GSheetsapi({ apiKey, sheetId, sheetName, sheetNumber = 1 }) {
  try {
    const sheetNameStr = sheetName && sheetName !== '' ? encodeURIComponent(sheetName) : `Sheet${sheetNumber}`;
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetNameStr}?dateTimeRenderOption=FORMATTED_STRING&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&key=${apiKey}`;

    return fetch(sheetsUrl)
      .then(response => {
        if (!response.ok) {
          console.log('there is an error in the gsheets response');
          throw new Error('Error fetching GSheet');
        }
        return response.json();
      })
      .then(data => data)
      .catch(err => {
        throw new Error(
          'Failed to fetch from GSheets API. Check your Sheet Id and the public availability of your GSheet.'
        );
      });
  } catch (err) {
    throw new Error(`General error when fetching GSheet: ${err}`);
  }
}

function processGSheetResults(
  JSONResponse,
  returnAllResults,
  filter,
  filterOptions,
  startRow
) {
  const data = JSONResponse.values;
  if (typeof startRow === 'undefined') startRow = 3;

  let processedResults = [{}];
  let colNames = {};

  for (let i = 0; i < data.length; i++) {
    // Rows
    const thisRow = data[i];

    for (let j = 0; j < thisRow.length; j++) {
      // Columns/cells
      const cellValue = thisRow[j];
      const colNameToAdd = colNames[j]; // this will be undefined on the first pass

      if (i < startRow) {
        colNames[j] = cellValue;
        continue; // skip the header row(s)
      }

      if (typeof processedResults[i] === 'undefined') {
        processedResults[i] = {};
      }

      if (typeof colNameToAdd !== 'undefined' && colNameToAdd.length > 0) {
        processedResults[i][colNameToAdd] = cellValue;
      }
    }
  }

  // make sure we're only returning valid, filled data items
  processedResults = processedResults.filter(
    result => Object.keys(result).length
  );

  // if we're not filtering, then return all results
  if (returnAllResults || !filter) {
    return processedResults;
  }

  return filterResults(processedResults, filter, filterOptions);
}

function gsheetProcessor(options, callback, onError) {
  const { apiKey, sheetId, sheetName, sheetNumber, returnAllResults, filter, filterOptions, startRow } = options;

  if (!options.apiKey || options.apiKey === undefined) {
    throw new Error('Missing Sheets API key');
  }

  return GSheetsapi({
    apiKey,
    sheetId,
    sheetName,
    sheetNumber
  })
    .then(result => {
      const filteredResults = processGSheetResults(
        result,
        returnAllResults || false,
        filter || false,
        filterOptions || {
          operator: 'or',
          matching: 'loose'
        },
        startRow
      );

      callback(filteredResults);
    });
}

// ===================== SPEAKERS FROM GOOGLE SHEET =====================
var speakers = [];

function loadSpeakers(callback) {
  gsheetProcessor(
    {
      sheetId: "1idfs0hL8dM0vwXtdph3Md1EIlc4__sClZyYjpAIyGBQ",
      sheetName: "Speakers2025",
      sheetNumber: 1,
      returnAllResults: true,
      apiKey: "AIzaSyD4ZoTrXMfF7mhAMVNNiensNsWL5XC6Sqo",
      startRow: 1
    },
    (results) => {
      var i = 0;
      results.forEach((result) => {
        if (result["Name"]) {
          speakers[i] = {
            name: result["Name"] || '',
            sessions: result["Sessions"] || '',
            company: result["Company"] || '',
            title: result["Title"] || '',
            x: result["X"] || '',
            facebook: result["Facebook"] || '',
            instagram: result["Instagram"] || '',
            bluesky: result["Bluesky"] || '',
            tiktok: result["TikTok"] || '',
            youtube: result["YouTube"] || '',
            bio: result["Bio"] || '',
            linkedin: result["Speakers LinkedIn"] || '',
            headshotUrl: result["Headshot URL"] || '',
            shortDescriptor: result["Very Short Descriptor (Company/games list)"] || ''
          };
          i++;
        }
      });

      if (callback) callback(speakers);
    }
  );
}

// ===================== SCROLL REVEAL =====================
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

// ===================== ROBOT MASCOT ANIMATION =====================
(function() {
  const robotMascot = document.getElementById('robotMascot');
  const robotRig = document.getElementById('robotRig');
  const robotArm = document.getElementById('robotArm');

  if (!robotMascot || !robotRig || !robotArm) return;

  let robotAnimId = null;
  let robotIdleId = null;
  let robotAnimating = false;

  // Slide the robot in after 1 second, already doing idle animation
  setTimeout(() => {
    robotMascot.classList.add('entered');
    DoAnimation();
  }, 1000);

  // Gentle idle sway
  function startIdleAnimation() {
    let t = 0;
    function idleTick() {
      t += 0.02;
      const bodyAngle = Math.sin(t * 0.7) * 1.5;
      const armAngle = Math.sin(t * 1.1 + 0.5) * 3;
      robotRig.style.transform = `rotate(${bodyAngle}deg)`;
      robotArm.style.transform = `rotate(${armAngle}deg)`;
      robotIdleId = requestAnimationFrame(idleTick);
    }
    idleTick();
  }

  function stopIdleAnimation() {
    if (robotIdleId) {
      cancelAnimationFrame(robotIdleId);
      robotIdleId = null;
    }
  }

  // Teaching animation
  function DoAnimation() {
    if (robotAnimating) return;
    robotAnimating = true;
    stopIdleAnimation();

    const duration = 3000;
    const start = performance.now();

    function animTick(now) {
      const elapsed = now - start;
      const p = elapsed / duration;

      if (p >= 1) {
        robotRig.style.transform = 'rotate(0deg)';
        robotArm.style.transform = 'rotate(0deg)';
        robotAnimating = false;
        startIdleAnimation();
        return;
      }

      const envelope = Math.sin(p * Math.PI);
      const bodyAngle = envelope * Math.sin(p * Math.PI * 6) * 4;
      const armAngle = envelope * (Math.sin(p * Math.PI * 8) * 12 - 5);

      robotRig.style.transform = `rotate(${bodyAngle}deg)`;
      robotArm.style.transform = `rotate(${armAngle}deg)`;
      robotAnimId = requestAnimationFrame(animTick);
    }
    robotAnimId = requestAnimationFrame(animTick);
  }

  // Hover triggers animation on desktop, tap on mobile
  robotMascot.addEventListener('mouseenter', DoAnimation);
  robotMascot.addEventListener('touchstart', DoAnimation, { passive: true });

  // Scroll indicator click (if present on page)
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', DoAnimation);
  }

  // Trigger DoAnimation on large scroll events
  let lastScrollY = window.scrollY;
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const delta = Math.abs(window.scrollY - lastScrollY);
      if (delta > 400) {
        DoAnimation();
      }
      lastScrollY = window.scrollY;
    }, 150);
  });

  // Expose DoAnimation globally for page-specific use
  window.DoAnimation = DoAnimation;
})();

// ===================== BOTTOM CHARACTERS ANIMATION =====================
(function() {
  const container = document.getElementById('bottomCharacters');
  if (!container) return;

  const chars = container.querySelectorAll('.bottom-char');
  if (!chars.length) return;

  // Pivot point: percentage from top of image. The image is shifted
  // down so this point sits at the bottom of the screen.
  const pivotY = 90; // %
  const offsetY = 100 - pivotY; // how far to push image down

  // Per-character state
  const state = Array.from(chars).map((el, i) => ({
    el,
    img: el.querySelector('img'),
    idleId: null,
    animId: null,
    animating: false,
    // Offset each character's phase so they don't sway in unison
    phase: i * 2.1,
    // Base idle parameters (subtle)
    idleMaxRotation: 1.2,
    idleSpeed: 0.4 + i * 0.15
  }));

  // Hide characters while hero/intro video is in view
  const hero = document.getElementById('hero');
  let entered = false;

  function updateVisibility() {
    if (!hero) {
      // No hero on this page, just show after delay
      if (!entered) { entered = true; container.classList.add('entered'); }
      return;
    }
    const heroVisible = hero.getBoundingClientRect().bottom / window.innerHeight;
    if (heroVisible <= 0.85 && !entered) {
      entered = true;
      container.classList.add('entered');
    } else if (heroVisible > 0.85 && entered) {
      entered = false;
      container.classList.remove('entered');
    }
  }

  void container.offsetWidth; // force layout so transition triggers
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });

  function setTransform(s, angle) {
    s.img.style.transform = 'translateY(' + offsetY + '%) rotate(' + angle + 'deg)';
  }

  function startIdleAnimation(s) {
    let t = s.phase;
    function tick() {
      t += 0.016;
      const angle = Math.sin(t * s.idleSpeed) * s.idleMaxRotation;
      setTransform(s, angle);
      s.idleId = requestAnimationFrame(tick);
    }
    tick();
  }

  function stopIdleAnimation(s) {
    if (s.idleId) {
      cancelAnimationFrame(s.idleId);
      s.idleId = null;
    }
  }

  // Click animation: brief excited rocking
  function doClickAnimation(s) {
    if (s.animating) return;
    s.animating = true;
    stopIdleAnimation(s);

    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const p = elapsed / duration;

      if (p >= 1) {
        setTransform(s, 0);
        s.animating = false;
        startIdleAnimation(s);
        return;
      }

      const envelope = Math.sin(p * Math.PI);
      const angle = envelope * Math.sin(p * Math.PI * 8) * 6;
      setTransform(s, angle);
      s.animId = requestAnimationFrame(tick);
    }
    s.animId = requestAnimationFrame(tick);
  }

  // Init idle animations
  state.forEach(s => {
    s.img.style.transformOrigin = '50% ' + pivotY + '%';
    startIdleAnimation(s);
  });

  // Detect hover via mousemove hit-testing (characters are behind
  // content in z-order, so normal mouseenter won't reach them)
  let lastHovered = null;
  document.addEventListener('mousemove', function(e) {
    if (!entered) return;
    let hit = null;
    for (let i = 0; i < state.length; i++) {
      const rect = state[i].el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        hit = state[i];
        break;
      }
    }
    if (hit && hit !== lastHovered) {
      doClickAnimation(hit);
    }
    lastHovered = hit;
  });

  // Mobile: tap anywhere near the characters triggers animation
  document.addEventListener('touchstart', function(e) {
    if (!entered) return;
    const touch = e.touches[0];
    for (let i = 0; i < state.length; i++) {
      const rect = state[i].el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        doClickAnimation(state[i]);
        break;
      }
    }
  }, { passive: true });
})();

// ===================== SKYLINE =====================
(function() {
  const skyline = document.getElementById('skyline');
  if (!skyline) return;

  const hero = document.getElementById('hero');
  let entered = false;

  let ready = false;

  function updateVisibility() {
    if (!ready) return;
    if (!hero) {
      if (!entered) { entered = true; skyline.classList.add('entered'); }
      return;
    }
    const heroVisible = hero.getBoundingClientRect().bottom / window.innerHeight;
    if (heroVisible <= 0.85 && !entered) {
      entered = true;
      skyline.classList.add('entered');
    } else if (heroVisible > 0.85 && entered) {
      entered = false;
      skyline.classList.remove('entered');
    }
  }

  void skyline.offsetWidth;
  setTimeout(() => {
    ready = true;
    updateVisibility();
  }, 1000);
  window.addEventListener('scroll', updateVisibility, { passive: true });
})();

// ===================== SPEAKER OVERLAY =====================
(function() {
  const overlay = document.getElementById('speakerOverlay');
  const line = document.getElementById('speakerLine');
  const panel = document.getElementById('speakerPanel');
  const closeBtn = document.getElementById('speakerClose');
  const avatarEl = document.getElementById('speakerAvatar');
  const nameEl = document.getElementById('speakerNameDisplay');
  const socialsEl = document.getElementById('speakerSocials');
  const bioEl = document.getElementById('speakerBio');

  if (!overlay || !closeBtn) return;

  const SVG_ICONS = {
    twitter: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    website: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
  };

  function openOverlay(card) {
    const name = card.dataset.name;
    const bio = card.dataset.bio || '';
    const twitter = card.dataset.twitter || '';
    const website = card.dataset.website || '';
    const image = card.dataset.image || '';

    nameEl.textContent = name;
    bioEl.textContent = bio;

    if (image) {
      avatarEl.style.backgroundImage = "url('" + image + "')";
    } else {
      avatarEl.style.backgroundImage = '';
    }

    // Build socials
    socialsEl.innerHTML = '';
    if (twitter) {
      const a = document.createElement('a');
      a.href = 'https://x.com/' + twitter;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = '@' + twitter;
      a.innerHTML = SVG_ICONS.twitter;
      socialsEl.appendChild(a);
    }
    if (website) {
      const a = document.createElement('a');
      a.href = website;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = 'Website';
      a.innerHTML = SVG_ICONS.website;
      socialsEl.appendChild(a);
    }

    // Step 1: show overlay, activate blur, show line
    overlay.classList.add('active');
    requestAnimationFrame(() => {
      overlay.classList.add('step-line');
    });

    // Step 2: after line expands, open panel
    setTimeout(() => {
      overlay.classList.add('step-panel');
    }, 400);
  }

  function closeOverlay() {
    overlay.classList.remove('step-panel');
    setTimeout(() => {
      overlay.classList.remove('step-line');
      setTimeout(() => {
        overlay.classList.remove('active');
      }, 350);
    }, 300);
  }

  // Attach click to all speaker cards
  document.querySelectorAll('.speaker-card').forEach(card => {
    card.addEventListener('click', () => openOverlay(card));
  });

  closeBtn.addEventListener('click', closeOverlay);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === overlay.querySelector('::before')) {
      closeOverlay();
    }
  });

  // Close on Escape or Backspace
  document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('active') && (e.key === 'Escape' || e.key === 'Backspace')) {
      e.preventDefault();
      closeOverlay();
    }
  });
})();
