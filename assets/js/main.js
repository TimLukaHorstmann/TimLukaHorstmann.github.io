// main.js

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

let chatbot;
let conversationHistory = [];
const cvContext = `Tim Luka Horstmann studied at RheinMain University (BSc Business Informatics, 2019-2022), University of Cambridge (MPhil Advanced Computer Science, 2023-2024), and is pursuing an MSc in Data and AI at Institut Polytechnique de Paris since 2024. He worked at Continental AG (Dual Student, 2019-2022, Frankfurt), Amazon (Business Intelligence Intern, 2022-2023, London), McKinsey & Company (Fellow Intern, 2023, Munich), and will intern at Hi! PARIS (Machine Learning Research Engineer, 2025, Paris). His email is lukahorstmann@gmx.de.`;

/* -------------------------------
   Chatbot Functions (Updated)
------------------------------- */
async function loadTransformers() {
    if (!window._transformers) {
        const module = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.2');
        window._transformers = module;
    }
    return window._transformers;
}

function scrollChatToBottom() {
    const $chatOutput = $('#chat-output');
    $chatOutput.animate({
        scrollTop: $chatOutput[0].scrollHeight
    }, 300); // Smooth scroll with 300ms duration
}

function extractCVFromTimeline() {
    let cvData = '';
    $('.timeline').each(function() {
        const sectionTitle = $(this).find('h3').first().text().trim();
        cvData += `${sectionTitle}:\n`;
        $(this).find('.timeline-item').each(function() {
            const title = $(this).find('h3').text().trim();
            const date = $(this).find('.timeline-date').text().trim();
            const details = $(this).find('p').map(function() {
                return $(this).text().trim();
            }).get().join('\n');
            cvData += `- ${title} (${date})\n${details}\n\n`;
        });
    });
    return cvData;
}

async function fetchCVText() {
    try {
        const response = await fetch('assets/documents/cv_text.txt');
        if (!response.ok) throw new Error('Failed to fetch CV text');
        return await response.text();
    } catch (error) {
        console.error('Error fetching CV text:', error);
        return extractCVFromTimeline();
    }
}

