import { CONFIG } from './config.js';
import { DebugLogger } from './error.js';
import { Utils } from './utils.js';
import { AuthService } from './auth-service.js';

export const MapService = {
    map: null,
    facilities: [],

    async initMap(elementId = 'map') {
        try {
            // Check if Google Maps API is loaded
            if (typeof google === 'undefined') {
                throw new Error('Google Maps API not loaded');
            }

            const mapElement = document.getElementById(elementId);
            if (!mapElement) {
                throw new Error(`Map element with ID ${elementId} not found`);
            }

            this.map = new google.maps.Map(mapElement, {
                center: { lat: -1.2921, lng: 36.8219 }, // Default to Nairobi
                zoom: 10
            });

            await this.loadHealthFacilities();
        } catch (error) {
            DebugLogger.error('Map Initialization Failed', error);
            Utils.displayError('Could not initialize map');
        }
    },

    async loadHealthFacilities() {
        try {
            const response = await fetch('/data/health_facilities.csv');
            const csvText = await response.text();
            this.facilities = this.parseCSV(csvText);
            this.renderFacilities();
        } catch (error) {
            DebugLogger.error('Facilities Loading Failed', error);
        }
    },

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header.trim()] = values[index];
                return obj;
            }, {});
        });
    },

    renderFacilities() {
        this.facilities.forEach(facility => {
            new google.maps.Marker({
                position: {
                    lat: parseFloat(facility.latitude),
                    lng: parseFloat(facility.longitude)
                },
                map: this.map,
                title: facility.name
            });
        });
    },

    async renderNearbyFacilities(lat, lng, radius = 50) {
        const nearbyFacilities = this.facilities.filter(facility => {
            const distance = Utils.calculateDistance(
                lat, lng, 
                parseFloat(facility.latitude), 
                parseFloat(facility.longitude)
            );
            return distance <= radius;
        });

        // Render or list nearby facilities
        const facilityList = document.getElementById('nearby-facilities');
        facilityList.innerHTML = nearbyFacilities.map(facility => `
            <div class="facility-item">
                <h3>${facility.name}</h3>
                <p>Distance: ${this.calculateDistance(lat, lng, facility.latitude, facility.longitude).toFixed(2)} km</p>
            </div>
        `).join('');
    },

    async geocodeAddress(address) {
        try {
            const { lat, lng } = await Utils.geocodeAddress(address);
            this.map.setCenter({ lat, lng });
            this.map.setZoom(15);

            new google.maps.Marker({
                position: { lat, lng },
                map: this.map,
                title: address
            });

            await this.renderNearbyFacilities(lat, lng);
        } catch (error) {
            DebugLogger.error('Geocoding Failed', error);
            Utils.displayError('Could not locate address');
        }
    }
};