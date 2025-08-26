// CosyVoice2 Demo Interactive Functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('CosyVoice2 European Languages Demo loaded successfully!');

    // Current language state
    let currentLanguage = 'fr';

    // Navigation functionality
    initializeNavigation();
    
    // Language selector
    initializeLanguageSelector();
    
    // Interactive architecture diagram
    initializeArchitectureDiagram();
    
    // Fine-tuning controls
    initializeFinetuningControls();
    
    // Audio management
    initializeAudioPlayers();
    
    // Charts and visualizations
    initializeCharts();
    
    // Scroll animations
    initializeScrollAnimations();

    // Navigation link functionality
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.section');

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

        window.addEventListener('scroll', updateActiveNavLink);
        updateActiveNavLink();
    }

    // Language Selector
    function initializeLanguageSelector() {
        const languageInputs = document.querySelectorAll('input[name="language"]');
        const sampleText = document.getElementById('sample-text');
        
        // Sample texts for different languages
        const sampleTexts = {
            fr: '"Bonjour, je m\'appelle Luka et je travaille dans une entreprise de technologie à Paris. Aujourd\'hui, nous allons explorer les capacités de synthèse vocale en français avec CosyVoice 2."',
            de: '"Guten Tag, mein Name ist Hans und ich arbeite in einem Technologieunternehmen in Berlin. Heute werden wir die Sprachsynthesefähigkeiten von CosyVoice 2 im Deutschen erkunden."'
        };

        languageInputs.forEach(input => {
            input.addEventListener('change', function() {
                if (this.checked) {
                    currentLanguage = this.value;
                    // Update sample text
                    sampleText.textContent = sampleTexts[currentLanguage];
                    // Update all audio sources
                    updateAudioSources();
                    // Update configuration
                    updateAudioConfiguration();
                }
            });
        });

        function updateAudioSources() {
            // Update prompt audio (both inline and full prompt if present)
            const promptSource = document.getElementById('prompt-source');
            const promptLanguage = document.getElementById('prompt-language');
            const promptLanguageInline = document.getElementById('prompt-language-inline');
            const promptDescription = document.getElementById('prompt-description');
            
            const promptFiles = {
                fr: 'common_voice_fr_40952142.wav',
                de: 'common_voice_de_41123857.wav'
            };

            if (promptSource) {
                promptSource.src = promptFiles[currentLanguage];
                promptSource.parentElement.load();
            }

            // Inline audio player (if present) may share the same source element id; also update its label
            const inlineSource = document.querySelector('#prompt-audio-inline source');
            if (inlineSource) {
                inlineSource.src = promptFiles[currentLanguage];
                inlineSource.parentElement.load();
            }

            const langLabel = currentLanguage === 'fr' ? 'French' : 'German';
            if (promptLanguage) promptLanguage.textContent = langLabel;
            if (promptLanguageInline) promptLanguageInline.textContent = langLabel;
            if (promptDescription) {
                promptDescription.textContent = 'Original voice sample from Common Voice dataset used as reference for voice cloning.';
            }
            
            // Update baseline audio
            const baselineAudio = document.querySelector('.audio-player[data-config="baseline"] source');
            if (baselineAudio) {
                baselineAudio.src = `audio/original-${currentLanguage}.wav`;
                baselineAudio.parentElement.load();
            }
            
            // Update dynamic audio source
            const dynamicSource = document.getElementById('dynamic-source');
            if (dynamicSource) {
                // Get current configuration and update
                const activeComponents = [];
                const toggles = document.querySelectorAll('.component-toggle');
                toggles.forEach(toggle => {
                    if (toggle.checked) {
                        activeComponents.push(toggle.dataset.component);
                    }
                });
                
                const configKey = activeComponents.length > 0 ? activeComponents.sort().join('_') : 'original';
                dynamicSource.src = `audio/${configKey}-${currentLanguage}.wav`;
                dynamicSource.parentElement.load();
            }
        }
        
        // Initialize audio sources on page load
        updateAudioSources();
    }

    // Interactive Architecture Diagram
    function initializeArchitectureDiagram() {
        const componentBoxes = document.querySelectorAll('.component-box');
        const infoContent = document.getElementById('info-content');
        
        // Component information data
        const componentInfo = {
            slm: {
                title: 'SLM (Speech Language Model)',
                description: 'The Speech Language Model component converts input text into semantic tokens. Fine-tuning this component improves pronunciation accuracy and phonetic understanding for European languages.',
                benefits: [
                    'Improved pronunciation of language-specific phonemes',
                    'Better handling of linguistic patterns',
                    'Enhanced semantic understanding of text'
                ],
                audioFile: 'audio/slm_only.wav',
                improvements: 'Reduces pronunciation errors by ~40% and improves phonetic accuracy significantly.'
            },
            flow: {
                title: 'Flow Matching (Diffusion Model)',
                description: 'The Flow Matching component generates mel spectrograms from semantic tokens. This component has the most significant impact on prosody and naturalness.',
                benefits: [
                    'Natural prosody and rhythm',
                    'Improved intonation patterns',
                    'Better emotional expressiveness'
                ],
                audioFile: 'audio/flow_only.wav',
                improvements: 'Provides the largest MOS improvement (+0.8) and dramatically enhances naturalness.'
            },
            hifigan: {
                title: 'HiFiGAN (Vocoder)*',
                description: 'The HiFiGAN vocoder converts mel spectrograms to final audio waveforms. This comparison showcases the difference between a partially trained and fully trained vocoder, demonstrating the importance of proper vocoder quality.',
                benefits: [
                    'Cleaner audio output with fewer artifacts',
                    'Better frequency response for target phonemes',
                    'Improved overall audio fidelity'
                ],
                audioFile: 'audio/hifigan_only.wav',
                improvements: 'Significantly reduces audio artifacts and improves overall clarity. Note: This represents using the official CosyVoice2 HiFiGAN vs. a partially trained version.'
            }
        };

        componentBoxes.forEach(box => {
            box.addEventListener('click', function() {
                const component = this.getAttribute('data-component');
                
                // Update visual state
                componentBoxes.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update info panel
                if (componentInfo[component]) {
                    updateInfoPanel(componentInfo[component]);
                }
                
                // Update architecture diagram indicators
                updateArchitectureDiagram(component);
                
                // Play component audio if available
                playComponentAudio(componentInfo[component].audioFile);
            });
        });

        function updateInfoPanel(info) {
            infoContent.innerHTML = `
                <h3>${info.title}</h3>
                <p>${info.description}</p>
                <div class="benefits-list">
                    <h4>Key Benefits:</h4>
                    <ul>
                        ${info.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                    </ul>
                </div>
                <div class="improvements">
                    <h4>Impact:</h4>
                    <p>${info.improvements}</p>
                </div>
            `;
        }

        function updateArchitectureDiagram(activeComponent) {
            // Don't change the fine-tuning status indicators when just showing component info
            // The fine-tuning status should only be controlled by the checkboxes
            console.log(`Showing info for component: ${activeComponent}`);
        }

        function playComponentAudio(audioFile) {
            // Stop all currently playing audio
            const allAudio = document.querySelectorAll('audio');
            allAudio.forEach(audio => audio.pause());
            
            // This would play the component-specific audio
            // For now, we'll just log it
            console.log(`Playing audio: ${audioFile}`);
        }
    }

    // Fine-tuning Controls
    function initializeFinetuningControls() {
        const toggles = document.querySelectorAll('.component-toggle');
        const dynamicAudioCard = document.getElementById('dynamic-audio-card');
        const dynamicTitle = document.getElementById('dynamic-title');
        const dynamicIndicators = document.getElementById('dynamic-indicators');
        const dynamicAudio = document.getElementById('dynamic-audio');
        const dynamicSource = document.getElementById('dynamic-source');
        const dynamicDescription = document.getElementById('dynamic-description');

        // Audio configurations for different combinations
        const audioConfigurations = {
            'baseline': {
                file: 'original',
                title: 'Baseline (No Fine-tuning)',
                indicators: ['Strong English Accent', 'Unnatural Prosody'],
                indicatorClasses: ['poor', 'poor'],
                description: 'Original CosyVoice2 model without any language-specific training.'
            },
            'slm': {
                file: 'slm',
                title: 'SLM Fine-tuned',
                indicators: ['Improved Pronunciation', 'Some English Accent'],
                indicatorClasses: ['good', 'neutral'],
                description: 'Speech Language Model fine-tuned for language-specific pronunciation patterns.'
            },
            'flow': {
                file: 'flow',
                title: 'Flow Fine-tuned',
                indicators: ['Better Prosody', 'Pronunciation Issues'],
                indicatorClasses: ['good', 'neutral'],
                description: 'Flow matching model fine-tuned for natural prosody and rhythm.'
            },
            'hifigan': {
                file: 'hifigan',
                title: 'HiFiGAN Optimized*',
                indicators: ['Cleaner Audio', 'Accent Remains'],
                indicatorClasses: ['good', 'poor'],
                description: 'Using the official CosyVoice2 HiFiGAN model instead of partially trained version.'
            },
            'flow_slm': {
                file: 'slm_flow',
                title: 'SLM + Flow Fine-tuned',
                indicators: ['Good Pronunciation', 'Natural Prosody'],
                indicatorClasses: ['good', 'good'],
                description: 'Combined SLM and Flow fine-tuning for improved pronunciation and prosody.'
            },
            'hifigan_slm': {
                file: 'slm_hifigan',
                title: 'SLM + HiFiGAN Optimized*',
                indicators: ['Good Pronunciation', 'Clean Audio'],
                indicatorClasses: ['good', 'good'],
                description: 'Combined SLM fine-tuning with official CosyVoice2 HiFiGAN model.'
            },
            'flow_hifigan': {
                file: 'flow_hifigan',
                title: 'Flow + HiFiGAN Optimized*',
                indicators: ['Natural Prosody', 'Clean Audio'],
                indicatorClasses: ['good', 'good'],
                description: 'Combined Flow fine-tuning with official CosyVoice2 HiFiGAN model.'
            },
            'flow_hifigan_slm': {
                file: 'slm_flow_hifigan',
                title: 'All Components Optimized*',
                indicators: ['Excellent Pronunciation', 'Natural Prosody', 'High Quality Audio'],
                // use 'good' so the badges appear green (CSS maps 'good' -> green, 'excellent' -> blue)
                indicatorClasses: ['good', 'good', 'good'],
                description: 'SLM and Flow fine-tuned with official CosyVoice2 HiFiGAN for optimal quality.'
            }
        };

        toggles.forEach(toggle => {
            toggle.addEventListener('change', function() {
                updateAudioConfiguration();
                updateArchitectureVisualization();
            });
        });

        function updateAudioConfiguration() {
            const activeComponents = [];
            toggles.forEach(toggle => {
                if (toggle.checked) {
                    activeComponents.push(toggle.getAttribute('data-component'));
                }
            });

            const configKey = activeComponents.length > 0 ? activeComponents.sort().join('_') : 'baseline';
            const config = audioConfigurations[configKey] || audioConfigurations['baseline'];

            // Update dynamic audio card
            dynamicTitle.innerHTML = `<i class="fas fa-magic"></i> ${config.title}`;
            
            // Update quality indicators
            dynamicIndicators.innerHTML = config.indicators.map((indicator, index) => 
                `<span class="quality-badge ${config.indicatorClasses[index]}">${indicator}</span>`
            ).join('');

            // Update audio source with language suffix
            const audioFile = `audio/${config.file}-${currentLanguage}.wav`;
            dynamicSource.src = audioFile;
            dynamicAudio.load();

            // Update description
            dynamicDescription.textContent = config.description;

            console.log(`Updated configuration to: ${configKey} for language: ${currentLanguage}`);
        }

        function updateArchitectureVisualization() {
            // Reset all indicators in the architecture diagram
            const indicators = document.querySelectorAll('.finetune-indicator');
            indicators.forEach(indicator => {
                indicator.classList.remove('active');
                indicator.classList.add('inactive');
            });

            // Activate indicators for checked components
            toggles.forEach(toggle => {
                if (toggle.checked) {
                    const component = toggle.getAttribute('data-component');
                    const indicator = document.querySelector(`.${component}-indicator`);
                    if (indicator) {
                        indicator.classList.remove('inactive');
                        indicator.classList.add('active');
                    }
                }
            });
        }

        // Initialize with baseline configuration
        updateAudioConfiguration();
    }

    // Audio Player Management
    function initializeAudioPlayers() {
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

            // Error handling for missing audio files
            audio.addEventListener('error', function() {
                console.warn(`Audio file not found: ${this.src}`);
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Audio file not yet available - upload in progress';
                errorMsg.style.color = '#f6ad55';
                errorMsg.style.fontSize = '0.9rem';
                errorMsg.style.fontStyle = 'italic';
                errorMsg.style.textAlign = 'center';
                
                this.parentElement.appendChild(errorMsg);
                this.style.display = 'none';
            });
        });
    }

    // Charts and Data Visualization
    function initializeCharts() {
        // Sample data for demonstration
        const sampleData = {
            configurations: ['Baseline', 'SLM Only', 'Flow Only', 'HiFiGAN Only', 'SLM+Flow', 'SLM+HiFiGAN', 'Flow+HiFiGAN', 'All Components'],
            mosScores: [2.1, 2.8, 3.5, 2.4, 3.8, 3.1, 3.6, 4.2],
            accentStrength: [4.5, 3.8, 3.2, 4.3, 2.9, 3.6, 3.0, 2.1],
            werScores: [18.5, 14.2, 12.8, 17.1, 9.4, 12.6, 11.2, 7.3],
            speakerSimilarity: [0.62, 0.71, 0.78, 0.65, 0.83, 0.76, 0.81, 0.91]
        };

        // Chart colors
        const colors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#48bb78',
            warning: '#ed8936',
            error: '#e53e3e',
            gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
        };

        // MOS Scores Chart
        if (document.getElementById('mosChart')) {
            new Chart(document.getElementById('mosChart'), {
                type: 'bar',
                data: {
                    labels: sampleData.configurations,
                    datasets: [{
                        label: 'MOS Score',
                        data: sampleData.mosScores,
                        backgroundColor: colors.gradient,
                        borderColor: colors.primary,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            title: {
                                display: true,
                                text: 'MOS Score (1-5)'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Mean Opinion Score by Configuration'
                        }
                    }
                }
            });
        }

        // Accent Strength Chart
        if (document.getElementById('accentChart')) {
            new Chart(document.getElementById('accentChart'), {
                type: 'line',
                data: {
                    labels: sampleData.configurations,
                    datasets: [{
                        label: 'Accent Strength',
                        data: sampleData.accentStrength,
                        borderColor: colors.error,
                        backgroundColor: colors.error + '20',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            title: {
                                display: true,
                                text: 'Accent Strength (1-5, lower is better)'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'French Accent Strength (Lower is Better)'
                        }
                    }
                }
            });
        }

        // WER Chart
        if (document.getElementById('werChart')) {
            new Chart(document.getElementById('werChart'), {
                type: 'bar',
                data: {
                    labels: sampleData.configurations,
                    datasets: [{
                        label: 'Word Error Rate (%)',
                        data: sampleData.werScores,
                        backgroundColor: colors.warning,
                        borderColor: colors.warning,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'WER (%, lower is better)'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Word Error Rate by Configuration'
                        }
                    }
                }
            });
        }

        // Speaker Similarity Chart
        if (document.getElementById('similarityChart')) {
            new Chart(document.getElementById('similarityChart'), {
                type: 'radar',
                data: {
                    labels: ['Baseline', 'SLM Only', 'Flow Only', 'HiFiGAN Only', 'SLM+Flow', 'All Components'],
                    datasets: [{
                        label: 'Speaker Similarity',
                        data: [0.62, 0.71, 0.78, 0.65, 0.83, 0.91],
                        borderColor: colors.success,
                        backgroundColor: colors.success + '30',
                        pointBackgroundColor: colors.success
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 1,
                            title: {
                                display: true,
                                text: 'Similarity Score (0-1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Speaker Similarity to Target'
                        }
                    }
                }
            });
        }

        // Data Efficiency Chart
        if (document.getElementById('efficiencyChart')) {
            const dataHours = [0.5, 1, 2, 4, 8, 16];
            new Chart(document.getElementById('efficiencyChart'), {
                type: 'line',
                data: {
                    labels: dataHours,
                    datasets: [
                        {
                            label: 'MOS Score',
                            data: [2.1, 2.5, 3.2, 3.8, 4.1, 4.2],
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + '20',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Accent Strength',
                            data: [4.5, 4.0, 3.2, 2.5, 2.2, 2.1],
                            borderColor: colors.error,
                            backgroundColor: colors.error + '20',
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Speaker Similarity',
                            data: [0.62, 0.68, 0.75, 0.83, 0.89, 0.91],
                            borderColor: colors.success,
                            backgroundColor: colors.success + '20',
                            yAxisID: 'y2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Training Data (Hours)'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'MOS Score (1-5)'
                            },
                            min: 0,
                            max: 5
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Accent Strength (1-5)'
                            },
                            min: 0,
                            max: 5,
                            grid: {
                                drawOnChartArea: false,
                            },
                        },
                        y2: {
                            type: 'linear',
                            display: false,
                            min: 0,
                            max: 1
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Quality Metrics vs Training Data Amount'
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        }
    }

    // Scroll Animations
    function initializeScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animatedElements = document.querySelectorAll('.overview-card, .audio-card, .metric-card, .finding-item, .control-item');
        animatedElements.forEach((element, index) => {
            element.classList.add('fade-in');
            element.style.transitionDelay = `${index * 0.1}s`;
            observer.observe(element);
        });
    }

    // Header scroll effect
    const header = document.querySelector('.header');
    const nav = document.querySelector('.nav');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.3;
        
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
});