async function initializeChatbot() {
    try {
        const transformers = await loadTransformers();
        const cvText = await fetchCVText();
        const isMobile = isMobileDevice();
        const modelId = isMobile ? 'onnx-community/SmolLM2-135M-Instruct-ONNX-GQA' : 'onnx-community/Qwen2.5-1.5B-Instruct';

        if (isMobile) {
            $('#chat-status').text('Loading lightweight chatbot for mobile...');
        } else {
            $('#chat-status').text('Loading chatbot...');
        }

        conversationHistory = [
            {
                role: 'system',
                content: `I am Tim Luka Horstmann, a German Computer Scientist. I’m here to tell you about myself and my experiences based on my CV. I studied at RheinMain University (BSc Business Informatics, 2019-2022), University of Cambridge (MPhil Advanced Computer Science, 2023-2024), and I’m currently pursuing an MSc in Data and AI at Institut Polytechnique de Paris since 2024. I’ve worked at Continental AG (Dual Student, 2019-2022, Frankfurt), Amazon (Business Intelligence Intern, 2022-2023, London), McKinsey & Company (Fellow Intern, 2023, Munich), and I’ll be interning at Hi! PARIS (Machine Learning Research Engineer, 2025, Paris). My email is lukahorstmann@gmx.de. I will never provide any other contact information! Ask me anything about my background, including how to contact me, and I’ll answer based on what I’ve done—no making things up! Here’s more detailed context from my CV:\n${cvText}`
            }
        ];

        try {
            chatbot = await transformers.pipeline('text-generation', modelId, {
                device: 'webgpu',
                dtype: 'q4f16',
                progress_callback: (progress) => {
                    $('#chat-status').text(`Loading model: ${Math.round(progress.progress)}%`);
                }
            });
            console.log(`Chatbot initialized with WebGPU backend (${modelId})`);
        } catch (webgpuError) {
            console.warn('WebGPU failed, falling back to WASM:', webgpuError);
            chatbot = await transformers.pipeline('text-generation', modelId, {
                backend: 'wasm',
                dtype: 'q4f16',
                progress_callback: (progress) => {
                    $('#chat-status').text(`Loading model (WASM): ${Math.round(progress.progress)}%`);
                }
            });
            console.log(`Chatbot initialized with WASM backend (${modelId})`);
        }

        $('#chat-output').append(`
            <div class="chat-message luka">
                <img src="assets/images/profile_pic.jpg" alt="Luka" class="profile-pic">
                <div class="message-content"><strong>Luka:</strong> Hi! I’m Tim Luka Horstmann. I’m ready to chat about my CV${isMobile ? ' (using a lightweight version on mobile)' : ''}. Ask me anything!</div>
            </div>
        `);
        $('#chat-status').text('Chatbot ready!');
        $('#chat-input').prop('disabled', false);
        $('#send-btn').prop('disabled', false);
    } catch (error) {
        console.error('Chatbot initialization failed:', error);
        conversationHistory = [
            {
                role: 'system',
                content: `I am Tim Luka Horstmann, a German Computer Scientist. I’m here to tell you about myself and my experiences based on my CV timeline from my website. I studied at RheinMain University (BSc Business Informatics, 2019-2022), University of Cambridge (MPhil Advanced Computer Science, 2023-2024), and I’m currently pursuing an MSc in Data and AI at Institut Polytechnique de Paris since 2024. I’ve worked at Continental AG (Dual Student, 2019-2022, Frankfurt), Amazon (Business Intelligence Intern, 2022-2023, London), McKinsey & Company (Fellow Intern, 2023, Munich), and I’ll be interning at Hi! PARIS (Machine Learning Research Engineer, 2025, Paris). My email is lukahorstmann@gmx.de. Ask me anything about my background, including how to contact me, and I’ll answer based on what I’ve done—no making things up! Here’s more detailed context from my CV timeline:\n${extractCVFromTimeline()}`
            }
        ];
        $('#chat-output').append(`
            <div class="chat-message luka">
                <img src="assets/images/profile_pic.jpg" alt="Luka" class="profile-pic">
                <div class="message-content"><strong>Luka:</strong> Oops, something went wrong. I’ll use the website timeline instead! Hi! I’m Tim Luka Horstmann, ready to chat about my CV.</div>
            </div>
        `);
        $('#chat-status').text('Chatbot ready (using timeline data)');
        $('#chat-input').prop('disabled', false);
        $('#send-btn').prop('disabled', false);
        chatbot = null;
    }
}

