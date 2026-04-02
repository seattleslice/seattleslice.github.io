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

  // Click on robot triggers animation
  robotMascot.addEventListener('click', DoAnimation);

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
    const heroBottom = hero.getBoundingClientRect().bottom;
    if (heroBottom <= 0 && !entered) {
      entered = true;
      container.classList.add('entered');
    } else if (heroBottom > 0 && entered) {
      entered = false;
      container.classList.remove('entered');
    }
  }

  void container.offsetWidth; // force layout so transition triggers
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });

  function startIdleAnimation(s) {
    let t = s.phase;
    function tick() {
      t += 0.016;
      const angle = Math.sin(t * s.idleSpeed) * s.idleMaxRotation;
      s.img.style.transform = 'rotate(' + angle + 'deg)';
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
        s.img.style.transform = 'rotate(0deg)';
        s.animating = false;
        startIdleAnimation(s);
        return;
      }

      const envelope = Math.sin(p * Math.PI);
      const angle = envelope * Math.sin(p * Math.PI * 8) * 6;
      s.img.style.transform = 'rotate(' + angle + 'deg)';
      s.animId = requestAnimationFrame(tick);
    }
    s.animId = requestAnimationFrame(tick);
  }

  // Start idle for each and attach click handlers
  state.forEach(s => {
    startIdleAnimation(s);
    s.el.addEventListener('click', () => doClickAnimation(s));
  });
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
