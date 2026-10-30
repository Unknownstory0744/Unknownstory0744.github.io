document.addEventListener('DOMContentLoaded', () => {
    const lenis = new Lenis({
        duration: 2.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 0.8,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', ({ scroll }) => {
        const header = document.querySelector('header');
        if (header) {
            header.style.transform = `translateY(${scroll * 0.25}px)`;
            header.style.opacity = 1 - (scroll / 800);
        }
    });

    const overlay = document.createElement('div');
    overlay.id = 'transition-overlay';
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.classList.add('fade-out');
    }, 100);

    const audioToggle = document.getElementById('audio-toggle');
    const audioIcon = audioToggle ? audioToggle.querySelector('.audio-icon') : null;
    let isPlaying = false;
    let userManuallyPaused = false;

    const playlist = ['ambient.mp3', 'phool.m4a'];
    let currentTrackIndex = Math.floor(Math.random() * playlist.length);

    const audio = new Audio();
    audio.src = playlist[currentTrackIndex];
    audio.volume = 0.4;

    audio.addEventListener('ended', () => {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        audio.src = playlist[currentTrackIndex];
        if (isPlaying) {
            audio.play().catch(() => {});
        }
    });

    function updateAudioUI(playing) {
        isPlaying = playing;
        if (!audioToggle) return;
        if (playing) {
            audioToggle.classList.add('playing');
            if (audioIcon) audioIcon.textContent = 'Sound On';
        } else {
            audioToggle.classList.remove('playing');
            if (audioIcon) audioIcon.textContent = 'Sound Off';
        }
    }

    function startMusic() {
        if (userManuallyPaused) return;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                updateAudioUI(true);
            }).catch(() => {
                const onFirstInteraction = () => {
                    if (!userManuallyPaused && !isPlaying) {
                        audio.play().then(() => {
                            updateAudioUI(true);
                        }).catch(() => {});
                    }
                };
                ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
                    window.addEventListener(evt, onFirstInteraction, { once: true });
                });
            });
        }
    }

    startMusic();

    if (audioToggle) {
        audioToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isPlaying) {
                audio.pause();
                userManuallyPaused = true;
                updateAudioUI(false);
            } else {
                userManuallyPaused = false;
                audio.play().then(() => {
                    updateAudioUI(true);
                }).catch(err => console.log("Audio play blocked by browser:", err));
            }
        });
    }

    const cursor = document.createElement('div');
    const follower = document.createElement('div');
    cursor.className = 'custom-cursor';
    follower.className = 'custom-cursor-follower';
    document.body.appendChild(cursor);
    document.body.appendChild(follower);

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;

        cursor.style.transform = `translate3d(${cursorX - 15}px, ${cursorY - 15}px, 0)`;
        follower.style.transform = `translate3d(${followerX - 3}px, ${followerY - 3}px, 0)`;

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    function initMagneticElements() {
        const magneticElements = document.querySelectorAll('nav a, .landing-btn, .audio-toggle');
        magneticElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
                cursor.classList.add('active');
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = `translate(0px, 0px)`;
                cursor.classList.remove('active');
            });
        });
    }

    let currentObserver = null;

    function initPageEffects() {
        const fragments = document.querySelectorAll('.memory-fragment');
        if (currentObserver) { currentObserver.disconnect(); }
        
        currentObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = Math.random() * 0.5;
                    entry.target.style.transitionDelay = `${delay}s`;
                    entry.target.classList.add('reveal');
                    currentObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        fragments.forEach(fragment => currentObserver.observe(fragment));

        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".memory-media"), {
                max: 5, speed: 400, glare: true, "max-glare": 0.2,
            });
        }
    }

    async function loadPage(url, push = true) {
        try {
            overlay.classList.remove('fade-out');
            await new Promise(r => setTimeout(r, 800));
            
            const response = await fetch(url);
            const htmlString = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            
            document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
            document.title = doc.title;
            const newNav = doc.querySelector('.nav-links');
            if (newNav) { document.querySelector('.nav-links').innerHTML = newNav.innerHTML; }
            
            window.scrollTo(0, 0);
            lenis.scrollTo(0, {immediate: true});
            
            if (push) { window.history.pushState({path: url}, '', url); }
            
            attachNavigationListeners();
            initPageEffects();
            
            setTimeout(() => { overlay.classList.add('fade-out'); }, 100);
            
        } catch (error) {
            window.location.href = url;
        }
    }

    function attachNavigationListeners() {
        document.querySelectorAll('a').forEach(link => {
            if (link.hostname === window.location.hostname && !link.hash && !link.classList.contains('routed')) {
                link.classList.add('routed');
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const dest = link.getAttribute('href');
                    if (dest) { loadPage(dest); }
                });
            }
        });
        initMagneticElements();
    }

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.path) {
            loadPage(e.state.path, false);
        } else {
            loadPage(window.location.pathname, false);
        }
    });

    attachNavigationListeners();
    initPageEffects();
});