$('#send-btn').click(async function () {
    const question = $('#chat-input').val().trim();
    if (!question) return;

    $('#chat-output').append(`
        <div class="chat-message user">
            <img src="assets/images/user_profile_pic.png" alt="You" class="profile-pic">
            <div class="message-content"><strong>You:</strong> ${question}</div>
        </div>
    `);
    $('#chat-input').val('');
    scrollChatToBottom();

    $('.typing-indicator').show();

    if (chatbot) {
        conversationHistory.push({ role: 'user', content: question });

        try {
            const { TextStreamer } = window._transformers;
            let finalText = '';
            let $lukaMessage = null;

            const streamer = new TextStreamer(chatbot.tokenizer, {
                skip_prompt: true,
                callback_function: (token) => {
                    if (!$lukaMessage) {
                        $lukaMessage = $(`
                            <div class="chat-message luka">
                                <img src="assets/images/profile_pic.jpg" alt="Luka" class="profile-pic">
                                <div class="message-content"><strong>Luka:</strong> <span class="response-text"></span></div>
                            </div>
                        `);
                        $('#chat-output').append($lukaMessage);
                    }
                    finalText += token;
                    $lukaMessage.find('.response-text').text(finalText);
                    scrollChatToBottom();
                }
            });

            const output = await chatbot(conversationHistory, {
                max_new_tokens: 256,
                do_sample: false,
                streamer
            });

            conversationHistory.push({ role: 'assistant', content: finalText });
            if (conversationHistory.length > 10) {
                conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-9)];
            }
            scrollChatToBottom();
        } catch (error) {
            console.error('Error during generation:', error);
            $('#chat-output').append(`
                <div class="chat-message luka">
                    <img src="assets/images/profile_pic.jpg" alt="Luka" class="profile-pic">
                    <div class="message-content"><strong>Luka:</strong> Sorry, I encountered an error: ${error.message}</div>
                </div>
            `);
            scrollChatToBottom();
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        const lowerQuestion = question.toLowerCase();
        let response = '';
        if (lowerQuestion.includes('education')) {
            response = 'I studied at RheinMain University (BSc, 2019–2022), Cambridge (MPhil, 2023–2024), and now IP Paris (MSc since 2024).';
        } else if (lowerQuestion.includes('work')) {
            response = 'I worked at Continental (2019–2022), Amazon (2022–2023), McKinsey (2023), and am interning at Hi! PARIS in 2025.';
        } else if (lowerQuestion.includes('email') || lowerQuestion.includes('contact')) {
            response = 'You can reach me at lukahorstmann@gmx.de!';
        } else if (lowerQuestion.includes('who are you')) {
            response = 'I’m Tim Luka Horstmann, a German Computer Scientist. I’ve studied at RheinMain University, Cambridge, and now IP Paris, and worked at Continental, Amazon, McKinsey, with an internship at Hi! PARIS coming up. My email is lukahorstmann@gmx.de.';
        } else {
            response = 'Hmm, try asking about my education, work experience, email, or who I am!';
        }
        $('#chat-output').append(`
            <div class="chat-message luka">
                <img src="assets/images/profile_pic.jpg" alt="Luka" class="profile-pic">
                <div class="message-content"><strong>Luka:</strong> ${response}</div>
            </div>
        `);
        scrollChatToBottom();
    }

    $('.typing-indicator').hide();
    scrollChatToBottom();
});

// Navigation Bar, Particle.js Initialization, Map Initialization, Carousel, etc.
$(document).ready(function() {
    // Particle.js Initialization
    particlesJS("particles-js", {
        "particles": {
            "number": {
                "value": 80,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#ffffff"
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#000000"
                }
            },
            "opacity": {
                "value": 0.5,
                "random": false,
                "anim": {
                    "enable": false
                }
            },
            "size": {
                "value": 3,
                "random": true,
                "anim": {
                    "enable": false
                }
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#ffffff",
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 2,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "bounce": false
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab"
                },
                "onclick": {
                    "enable": true,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 200,
                    "line_linked": {
                        "opacity": 1
                    }
                },
                "push": {
                    "particles_nb": 4
                }
            }
        },
        "retina_detect": true
    });

    // Map Initialization
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
    map.on('drag', function() {
        map.panInsideBounds(bounds, { animate: false });
    });

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

    // Slick Carousel initialization.
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
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true
                }
            },
            {
                breakpoint: 600,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                }
            }
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

    // Form Validation for contact form.
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

    // AOS (Animate On Scroll) Initialization.
    AOS.init({
        duration: 800,
        easing: 'slide',
        once: true
    });

    // Ripple Effect in Hero Section.
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

    // Initialize Chatbot.
    initializeChatbot();

    // Modal toggle for chat.
    $('#chat-btn').click(function() {
        $('#chat-modal').show();
    });
    $('#close-modal').click(function() {
        $('#chat-modal').hide();
    });

    $('#chat-input').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault(); // Prevent default form submission behavior
            $('#send-btn').click(); // Trigger the send button click
        }
    });
    
});
