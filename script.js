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
    const chosenTrack = playlist[Math.floor(Math.random() * playlist.length)];

    const audio = new Audio();
    audio.src = chosenTrack;
    audio.loop = true;
    audio.volume = 0.4;

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

    document.addEventListener('submit', async (e) => {
        if (e.target && e.target.id === 'unlock-form') {
            e.preventDefault();
            const input = document.getElementById('passcode-input');
            const errorMsg = document.getElementById('error-msg');
            const pwd = input ? input.value : '';
            if (!pwd) return;

            try {
                const saltHex = '41ef93cf6575d40735386596ef7a4fb3';
                const ivHex = '071fde2d613b9721c3900f3a';
                const ciphertextBase64 = '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';

                const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                const ivBytes = new Uint8Array(ivHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                const cipherBytes = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

                const enc = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pwd), { name: 'PBKDF2' }, false, ['deriveKey']);
                const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
                const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, cipherBytes);

                const html = new TextDecoder().decode(decryptedBuffer);
                const lockScreen = document.getElementById('lock-screen');
                const container = document.getElementById('unlocked-content');

                if (lockScreen && container) {
                    lockScreen.style.opacity = '0';
                    setTimeout(() => {
                        lockScreen.style.display = 'none';
                        container.innerHTML = html;
                        container.style.display = 'block';
                        setTimeout(() => { container.style.opacity = '1'; }, 50);
                        initPageEffects();
                    }, 300);
                }
            } catch (err) {
                if (errorMsg) {
                    errorMsg.textContent = 'Incorrect passcode.';
                    errorMsg.style.opacity = '1';
                    setTimeout(() => { errorMsg.style.opacity = '0'; }, 3000);
                }
                if (input) {
                    input.value = '';
                    input.focus();
                }
            }
        }
    });

    attachNavigationListeners();
    initPageEffects();
});
