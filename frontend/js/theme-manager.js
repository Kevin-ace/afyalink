export class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.applyTheme();
    }

    isDarkMode() {
        return this.theme === 'dark';
    }

    enableDarkMode() {
        this.theme = 'dark';
        this.applyTheme();
        localStorage.setItem('theme', 'dark');
    }

    disableDarkMode() {
        this.theme = 'light';
        this.applyTheme();
        localStorage.setItem('theme', 'light');
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        // Dispatch event for other components to react to theme change
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: this.theme } }));
    }
} 