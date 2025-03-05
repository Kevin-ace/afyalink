import { healthInsights } from './health-insights.js';

class InsightsManager {
    constructor() {
        this.insights = healthInsights;
        this.currentIndex = 0;
        this.insightsPerPage = 5;
        this.container = document.getElementById('insightsCarousel');
        this.container.classList.add('loading');
        this.autoRotateInterval = null;
        
        this.setupControls();
        this.startAutoRotate();
        this.displayCurrentInsights();
        this.container.classList.remove('loading');
    }

    setupControls() {
        document.getElementById('prevInsight').addEventListener('click', () => {
            this.showPreviousInsights();
            this.resetAutoRotate();
        });

        document.getElementById('nextInsight').addEventListener('click', () => {
            this.showNextInsights();
            this.resetAutoRotate();
        });
    }

    displayCurrentInsights() {
        try {
            const currentInsights = this.getCurrentPageInsights();
            this.container.innerHTML = currentInsights.map(insight => `
                <div class="insight-item mb-3">
                    <div class="d-flex align-items-center">
                        <div class="insight-icon me-3">
                            <i class="fas ${insight.icon} fa-lg"></i>
                        </div>
                        <div class="insight-content">
                            <h6 class="mb-1">${insight.title}</h6>
                            <p class="mb-0 text-muted small">${insight.content}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error displaying insights:', error);
            this.container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Unable to load health insights. Please try again later.
                </div>
            `;
        }
    }

    getCurrentPageInsights() {
        const start = this.currentIndex;
        const end = start + this.insightsPerPage;
        const wrappedInsights = [...this.insights, ...this.insights];
        return wrappedInsights.slice(start, end);
    }

    showNextInsights() {
        try {
            this.currentIndex = (this.currentIndex + this.insightsPerPage) % this.insights.length;
            this.displayCurrentInsights();
        } catch (error) {
            console.error('Error navigating insights:', error);
        }
    }

    showPreviousInsights() {
        try {
            this.currentIndex = (this.currentIndex - this.insightsPerPage + this.insights.length) % this.insights.length;
            this.displayCurrentInsights();
        } catch (error) {
            console.error('Error navigating insights:', error);
        }
    }

    startAutoRotate() {
        this.autoRotateInterval = setInterval(() => {
            this.showNextInsights();
        }, 10000); // Rotate every 10 seconds
    }

    resetAutoRotate() {
        clearInterval(this.autoRotateInterval);
        this.startAutoRotate();
    }
}

// Initialize insights when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new InsightsManager();
}); 