function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

let conversationHistory = [];

// Optimized scrollChatToBottom function
function scrollChatToBottom() {
    const $chatOutput = $('.modal-body');
    if (!$chatOutput.length) return;

    const scrollContainer = $chatOutput[0];
    const scrollToBottom = () => {
        scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
        });
    };

    // Immediate scroll
    scrollToBottom();

    // Schedule scroll with requestAnimationFrame for rendering sync
    requestAnimationFrame(scrollToBottom);

    // Retry scroll after a short delay to handle DOM updates
    setTimeout(scrollToBottom, 100);

    // Additional retry for slow rendering
    setTimeout(scrollToBottom, 300);
}

let chatbotInitialized = false;

// Initialize chatbot
async function initializeChatbot() {
    $('#chat-status').text('Checking service availability...');
    $('#chat-input').prop('disabled', true);
    $('#send-btn').prop('disabled', true);

    try {
        const healthResponse = await fetch("https://Luka512-website.hf.space/health");
        if (!healthResponse.ok) {
            throw new Error(`Health check failed: ${healthResponse.status}`);
        }

        const healthData = await healthResponse.json();
        if (healthData.status !== "healthy") {
            throw new Error("Service is not healthy");
        }

        const modelInfoResponse = await fetch("https://Luka512-website.hf.space/model_info");
        if (modelInfoResponse.ok) {
            const modelInfo = await modelInfoResponse.json();
            const modelName = "Deep Cogito Cogito v1-preview";
            $('#chat-footer').html(`<small class="model-info">Powered by ${modelName}</small>`);
        }

        // Only add welcome message if not already initialized
        if (!chatbotInitialized) {
            $('#chat-output').append(`
                <div class="chat-message luka">
                    <img src="assets/images/luka_cartoon.svg" alt="Luka" class="profile-pic">
                    <div class="message-content"><strong>Luka:</strong> Hi! I'm Tim Luka Horstmann. Ask me anything about my CV!</div>
                </div>
            `);
            chatbotInitialized = true;
        }

        $('#chat-status').text('Chatbot ready (first response may take a moment).');
        $('#chat-input').prop('disabled', false);
        $('#send-btn').prop('disabled', false);
        scrollChatToBottom();
        return true;
    } catch (error) {
        console.error("Chatbot initialization error:", error);
        $('#chat-status').text('Service unavailable. Please try again later.');

        // Only add error message if it doesn't exist yet
        if ($('#chat-output .system').length === 0) {
            $('#chat-output').append(`
                <div class="chat-message system">
                    <div class="message-content">
                        <strong>System:</strong> The chatbot service is currently unavailable. Please try again later.
                    </div>
                </div>
            `);
        }

        scrollChatToBottom();
        return false;
    }
}

function appendMessage(role, content, profilePic) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const $message = $(`
        <div class="chat-message ${role}">
            <img src="${profilePic}" alt="${role}" class="profile-pic">
            <div class="message-content">
                <strong>${role.charAt(0).toUpperCase() + role.slice(1)}:</strong> 
                <span class="response-text">${content}</span>
                <div class="message-footer">
                    <div class="timestamp">${timestamp}</div>
                    ${role === 'luka' ? '<button class="copy-btn" title="Copy to clipboard"><i class="fas fa-copy"></i></button>' : ''}
                </div>
            </div>
        </div>
    `);

    if (role === 'luka') {
        $message.find('.copy-btn').on('click', function() {
            const textToCopy = $(this).closest('.message-content').find('.response-text').text();
            navigator.clipboard.writeText(textToCopy).then(() => {
                $(this).html('<i class="fas fa-check"></i>');
                setTimeout(() => {
                    $(this).html('<i class="fas fa-copy"></i>');
                }, 2000);
            });
        });
    }

    $('#chat-output').append($message);
    scrollChatToBottom();
}

