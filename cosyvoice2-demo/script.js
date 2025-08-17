// CosyVoice2 Demo Interactive Functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('CosyVoice2 Demo loaded successfully!');

    // Navigation functionality
    initializeNavigation();
    
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

    // Interactive Architecture Diagram
    function initializeArchitectureDiagram() {
        const componentBoxes = document.querySelectorAll('.component-box');
        const infoContent = document.getElementById('info-content');
        
        // Component information data
        const componentInfo = {
            slm: {
                title: 'SLM (Speech Language Model)',
                description: 'The Speech Language Model component converts input text into semantic tokens. Fine-tuning this component improves pronunciation accuracy and phonetic understanding for French text.',
                benefits: [
                    'Improved pronunciation of French phonemes',
                    'Better handling of French-specific linguistic patterns',
                    'Enhanced semantic understanding of French text'
                ],
                audioFile: 'audio/slm_only.wav',
                improvements: 'Reduces pronunciation errors by ~40% and improves phonetic accuracy significantly.'
            },
            flow: {
                title: 'Flow Matching (Diffusion Model)',
                description: 'The Flow Matching component generates mel spectrograms from semantic tokens. This component has the most significant impact on prosody and naturalness.',
                benefits: [
                    'Natural French prosody and rhythm',
                    'Improved intonation patterns',
                    'Better emotional expressiveness'
                ],
                audioFile: 'audio/flow_only.wav',
                improvements: 'Provides the largest MOS improvement (+0.8) and dramatically enhances naturalness.'
            },
            hifigan: {
                title: 'HiFiGAN (Vocoder)',
                description: 'The HiFiGAN vocoder converts mel spectrograms to final audio waveforms. Fine-tuning reduces artifacts and improves audio quality.',
                benefits: [
                    'Cleaner audio output with fewer artifacts',
                    'Better frequency response for French phonemes',
                    'Improved overall audio fidelity'
                ],
                audioFile: 'audio/hifigan_only.wav',
                improvements: 'Reduces audio artifacts by ~50% and improves overall clarity and naturalness.'
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
                file: 'audio/original.wav',
                title: 'Baseline (No Fine-tuning)',
                indicators: ['Strong English Accent', 'Unnatural Prosody'],
                indicatorClasses: ['poor', 'poor'],
                description: 'Original CosyVoice2 model without any French-specific training.'
            },
            'slm': {
                file: 'audio/slm.wav',
                title: 'SLM Fine-tuned',
                indicators: ['Improved Pronunciation', 'Some English Accent'],
                indicatorClasses: ['good', 'neutral'],
                description: 'Speech Language Model fine-tuned for French pronunciation patterns.'
            },
            'flow': {
                file: 'audio/flow.wav',
                title: 'Flow Fine-tuned',
                indicators: ['Better Prosody', 'Pronunciation Issues'],
                indicatorClasses: ['good', 'neutral'],
                description: 'Flow matching model fine-tuned for French prosody and rhythm.'
            },
            'hifigan': {
                file: 'audio/hifigan.wav',
                title: 'HiFiGAN Fine-tuned',
                indicators: ['Cleaner Audio', 'Accent Remains'],
                indicatorClasses: ['good', 'poor'],
                description: 'Vocoder fine-tuned for improved French audio quality.'
            },
            'flow,slm': {
                file: 'audio/slm_flow.wav',
                title: 'SLM + Flow Fine-tuned',
                indicators: ['Good Pronunciation', 'Natural Prosody'],
                indicatorClasses: ['good', 'good'],
                description: 'Combined SLM and Flow fine-tuning for improved pronunciation and prosody.'
            },
            'hifigan,slm': {
                file: 'audio/slm_hifigan.wav',
                title: 'SLM + HiFiGAN Fine-tuned',
                indicators: ['Good Pronunciation', 'Clean Audio'],
                indicatorClasses: ['good', 'good'],
                description: 'Combined SLM and vocoder fine-tuning for pronunciation and audio quality.'
            },
            'flow,hifigan': {
                file: 'audio/flow_hifigan.wav',
                title: 'Flow + HiFiGAN Fine-tuned',
                indicators: ['Natural Prosody', 'Clean Audio'],
                indicatorClasses: ['good', 'good'],
                description: 'Combined Flow and vocoder fine-tuning for prosody and audio quality.'
            },
            'flow,hifigan,slm': {
                file: 'audio/slm_flow_hifigan.wav',
                title: 'All Components Fine-tuned',
                indicators: ['Excellent Pronunciation', 'Natural Prosody', 'High Quality Audio'],
                indicatorClasses: ['excellent', 'excellent', 'excellent'],
                description: 'All components fine-tuned for optimal French speech synthesis quality.'
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

            const configKey = activeComponents.length > 0 ? activeComponents.sort().join(',') : 'baseline';
            const config = audioConfigurations[configKey] || audioConfigurations['baseline'];

            // Update dynamic audio card
            dynamicTitle.innerHTML = `<i class="fas fa-magic"></i> ${config.title}`;
            
            // Update quality indicators
            dynamicIndicators.innerHTML = config.indicators.map((indicator, index) => 
                `<span class="quality-badge ${config.indicatorClasses[index]}">${indicator}</span>`
            ).join('');

            // Update audio source
            dynamicSource.src = config.file;
            dynamicAudio.load();

            // Update description
            dynamicDescription.textContent = config.description;

            console.log(`Updated configuration to: ${configKey}`);
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
