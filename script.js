// Safe boot + Smooth scroll (Lenis)
window.addEventListener('DOMContentLoaded', () => {
  // Set CSS var for header height to offset fixed header
  const setHeaderVar = () => {
    const header = document.querySelector('.site-header')
    if (!header) return
    const h = header.offsetHeight || 0
    document.documentElement.style.setProperty('--header-h', h + 'px')
  }
  setHeaderVar()
  window.addEventListener('resize', setHeaderVar)
  // In case webfonts change metrics after load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setHeaderVar).catch(() => {})
  }
  // 3D hero object (Three.js plexiglass)
  const heroCanvas = document.getElementById('hero3d')
  let three = { renderer: null, scene: null, camera: null, mesh: null, material: null, raf: 0, st: null }
  const initHero3D = () => {
    if (!heroCanvas || !window.THREE) return
    const { Scene, PerspectiveCamera, WebGLRenderer, CapsuleGeometry, SphereGeometry, Group, MeshPhysicalMaterial, MeshBasicMaterial, Mesh, Color, HemisphereLight, DirectionalLight, AdditiveBlending } = window.THREE
    const scene = new Scene()
    const camera = new PerspectiveCamera(35, heroCanvas.clientWidth / heroCanvas.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 6)
    const renderer = new WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    const resize = () => {
      const w = heroCanvas.clientWidth, h = heroCanvas.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    // Lights for plexi
    const hemi = new HemisphereLight(0xffffff, 0x222222, 0.8)
    const dir = new DirectionalLight(0xffffff, 0.8); dir.position.set(3, 5, 4)
    scene.add(hemi, dir)

    // Geometry: plus from boxes (no rounding) with plexiglass material
    const mat = new MeshPhysicalMaterial({
      color: new Color(0xffffff),
      metalness: 0.0,
      roughness: 0.2,
      transmission: 0.6,
      transparent: true,
      opacity: 0.98,
      ior: 1.5,
      thickness: 1.2,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      reflectivity: 0.55
    })
    const plus = new Group()
    const armA = new Mesh(new CapsuleGeometry(0.24, 0.8, 16, 24), mat)
    const armB = new Mesh(new CapsuleGeometry(0.24, 0.8, 16, 24), mat)
    armB.rotation.z = Math.PI / 2
    plus.add(armA, armB)
    plus.position.set(0.0, -0.2, 0) // under the text

    // Removed glow shell to keep 3D object clean
    scene.add(plus)

    // Save refs
    three = { renderer, scene, camera, mesh: plus, material: mat, glowMaterial: null, raf: 0, st: null }

    // Scroll‑based rotation
    if (window.ScrollTrigger) {
      three.st = window.ScrollTrigger.create({
        trigger: document.querySelector('.hero'), start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (self) => { if (three.mesh) { three.mesh.rotation.y = self.progress * Math.PI * 2; three.mesh.rotation.x = 0.6 + self.progress * 0.7 } }
      })
    }

    // Mouse parallax targets
    const target = { rx: 0.4, ry: 0.6, px: 1.8, py: 0.2 }
    const onMouse = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      target.ry = 0.6 + nx * 0.4
      target.rx = 0.4 + ny * 0.3
      target.px = 1.8 + nx * 0.2
      target.py = 0.2 - ny * 0.15
    }
    window.addEventListener('mousemove', onMouse)

    // RAF animate
    const tick = () => {
      three.raf = requestAnimationFrame(tick)
      if (three.mesh) {
        // lerp to target
        three.mesh.rotation.x += (target.rx - three.mesh.rotation.x) * 0.06
        three.mesh.rotation.y += (target.ry - three.mesh.rotation.y) * 0.06
        three.mesh.position.x += (target.px - three.mesh.position.x) * 0.06
        three.mesh.position.y += (target.py - three.mesh.position.y) * 0.06
        three.mesh.rotation.z += 0.0018
      }
      renderer.render(scene, camera)
    }
    tick()
  }

  const setHero3DColorByTheme = () => {
    const eff = document.documentElement.getAttribute('data-effective-theme') || 'dark'
    if (three.material) {
      if (eff === 'light') {
        three.material.color.set(0x111111)
        three.material.opacity = 0.92
        if (three.glowMaterial) three.glowMaterial.color.set(0x111111), three.glowMaterial.opacity = 0.10
      } else {
        three.material.color.set(0xffffff)
        three.material.opacity = 0.96
        if (three.glowMaterial) three.glowMaterial.color.set(0xffffff), three.glowMaterial.opacity = 0.12
      }
      three.material.needsUpdate = true
      if (three.glowMaterial) three.glowMaterial.needsUpdate = true
    }
  }

  window.__updateHero3DColor = setHero3DColorByTheme

  // Init 3D once DOM and THREE ready
  if (heroCanvas) {
    if (window.THREE) { initHero3D(); setHero3DColorByTheme() }
    else window.addEventListener('load', () => { initHero3D(); setHero3DColorByTheme() })
  }

  // Theme: apply saved or default
  const root = document.documentElement
  const mediaLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)')
  const getEffectiveTheme = () => {
    const forced = root.getAttribute('data-theme')
    if (forced) return forced
    if (mediaLight && mediaLight.matches) return 'light'
    return 'dark'
  }
  const reflectEffectiveTheme = () => {
    const eff = getEffectiveTheme()
    root.setAttribute('data-effective-theme', eff)
    const btn = document.querySelector('.theme-toggle')
    if (btn) {
      btn.setAttribute('aria-pressed', eff === 'light')
      const next = eff === 'light' ? 'темную' : 'светлую'
      btn.title = 'Переключить на ' + next + ' тему'
      btn.setAttribute('aria-label', btn.title)
    }
  }
  const applyTheme = () => {
    const saved = localStorage.getItem('theme') // 'light' | 'dark' | null
    if (saved === 'light' || saved === 'dark') {
      root.setAttribute('data-theme', saved)
    } else {
      root.removeAttribute('data-theme') // follow system
    }
    reflectEffectiveTheme()
    // also update 3D tint
    if (window.__updateHero3DColor) window.__updateHero3DColor()
  }
  applyTheme()

  const beginSmooth = () => root.classList.add('theme-switching')
  const endSmooth = () => root.classList.remove('theme-switching')

  const toggleBtn = document.querySelector('.theme-toggle')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      beginSmooth()
      const current = getEffectiveTheme()
      const next = current === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      applyTheme()
      setHeaderVar()
      window.setTimeout(endSmooth, 420)
    })
  }
  if (mediaLight && mediaLight.addEventListener) {
    mediaLight.addEventListener('change', () => {
      // If no override, re-apply to follow system
      if (!localStorage.getItem('theme')) {
        beginSmooth()
        applyTheme()
        setHeaderVar()
        if (window.__updateHero3DColor) window.__updateHero3DColor()
        window.setTimeout(endSmooth, 420)
      }
    })
  }



  // Mark reveal targets (keep visible by default until JS is ready)
  document.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('will-reveal'))

  // Lenis (guarded)
  let lenis = null
  try {
    if (window.Lenis) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => 1 - Math.pow(1 - t, 2),
        smoothWheel: true,
        smoothTouch: false,
      })
      function raf(time) {
        lenis.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
    }
  } catch (e) { /* ignore */ }

  // Seamless marquee: duplicate content so it loops without a jump
  document.querySelectorAll('.marquee-track').forEach((track) => {
    const content = track.innerHTML.trim()
    // Avoid exponential growth if this script runs multiple times
    if (!track.__duplicated) {
      track.innerHTML = content + content
      track.__duplicated = true
    }
  })

  // GSAP plugins (guarded)
  const hasGSAP = !!(window.gsap && window.ScrollTrigger)
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger)

    // Split-reveal titles
    document.querySelectorAll('.section-title, .hero-title').forEach((title) => {
      const text = title.textContent
      title.setAttribute('aria-label', text)
      title.innerHTML = text.split(/(\s+)/).map(w => w.trim() ? `<span class="split"><span>${w}</span></span>` : w).join('')
    })

    // Reveal sections
    document.querySelectorAll('.will-reveal').forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
        onComplete: () => el.classList.remove('will-reveal'),
      })
    })

    // Animate split words
    document.querySelectorAll('.split').forEach((wrap) => {
      gsap.fromTo(wrap.children, { yPercent: 100 }, {
        yPercent: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: {
          trigger: wrap.closest('[data-animate]') || wrap,
          start: 'top 80%'
        }
      })
    })

    // Hero marquee subtle skew on scroll
    const marquee = document.querySelector('.marquee-track')
    if (marquee) {
      let proxy = { skew: 0 }
      const clamp = gsap.utils.clamp(-8, 8)
      ScrollTrigger.create({
        onUpdate: (self) => {
          let skew = clamp(self.getVelocity() / -200)
          if (Math.abs(skew) > Math.abs(proxy.skew)) {
            proxy.skew = skew
            gsap.to(marquee, { skewX: proxy.skew, duration: 0.4, ease: 'power3', transformOrigin: 'center' })
            gsap.to(proxy, { skew: 0, duration: 0.6, ease: 'power3' })
          }
        },
      })
    }

    // Parallax for service/about cards
    const parallaxEls = document.querySelectorAll('.service, .about-card')
    parallaxEls.forEach((el) => {
      gsap.fromTo(el, { y: 30, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      })
    })
  } else {
    // Fallback: ensure content is visible if GSAP not loaded
    document.querySelectorAll('.will-reveal').forEach((el) => {
      el.style.opacity = 1
      el.style.transform = 'none'
      el.classList.remove('will-reveal')
    })
  }

  // Mobile header auto-hide on scroll
  (function(){
    const header = document.querySelector('.site-header')
    if (!header) return
    let lastY = window.scrollY || 0
    const mq = window.matchMedia('(max-width: 768px)')
    function onScroll(){
      if (!mq.matches) { header.classList.remove('is-compact'); return }
      const y = window.scrollY || 0
      if (y > lastY + 6 && y > 60) header.classList.add('is-compact') // scrolling down
      else if (y < lastY - 6) header.classList.remove('is-compact') // scrolling up
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
  })()

  // Custom cursor + magnetic (guarded)
  const cursor = document.querySelector('.cursor')
  const glow = document.querySelector('.cursor-glow')
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (cursor) {
    let cx = 0, cy = 0
    let tx = 0, ty = 0
    const speed = prefersReduced ? 1 : 0.2
    const lerp = (a, b, n) => (1 - n) * a + n * b

    let hideTimer
    function showCursor() { cursor.classList.remove('is-hidden'); clearTimeout(hideTimer); if (glow) glow.style.opacity = '0.75' }
    function hideCursorSoon() { hideTimer = setTimeout(() => { cursor.classList.add('is-hidden'); if (glow) glow.style.opacity = '0.0' }, 1400) }

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX
      ty = e.clientY
      if (glow) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px' }
      showCursor(); hideCursorSoon()
    })

    function move() {
      cx = lerp(cx, tx, speed)
      cy = lerp(cy, ty, speed)
      if (cursor) { cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px' }

      requestAnimationFrame(move)
    }
    move()

    // magnetic for links and buttons
    const magnets = document.querySelectorAll('a, .btn, .magnetic')
    magnets.forEach((el) => {
      const wrap = el.classList.contains('magnetic') ? el : el.classList.add('magnetic')
      el.addEventListener('mouseenter', () => { cursor.classList.add('is-active'); if (glow) glow.classList.add('is-strong') })
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-active')
        if (glow) glow.classList.remove('is-strong')
        gsap && gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: 'power3' })
      })
      el.addEventListener('mousemove', (e) => {
        if (!hasGSAP) return
        const rect = el.getBoundingClientRect()
        const relX = e.clientX - rect.left - rect.width / 2
        const relY = e.clientY - rect.top - rect.height / 2
        gsap.to(el, { x: relX * 0.15, y: relY * 0.15, duration: 0.3, ease: 'power3' })
      })
    })
  }

  // Case hover preview: disabled (we replaced with accordion behavior)
  // Removed hover preview behavior and listeners

  // Accordion behavior for cases
  document.querySelectorAll('.case').forEach((caseEl) => {
    const btn = caseEl.querySelector('.case-toggle')
    const extra = caseEl.querySelector('.case-extra')
    if (!btn || !extra) return
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true'
      // close others
      document.querySelectorAll('.case .case-toggle[aria-expanded="true"]').forEach((openBtn) => {
        if (openBtn !== btn) {
          openBtn.setAttribute('aria-expanded', 'false')
          const openExtra = openBtn.closest('.case').querySelector('.case-extra')
          if (hasGSAP) {
            gsap.to(openExtra, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => openExtra.hidden = true })
          } else {
            openExtra.style.height = 0; openExtra.style.opacity = 0; openExtra.hidden = true
          }
        }
      })
      // toggle current
      if (expanded) {
        btn.setAttribute('aria-expanded', 'false')
        if (hasGSAP) {
          gsap.to(extra, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => extra.hidden = true })
        } else {
          extra.style.height = 0; extra.style.opacity = 0; extra.hidden = true
        }
      } else {
        btn.setAttribute('aria-expanded', 'true')
        extra.hidden = false
        const targetH = extra.scrollHeight
        if (hasGSAP) {
          gsap.fromTo(extra, { height: 0, opacity: 0 }, { height: targetH, opacity: 1, duration: 0.4, ease: 'power2.out', onComplete: () => { extra.style.height = 'auto' } })
        } else {
          extra.style.height = targetH + 'px'; extra.style.opacity = 1; setTimeout(() => extra.style.height = 'auto', 400)
        }
      }
    })
  })


 // Parallax for tile images
 if (hasGSAP) {
   document.querySelectorAll('[data-parallax] img').forEach((img) => {
     gsap.to(img, {
       yPercent: 18,
       ease: 'none',
       scrollTrigger: {
         trigger: img.closest('[data-parallax]'),
         start: 'top bottom',
         end: 'bottom top',
         scrub: true,
       }
     })
   })
 }

 // Page transitions for case links
 const transitionLayer = document.querySelector('.page-transition')
 function navigateWithTransition(url) {
   if (!transitionLayer || !hasGSAP) { window.location.href = url; return }
   gsap.set(transitionLayer, { transformOrigin: 'top' })
   gsap.to(transitionLayer, { scaleY: 1, duration: 0.5, ease: 'power3.inOut', onComplete: () => {
     window.location.href = url
   }})
 }
 document.querySelectorAll('a[data-transition="case"]').forEach((link) => {
   link.addEventListener('click', (e) => {
     if (e.metaKey || e.ctrlKey) return // allow new tab
     e.preventDefault()
     navigateWithTransition(link.href)
   })
 })
})
