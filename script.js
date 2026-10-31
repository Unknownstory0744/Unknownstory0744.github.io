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

    const audio = new Audio();
    audio.src = 'phool.m4a';
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

    function sha256(data) {
        const K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const bitLen = bytes.length * 8;
        const padLen = (bytes.length % 64 < 56) ? (56 - (bytes.length % 64)) : (120 - (bytes.length % 64));
        const totalLen = bytes.length + padLen + 8;
        const buf = new Uint8Array(totalLen);
        buf.set(bytes);
        buf[bytes.length] = 0x80;
        const view = new DataView(buf.buffer);
        view.setUint32(totalLen - 4, bitLen, false);
        view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
        const W = new Uint32Array(64);
        for (let i = 0; i < totalLen; i += 64) {
            for (let t = 0; t < 16; t++) W[t] = view.getUint32(i + t * 4, false);
            for (let t = 16; t < 64; t++) {
                const s0 = ((W[t-15] >>> 7) | (W[t-15] << 25)) ^ ((W[t-15] >>> 18) | (W[t-15] << 14)) ^ (W[t-15] >>> 3);
                const s1 = ((W[t-2] >>> 17) | (W[t-2] << 15)) ^ ((W[t-2] >>> 19) | (W[t-2] << 13)) ^ (W[t-2] >>> 10);
                W[t] = (W[t-16] + s0 + W[t-7] + s1) >>> 0;
            }
            let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (let t = 0; t < 64; t++) {
                const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
                const ch = (e & f) ^ ((~e) & g);
                const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
                const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
                const maj = (a & b) ^ (a & c) ^ (b & c);
                const temp2 = (S0 + maj) >>> 0;
                h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
            }
            H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
        }
        const out = new Uint8Array(32);
        const outView = new DataView(out.buffer);
        for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
        return out;
    }

    function rc4(key, data) {
        let s = [], j = 0, x, res = new Uint8Array(data.length);
        for (let i = 0; i < 256; i++) s[i] = i;
        for (let i = 0; i < 256; i++) {
            j = (j + s[i] + key[i % key.length]) % 256;
            x = s[i]; s[i] = s[j]; s[j] = x;
        }
        let i = 0; j = 0;
        for (let k = 0; k < 1536; k++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            x = s[i]; s[i] = s[j]; s[j] = x;
        }
        for (let k = 0; k < data.length; k++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            x = s[i]; s[i] = s[j]; s[j] = x;
            res[k] = data[k] ^ s[(s[i] + s[j]) % 256];
        }
        return res;
    }

    function deriveKey(password, salt) {
        let key = sha256(password + salt);
        for (let i = 0; i < 25000; i++) {
            key = sha256(key);
        }
        return key;
    }

    document.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'unlock-form') {
            e.preventDefault();
            const input = document.getElementById('passcode-input');
            const errorMsg = document.getElementById('error-msg');
            const pwd = input ? input.value.trim() : '';
            if (!pwd) return;

            try {
                const salt = 'aurora_veil_7744';
                const ciphertextBase64 = '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';

                const key = deriveKey(pwd, salt);
                const rawCipher = atob(ciphertextBase64);
                const cipherBytes = new Uint8Array(rawCipher.length);
                for (let i = 0; i < rawCipher.length; i++) {
                    cipherBytes[i] = rawCipher.charCodeAt(i);
                }

                const decBytes = rc4(key, cipherBytes);
                const decStr = new TextDecoder().decode(decBytes);

                if (!decStr.startsWith('VAULT_OK:')) {
                    throw new Error('Invalid passcode');
                }

                const html = decStr.slice(9);
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

    function toggleMenu(forceClose = false) {
        const h = document.getElementById('nav-hamburger');
        const n = document.getElementById('nav-links');
        if (!h || !n) return;
        const isOpen = forceClose ? false : !n.classList.contains('open');
        h.classList.toggle('open', isOpen);
        n.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    document.addEventListener('click', (e) => {
        if (e.target && e.target.closest('#nav-hamburger')) {
            e.stopPropagation();
            toggleMenu();
        } else if (e.target && e.target.closest('.nav-links a')) {
            toggleMenu(true);
        }
    });

    attachNavigationListeners();
    initPageEffects();
});
