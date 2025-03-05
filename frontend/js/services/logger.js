export class Logger {
    static SUCCESS = 'success';
    static ERROR = 'error';
    static WARNING = 'warning';
    static INFO = 'info';

    static log(type, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data
        };

        // Console logging with styling
        switch (type) {
            case this.SUCCESS:
                console.log('%c✓ ' + message, 'color: #28a745', data || '');
                break;
            case this.ERROR:
                console.error('❌ ' + message, data || '');
                break;
            case this.WARNING:
                console.warn('⚠️ ' + message, data || '');
                break;
            case this.INFO:
                console.info('ℹ️ ' + message, data || '');
                break;
        }

        // Store in localStorage for persistence
        this.storeLog(logEntry);

        // If it's an error, you might want to send it to your backend
        if (type === this.ERROR) {
            this.sendToServer(logEntry);
        }
    }

    static storeLog(logEntry) {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push(logEntry);
        // Keep only last 100 logs
        if (logs.length > 100) logs.shift();
        localStorage.setItem('app_logs', JSON.stringify(logs));
    }

    static async sendToServer(logEntry) {
        try {
            await fetch('http://localhost:8000/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            console.error('Failed to send log to server:', error);
        }
    }

    static clearLogs() {
        localStorage.removeItem('app_logs');
    }
} 