function cleanText(text) {
    // const preserveTerms = {
    //     'MSc': true, 'BSc': true, 'PhD': true, 'MPhil': true,
    //     'Institut Polytechnique': true, 'de Paris': true,
    //     'RheinMain': true, 'McKinsey': true, 'GitHub': true,
    //     'JavaScript': true, 'TypeScript': true, 'PyTorch': true,
    //     'NumPy': true, 'TensorFlow': true, 'LinkedIn': true,
    //     'GGUF': true, 'TOEFL': true, 'DELF': true, 'DFP': true,
    //     'IoT': true, 'HTML/CSS': true, 'DevOps': true,
    // };

    // text = text.replace(/<\|[a-z_]+\|>|\[.*?\]/g, "");
    // Object.keys(preserveTerms).forEach(term => {
    //     const termPattern = term.split('').join('\\s*');
    //     const termRegex = new RegExp(termPattern, 'gi');
    //     text = text.replace(termRegex, term);
    // });

    // text = text.replace(/\s{2,}/g, ' ');
    // text = text.replace(/([a-z])([A-Z][a-z]{2,})/g, '$1 $2');
    // text = text.replace(/\s+([.,!?;:])/g, "$1");
    // text = text.replace(/([.,!?;:])([a-zA-Z])/g, "$1 $2");
    // text = text.replace(/\s+'/g, "'");
    // text = text.replace(/\n+/g, "\n").trim();

    return text;
}

async function streamChatResponse(query) {
    const hfSpaceUrl = "https://Luka512-website.hf.space";
    const apiUrl = `${hfSpaceUrl}/api/predict`;

    $('#chat-output').append(`
        <div class="chat-message user">
            <img src="assets/images/user_profile_pic.png" alt="You" class="profile-pic">
            <div class="message-content"><strong>You:</strong> ${query}
                <div class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>
    `);
    scrollChatToBottom();
    $('.typing-indicator').show();

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query, history: conversationHistory })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const $lukaMessage = $(`
            <div class="chat-message luka">
                <img src="assets/images/luka_cartoon.svg" alt="Luka" class="profile-pic">
                <div class="message-content"><strong>Luka:</strong> <span class="response-text"></span>
                    <div class="message-footer">
                        <div class="timestamp"></div>
                        <button class="copy-btn" title="Copy to clipboard"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
            </div>
        `);
        $('#chat-output').append($lukaMessage);
        scrollChatToBottom();

        $lukaMessage.find('.copy-btn').on('click', function() {
            const textToCopy = $(this).closest('.message-content').find('.response-text').text();
            navigator.clipboard.writeText(textToCopy).then(() => {
                $(this).html('<i class="fas fa-check"></i>');
                setTimeout(() => {
                    $(this).html('<i class="fas fa-copy"></i>');
                }, 2000);
            });
        });

        let finalText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const events = chunk.split("\n\n");

            events.forEach(event => {
                if (event.startsWith("data: ")) {
                    const token = event.slice(6);
                    if (token === "[DONE]") return;

                    finalText += token;
                    
                    console.log("Token:", token);
                    console.log("Final text:", finalText);

                    const htmlText = marked.parse(finalText);
                    const sanitizedHtml = DOMPurify.sanitize(htmlText, {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4'],
                        ALLOWED_ATTR: { 'a': ['href', 'target', 'rel'] }
                    });
                    $lukaMessage.find('.response-text').html(sanitizedHtml);
                    scrollChatToBottom();
                }
            });
        }

        const cleanedFinalText = cleanText(finalText);
        
        // Finally parse into HTML
        const htmlText = marked.parse(cleanedFinalText);
        const sanitizedHtml = DOMPurify.sanitize(htmlText, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4'],
            ALLOWED_ATTR: { 'a': ['href', 'target', 'rel'] }
        });
        $lukaMessage.find('.response-text').html(sanitizedHtml);

        $lukaMessage.find('.timestamp').text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        conversationHistory.push({ role: "user", content: query });
        conversationHistory.push({ role: "assistant", content: cleanText(finalText) });

        scrollChatToBottom();
    } catch (error) {
        console.error("Streaming error:", error);
        appendMessage('luka', `Sorry, I encountered an error: ${error.message}`, 'assets/images/luka_cartoon.svg');
    }

    $('.typing-indicator').hide();
    scrollChatToBottom();
}

