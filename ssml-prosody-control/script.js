// Smooth scrolling navigation
document.addEventListener('DOMContentLoaded', function() {
    // Navigation link functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    // Update active navigation link based on scroll position
    function updateActiveNavLink() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Update active link on scroll
    window.addEventListener('scroll', updateActiveNavLink);
    
    // Initial active link update
    updateActiveNavLink();

    // Audio player enhancements
    const audioElements = document.querySelectorAll('audio');
    
    audioElements.forEach(audio => {
        // Add loading state
        audio.addEventListener('loadstart', function() {
            this.parentElement.classList.add('loading');
        });
        
        audio.addEventListener('canplaythrough', function() {
            this.parentElement.classList.remove('loading');
        });
        
        // Pause other audio when one starts playing
        audio.addEventListener('play', function() {
            audioElements.forEach(otherAudio => {
                if (otherAudio !== audio) {
                    otherAudio.pause();
                }
            });
        });

        // Add keyboard accessibility
        audio.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (this.paused) {
                    this.play();
                } else {
                    this.pause();
                }
            }
        });
    });

    // Demo section animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe demo pairs for animation
    const demoPairs = document.querySelectorAll('.demo-pair');
    demoPairs.forEach((pair, index) => {
        pair.style.opacity = '0';
        pair.style.transform = 'translateY(30px)';
        pair.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(pair);
    });

    // Observe overview cards for animation
    const overviewCards = document.querySelectorAll('.overview-card');
    overviewCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.2}s, transform 0.6s ease ${index * 0.2}s`;
        observer.observe(card);
    });

    // Audio comparison highlighting
    const audioItems = document.querySelectorAll('.audio-item');
    audioItems.forEach(item => {
        const audio = item.querySelector('audio');
        
        audio.addEventListener('play', function() {
            item.classList.add('playing');
            // Add subtle glow effect
            item.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)';
        });
        
        audio.addEventListener('pause', function() {
            item.classList.remove('playing');
            item.style.boxShadow = '';
        });
        
        audio.addEventListener('ended', function() {
            item.classList.remove('playing');
            item.style.boxShadow = '';
        });
    });

    // Error handling for audio files
    audioElements.forEach(audio => {
        audio.addEventListener('error', function() {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Audio file not found. Please upload the audio file.';
            errorMsg.style.color = '#e53e3e';
            errorMsg.style.fontSize = '0.9rem';
            errorMsg.style.fontStyle = 'italic';
            
            this.parentElement.appendChild(errorMsg);
            this.style.display = 'none';
        });
    });

    // Header background scroll effect
    const header = document.querySelector('.header');
    const nav = document.querySelector('.nav');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        if (header) {
            header.style.transform = `translateY(${rate}px)`;
        }
        
        // Add background to nav when scrolling
        if (scrolled > 100) {
            nav.style.background = 'rgba(255, 255, 255, 0.95)';
            nav.style.backdropFilter = 'blur(10px)';
        } else {
            nav.style.background = 'rgba(255, 255, 255, 0.9)';
            nav.style.backdropFilter = 'blur(10px)';
        }
    });

    // Copy link functionality for sharing
    function createShareButton() {
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = '<i class="fas fa-share"></i> Share Demo';
        shareBtn.className = 'share-btn';
        shareBtn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 50px;
            cursor: pointer;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        
        shareBtn.addEventListener('click', function() {
            if (navigator.share) {
                navigator.share({
                    title: 'Improving French Synthetic Speech Quality via SSML Prosody Control',
                    text: 'Check out this demo of enhanced French text-to-speech synthesis with SSML prosody control',
                    url: window.location.href
                });
            } else {
                // Fallback: copy URL to clipboard
                navigator.clipboard.writeText(window.location.href).then(() => {
                    shareBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        shareBtn.innerHTML = '<i class="fas fa-share"></i> Share Demo';
                    }, 2000);
                });
            }
        });
        
        shareBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.3)';
        });
        
        shareBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
        });
        
        document.body.appendChild(shareBtn);
    }

    // Create share button
    createShareButton();

    // Performance optimization: Lazy load audio files
    const audioObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const audio = entry.target;
                const sources = audio.querySelectorAll('source');
                sources.forEach(source => {
                    if (source.dataset.src) {
                        source.src = source.dataset.src;
                        source.removeAttribute('data-src');
                    }
                });
                audio.load();
                audioObserver.unobserve(audio);
            }
        });
    }, { rootMargin: '100px' });

    // Uncomment the following lines if you want to implement lazy loading for audio files
    // audioElements.forEach(audio => {
    //     audioObserver.observe(audio);
    // });

    console.log('SSML Prosody Control Demo loaded successfully!');
});
