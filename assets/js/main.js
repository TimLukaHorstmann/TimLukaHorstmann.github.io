function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

let conversationHistory = [];

function scrollChatToBottom() {
    const $chatOutput = $('#chat-output');
    // Using setTimeout to ensure this runs after DOM updates are complete
    setTimeout(() => {
        $chatOutput.animate({ scrollTop: $chatOutput[0].scrollHeight }, 300);
    }, 0);
}

function initializeChatbot() {
    $('#chat-output').append(`
        <div class="chat-message luka">
            <img src="assets/images/luka_cartoon.svg" alt="Luka" class="profile-pic">
            <div class="message-content"><strong>Luka:</strong> Hi! I’m Tim Luka Horstmann. Ask me anything about my CV!</div>
        </div>
    `);
    $('#chat-status').text('Chatbot ready');
    $('#chat-input').prop('disabled', false);
    $('#send-btn').prop('disabled', false);
    scrollChatToBottom();
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
    
    // Add copy functionality
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
    const preserveTerms = {
        'MSc': true, 'BSc': true, 'PhD': true, 'MPhil': true, 
        'Institut Polytechnique': true, 'de Paris': true,
        'RheinMain': true, 'McKinsey': true, 'GitHub': true,
        'JavaScript': true, 'TypeScript': true, 'PyTorch': true,
        'NumPy': true, 'TensorFlow': true, 'LinkedIn': true,
        'GGUF': true, 'TOEFL': true, 'DELF': true, 'DFP': true,
        'IoT': true, 'HTML/CSS': true, 'DevOps': true,
    };
    
    text = text.replace(/<\|[a-z_]+\|>|\[.*?\]/g, "");
    Object.keys(preserveTerms).forEach(term => {
        const termPattern = term.split('').join('\\s*');
        const termRegex = new RegExp(termPattern, 'gi');
        text = text.replace(termRegex, term);
    });
    
    text = text.replace(/\s{2,}/g, ' ');
    text = text.replace(/([a-z])([A-Z][a-z]{2,})/g, '$1 $2');
    text = text.replace(/\s+([.,!?;:])/g, "$1");
    text = text.replace(/([.,!?;:])([a-zA-Z])/g, "$1 $2");
    text = text.replace(/\s+'/g, "'");
    text = text.replace(/\n+/g, "\n").trim();
    
    return text;
}

async function streamChatResponse(query) {
    const hfSpaceUrl = "https://Luka512-website.hf.space";
    const apiUrl = `${hfSpaceUrl}/api/predict`;

    // Append user's message
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
                    <div class="timestamp"></div>
                </div>
            </div>
        `);
        $('#chat-output').append($lukaMessage);

        let finalText = "";
        let currentWord = "";
        let previousToken = "";
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const events = chunk.split("\n\n");
            
            events.forEach(event => {
                if (event.startsWith("data: ")) {
                    const token = event.slice(6).trim();
                    if (token === "[DONE]") return;
                    
                    let spacedToken = token;
                    if (finalText && 
                        /[a-zA-Z0-9]$/.test(finalText) && 
                        /^[a-zA-Z0-9]/.test(token) && 
                        !finalText.endsWith(" ")) {
                        const lastChar = finalText.slice(-1);
                        if (!(
                            (/[a-z]$/.test(lastChar) && /^[A-Z]$/.test(token)) ||
                            (/[A-Z]$/.test(lastChar) && /^[A-Z]$/.test(token) && token.length === 1) ||
                            (/[A-Z]$/.test(lastChar) && /^[A-Za-z]$/.test(token) && 
                             /[A-Z]/.test(previousToken) && previousToken.length === 1)
                        )) {
                            finalText += " ";
                        }
                    }
                    
                    finalText += spacedToken;
                    previousToken = token;
                    currentWord += token;
                    
                    if (currentWord.includes(" ") || /[.!?]$/.test(token)) {
                        const cleanedText = cleanText(finalText);
                        const htmlText = marked.parse(cleanedText, { breaks: true });
                        const sanitizedHtml = DOMPurify.sanitize(htmlText, {
                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
                            ALLOWED_ATTR: { 'a': ['href'] }
                        });                    
                        $lukaMessage.find('.response-text').html(sanitizedHtml);
                        scrollChatToBottom();
                        currentWord = "";
                    }
                }
            });
        }
        
        const cleanedFinalText = cleanText(finalText);
        const htmlText = marked.parse(cleanedFinalText, { breaks: true });
        const sanitizedHtml = DOMPurify.sanitize(htmlText, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
            ALLOWED_ATTR: { 'a': ['href'] }
        });
        $lukaMessage.find('.response-text').html(sanitizedHtml);
        
        $lukaMessage.find('.timestamp').text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        conversationHistory.push({ role: "user", content: query });
        conversationHistory.push({ role: "assistant", content: cleanText(finalText) });
    } catch (error) {
        console.error("Streaming error:", error);
        appendMessage('luka', `Sorry, I encountered an error: ${error.message}`, 'assets/images/luka_cartoon.svg');
    }

    $('.typing-indicator').hide();
    scrollChatToBottom();
}

$(document).ready(function() {
    $('<style>.response-text { white-space: pre-wrap; word-wrap: break-word; word-break: normal; hyphens: auto; line-height: 1.5; display: block; }</style>').appendTo('head');

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
        { id: "sge", lat: 51.6127099067384, lng: 8.332399269599152, title: '<a href="https://www.sge-erwitte.de/" target="_blank">Städtisches Gymnasium Erwitte</a>', description: "Erwitte, Germany <br> Abitur (2019)" },
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

    // Project Card Toggle
    document.querySelectorAll('.project-card').forEach(card => {
        const toggle = card.querySelector('.project-toggle');
        const description = card.querySelector('.project-description');
        toggle.addEventListener('click', () => {
            description.classList.toggle('show');
            toggle.querySelector('i').classList.toggle('fa-chevron-down');
            toggle.querySelector('i').classList.toggle('fa-chevron-up');
        });
    });

    // Form Validation
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

    // AOS Initialization
    AOS.init({ duration: 800, easing: 'slide', once: true });

    // Ripple Effect
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

    initializeChatbot();

    $('#chat-btn').click(function() { $('#chat-modal').show(); });
    $('#close-modal').click(function() { $('#chat-modal').hide(); });

    $('#send-btn').click(async function() {
        const question = $('#chat-input').val().trim();
        if (!question) return;
        $('#chat-input').val('');
        await streamChatResponse(question);
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
    });
});