$(document).ready(function() {
    particlesJS("particles-js", {
        "particles": {
            "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": "#ffffff" },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.5 },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4, "width": 1 },
            "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" }, "resize": true },
            "modes": { "grab": { "distance": 200, "line_linked": { "opacity": 1 } }, "push": { "particles_nb": 4 } }
        },
        "retina_detect": true
    });

    var map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
        tap: false
    }).setView([48.8566, 2.3522], 4);

    var southWest = L.latLng(35, -10);
    var northEast = L.latLng(60, 24);
    var bounds = L.latLngBounds(southWest, northEast);
    map.setMaxBounds(bounds);
    map.on('drag', function() { map.panInsideBounds(bounds, { animate: false }); });

    const key = 'moHcWGL55oQVePpoGrB5';
    L.maptilerLayer({
        apiKey: key,
        style: 'c9280907-adb2-45e8-8a4c-8054cc121082',
        noWrap: true,
        attribution: false
    }).addTo(map);

    var emojiIcon = L.divIcon({
        className: 'emoji-icon',
        html: '📍',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });

    var locations = [
        { id: "ip-paris", lat: 48.7134020130425, lng: 2.200214340663505, title: '<a href="https://www.ip-paris.fr/" target="_blank">Institut Polytechnique de Paris</a>', description: "Palaiseau, France <br> PhD Track in Computer Science <br> MSc in Data and Artificial Intelligence (2024-2025)" },
        { id: "cambridge", lat: 52.20560907290666, lng: 0.11312239071815315, title: '<a href="https://www.cam.ac.uk/" target="_blank">University of Cambridge</a>', description: "Cambridge, UK <br> MPhil in Advanced Computer Science (2023-2024)" },
        { id: "hsrm", lat: 50.09835443081745, lng: 8.215862348868724, title: '<a href="https://www.hs-rm.de/" target="_blank">RheinMain University of Applied Sciences</a>', description: "Wiesbaden, Germany <br> BSc in Business Informatics (2019-2022)" },
        { id: "hi_paris", lat: 48.75743723363367, lng: 2.1691683781847924, title: '<a href="https://www.hi-paris.fr/" target="_blank">Hi! PARIS</a>', description: "Paris, France <br> Machine Learning Research Engineer Intern (2025)" },
        { id: "mck", lat: 48.14334819083518, lng: 11.562918373179789, title: '<a href="https://www.mckinsey.com/" target="_blank">McKinsey & Company</a>', description: "Munich, Germany <br> Fellow Intern (2023)" },
        { id: "amazon", lat: 51.52191542111632, lng: -0.07924095706239208, title: '<a href="https://www.amazon.com/" target="_blank">Amazon</a>', description: "London, UK <br> Business Intelligence Intern (2022-2023)" },
        { id: "sge", lat: 51.6127099067384, lng: 8.332399269599152, title: '<a href="https://www.gymnasium-erwitte.de/" target="_blank">Städtisches Gymnasium Erwitte</a>', description: "Erwitte, Germany <br> Abitur (2019)" },
        { id: "continental", lat: 50.135490818761454, lng: 8.594796479427476, title: '<a href="https://www.continental.com/" target="_blank">Continental AG</a>', description: "Frankfurt am Main, Germany <br> Dual Student (2019-2022)" }
    ];

    var markers = {};
    locations.forEach(function(location) {
        var marker = L.marker([location.lat, location.lng], { icon: emojiIcon }).addTo(map)
            .bindPopup('<b>' + location.title + '</b><br>' + location.description);
        markers[location.id] = marker;
    });

    locations.forEach(function(location) {
        var marker = markers[location.id];
        marker.on('click', function() {
            const timelineItem = document.querySelector('.timeline-item[data-marker-id="' + location.id + '"]');
            if (timelineItem) {
                timelineItem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                highlightTimelineItem(timelineItem);
            }
        });
    });

    function highlightTimelineItem(item) {
        document.querySelectorAll('.timeline-item').forEach(it => it.classList.remove('highlight'));
        item.classList.add('highlight');
        setTimeout(() => item.classList.remove('highlight'), 3000);
    }

    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', () => {
            const markerId = item.getAttribute('data-marker-id');
            const marker = markers[markerId];
            if (marker) {
                map.flyTo(marker.getLatLng(), 8, { animate: true, duration: 1.5 });
                marker.openPopup();
                highlightTimelineItem(item);
            }
        });
    });

    $('.carousel').slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        arrows: true,
        dots: true,
        autoplay: true,
        autoplaySpeed: 3000,
        lazyLoad: 'ondemand',
        vertical: false,
        responsive: [
            { breakpoint: 1024, settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: true } },
            { breakpoint: 600, settings: { slidesToShow: 1, slidesToScroll: 1 } }
        ]
    });

    document.querySelectorAll('.project-card').forEach(card => {
        const toggle = card.querySelector('.project-toggle');
        const description = card.querySelector('.project-description');
        toggle.addEventListener('click', () => {
            description.classList.toggle('show');
            toggle.querySelector('i').classList.toggle('fa-chevron-down');
            toggle.querySelector('i').classList.toggle('fa-chevron-up');
        });
    });

    $('form.needs-validation').on('submit', function(e) {
        const name = $('#name').val().trim();
        const email = $('#email').val().trim();
        const message = $('#message').val().trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (name === '' || email === '' || message === '') {
            alert('Please fill in all fields.');
            e.preventDefault();
            return false;
        }
        if (!emailPattern.test(email)) {
            alert('Please enter a valid email address.');
            e.preventDefault();
            return false;
        }
        return true;
    });

    AOS.init({ duration: 800, easing: 'slide', once: true });

    function createRipple(event) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        const size = 50;
        ripple.style.width = ripple.style.height = `${size}px`;
        const rect = event.target.getBoundingClientRect();
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        document.querySelector('.hero-section').appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }
    document.querySelector('.hero-section').addEventListener('click', createRipple);

    $('#chat-modal .modal-footer').append('<div id="chat-footer" class="chat-footer"></div>');

    // Initialize on page load
    initializeChatbot();

    $('#chat-btn').click(async function() {
        $('body').addClass('modal-open');
        $('#chat-modal').show();
        $('body').css({
            'overflow': 'hidden',
            'position': 'fixed',
            'width': '100%',
            'height': '100%'
        });

        // Check chatbot status when opening modal
        await initializeChatbot();

        scrollChatToBottom();
        setTimeout(scrollChatToBottom, 100);
        setTimeout(scrollChatToBottom, 300);
    });

    // Event listener for the new floating chat button
    $('#floating-chat-btn').click(async function() {
        $('#chat-modal').show();
        $('body').addClass('modal-open'); // Prevent background scroll
        // Initialize chatbot if not already done
        if (!chatbotInitialized) {
            chatbotInitialized = await initializeChatbot();
        } else {
            // Ensure input is enabled if already initialized
            $('#chat-input').prop('disabled', false);
            $('#send-btn').prop('disabled', false);
        }
        scrollChatToBottom(); // Scroll after showing
        $('#chat-input').focus(); // Focus input field
    });

    $('#close-modal').click(function() {
        $('body').removeClass('modal-open');
        $('body').css({
            'overflow': '',
            'position': '',
            'width': '',
            'height': ''
        });
        $('#chat-modal').hide();
    });

    $('#send-btn').click(async function() {
        const question = $('#chat-input').val().trim();
        if (!question) return;
        $('#chat-input').val('');
        await streamChatResponse(question);
        scrollChatToBottom();
        setTimeout(scrollChatToBottom, 100);
        setTimeout(scrollChatToBottom, 300);
    });

    $('#chat-input').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            $('#send-btn').click();
        }
    });

    $('#clear-chat-btn').click(function() {
        $('#chat-output').empty();
        conversationHistory = [];
        appendMessage('luka', 'Chat cleared! How can I assist you now?', 'assets/images/luka_cartoon.svg');
        scrollChatToBottom();
    });

    // MutationObserver for chat output changes
    const chatOutput = document.getElementById('chat-output');
    if (chatOutput) {
        const observer = new MutationObserver(function() {
            scrollChatToBottom();
        });
        observer.observe(chatOutput, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    marked.setOptions({
        gfm: true,
        breaks: true,      // don't convert every single newline to <br>
        headerIds: false,
        mangle: false,
        smartLists: true    // enable smarter list parsing
      });
      
    if ($('.subtle-timeline').length) {
        // Find which item is active in the HTML
        const activePointIndex = parseInt($('.timeline-point.active').data('index'));
        const activeNewsIndex = parseInt($('.news-item.active').data('index'));
        // Use the active news index for initialization (this will be 7 based on your HTML)
        let currentIndex = activePointIndex !== undefined ? activePointIndex : 0;
        
        const totalPoints = $('.timeline-point').length;
        
        // Handle timeline point clicks
        $('.timeline-point').on('click', function() {
            const index = parseInt($(this).data('index'));
            navigateToNewsItem(index);
        });
        
        // When the document loads, also update these handlers
        $('.prev-arrow').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                // Now prev goes to older news (lower index)
                navigateToNewsItem(currentIndex - 1);
            }
        });

        $('.next-arrow').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                // Now next goes to newer news (higher index)
                navigateToNewsItem(currentIndex + 1);
            }
        });
        
        // Navigation function
        function navigateToNewsItem(index) {
            // Update active state
            $('.timeline-point').removeClass('active');
            $(`.timeline-point[data-index="${index}"]`).addClass('active');
            
            // Update content with fade effect
            $('.news-item').removeClass('active');
            $(`.news-item[data-index="${index}"]`).addClass('active');
            
            // Update current index
            currentIndex = index;
            
            // Update navigation state
            updateNewsNavigation();
            
            // Update timeline position (for wheel effect)
            updateTimelinePosition();
        }
        
        function updateNewsNavigation() {
            // Handle prev button state (prev now goes to older items - lower index)
            if (currentIndex === 0) {
                $('.prev-arrow').addClass('disabled');
            } else {
                $('.prev-arrow').removeClass('disabled');
            }
            
            // Handle next button state (next now goes to newer items - higher index)
            if (currentIndex === totalPoints - 1) {
                $('.next-arrow').addClass('disabled');
            } else {
                $('.next-arrow').removeClass('disabled');
            }
        }
        
        // Initialize
        updateNewsNavigation();
        
        $(document).on('keydown', function(e) {
            if ($('.subtle-timeline').is(':visible')) {
                if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    // Left arrow goes to older news
                    navigateToNewsItem(currentIndex - 1);
                } else if (e.key === 'ArrowRight' && currentIndex < totalPoints - 1) {
                    // Right arrow goes to newer news
                    navigateToNewsItem(currentIndex + 1);
                }
            }
        });
    }

    // Add the wheel effect function
    function updateTimelinePosition() {
        const timelinePoints = $('.timeline-points');
        const timelineWidth = timelinePoints.width();
        const activePoint = $('.timeline-point.active');
        const pointWidth = activePoint.outerWidth();
        
        if (activePoint.length) {
            // Get the active point's position relative to the timeline
            const activeIndex = parseInt(activePoint.data('index'));
            const totalPoints = $('.timeline-point').length;
            
            // Calculate the target position to center the active point
            const pointPosition = activePoint.position().left;
            const centerPosition = (timelineWidth / 2) - (pointWidth / 2);
            const translateX = centerPosition - pointPosition;
            
            // Apply 3D rotation effect (subtle wheel-like rotation)
            // Scale the rotation based on the position in the timeline
            $('.timeline-point').each(function(idx) {
                const point = $(this);
                const distanceFromActive = Math.abs(activeIndex - idx);
                const maxDistance = Math.max(activeIndex, totalPoints - activeIndex - 1);
                const rotationX = distanceFromActive > 0 ? (distanceFromActive / maxDistance) * 15 : 0; // Max 15 degrees rotation
                
                // Apply more rotation to points further from the active one
                if (idx < activeIndex) {
                    // Points to the left (past) rotate down
                    point.css('transform', `rotateX(${rotationX}deg) scale(${idx === activeIndex ? 1.2 : 1})`);
                    point.css('opacity', 1 - (distanceFromActive * 0.15)); // Fade out distant points
                } else if (idx > activeIndex) {
                    // Points to the right (future) rotate up
                    point.css('transform', `rotateX(-${rotationX}deg) scale(${idx === activeIndex ? 1.2 : 1})`);
                    point.css('opacity', 1 - (distanceFromActive * 0.15)); // Fade out distant points
                } else {
                    // Active point is flat and fully opaque
                    point.css('transform', 'rotateX(0deg) scale(1.2)');
                    point.css('opacity', 1);
                }
            });
            
            // For small screens, add subtle horizontal translation to emphasize the active point
            if (window.innerWidth < 768) {
                timelinePoints.css('transform', `translateX(${translateX * 0.15}px)`); // Less movement on mobile
            } else {
                timelinePoints.css('transform', `translateX(${translateX * 0.08}px)`); // Subtle movement
            }
        }
    }
    
    // Initialize the timeline position
    updateTimelinePosition();
    
    // Make sure the timeline position updates on window resize
    $(window).on('resize', function() {
        updateTimelinePosition();
    });

    $(document).on('keydown', function(e) {
        if ($('.subtle-timeline').is(':visible')) {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                // Left arrow goes to older news
                navigateToNewsItem(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && currentIndex < totalPoints - 1) {
                // Right arrow goes to newer news
                navigateToNewsItem(currentIndex + 1);
            }
        }
    });
});