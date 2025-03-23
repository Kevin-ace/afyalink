// Wait for the page to load
document.addEventListener("DOMContentLoaded", function () {
    // Make sure we have a map container in the HTML
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    const DEFAULT_CENTER = [-1.2921, 36.8219]; // Nairobi
    const DEFAULT_ZOOM = 13;
    const SEARCH_RADIUS = 5000; // 5km radius
    let userMarker = null;
    let facilitiesLayer = L.layerGroup();

    // Initialize map with specific height
    mapContainer.style.height = '500px';
    
    // Check if map is already initialized
    if (window.map) {
        console.log('Map is already initialized');
        return;
    }

    // Initialize the map
    window.map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
    }).addTo(window.map);

    // Force a map refresh
    setTimeout(() => {
        if (window.map && typeof window.map.invalidateSize === 'function') {
            window.map.invalidateSize();
            console.log('Map initialized', { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
        }
    }, 100);

    async function fetchNearbyFacilities(lat, lng, radius) {
        try {
            console.log('Fetching nearby facilities', { lat, lng, radius });
            facilitiesLayer.clearLayers();

            // Simulate API call
            const facilities = await new Promise((resolve) => {
                setTimeout(() => {
                    resolve([]); // Replace with actual API call
                }, 1000);
            });
            
            if (facilities.length > 0) {
                console.log('Facilities fetched successfully', { count: facilities.length });
                addFacilitiesToMap(facilities);
            }
        } catch (error) {
            console.error('Failed to fetch nearby facilities', error);
            showError('Failed to load nearby facilities. Please try again.');
        }
    }

    function addFacilitiesToMap(facilities) {
        if (!facilities || facilities.length === 0) {
            console.log('No facilities to add to map');
            return;
        }

        facilities.forEach(facility => {
            const marker = L.marker([facility.latitude, facility.longitude])
                .bindPopup(createFacilityPopupContent(facility));
            
            marker.on('click', () => showFacilityDetails(facility.id));
            
            facilitiesLayer.addLayer(marker);
        });
        
        facilitiesLayer.addTo(window.map);
    }

    function createFacilityPopupContent(facility) {
        return `
            <h3>${facility.name}</h3>
            <p><strong>Type:</strong> ${facility.type}</p>
            <p><strong>Services:</strong> ${facility.services.join(', ')}</p>
            <button onclick="getDirections(${facility.latitude}, ${facility.longitude})">
                Get Directions
            </button>
        `;
    }

    function showFacilityDetails(facilityId) {
        const modalContent = document.getElementById('facility-details-content');
        if (!modalContent) {
            console.error('Facility details modal not found');
            return;
        }

        // Simulate API call
        const facility = {
            id: facilityId,
            name: 'Sample Facility',
            type: 'Sample Type',
            services: ['Service 1', 'Service 2'],
            location: {
                latitude: facilityId,
                longitude: facilityId
            }
        };

        modalContent.innerHTML = `
            <h2>${facility.name}</h2>
            <div class="facility-details">
                <p><strong>Type:</strong> ${facility.type}</p>
                <p><strong>Services:</strong> ${facility.services.join(', ')}</p>
                <div class="facility-actions">
                    <button onclick="getDirections(${facility.location.latitude}, ${facility.location.longitude})">
                        Get Directions
                    </button>
                </div>
            </div>
        `;

        const modal = document.getElementById('facility-details-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    function handleUserLocation() {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            useDefaultLocation();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                if (userMarker) {
                    window.map.removeLayer(userMarker);
                }
                
                userMarker = L.marker([latitude, longitude])
                    .bindPopup("You are here")
                    .addTo(window.map);
                
                window.map.setView([latitude, longitude], 13);
                fetchNearbyFacilities(latitude, longitude, SEARCH_RADIUS);
            },
            (error) => {
                console.log('Geolocation error', error);
                useDefaultLocation();
            }
        );
    }

    function useDefaultLocation() {
        console.log('Using default location', { center: DEFAULT_CENTER });
        window.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        fetchNearbyFacilities(DEFAULT_CENTER[0], DEFAULT_CENTER[1], SEARCH_RADIUS);
    }

    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                hideErrorMessage();
            }, 5000);
        } else {
            console.error('Error display element not found');
        }
    }

    function hideErrorMessage() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Initialize map
    handleUserLocation();
});

// Add script tags for Leaflet and other dependencies
document.write('<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>');
document.write('<script src="https://unpkg.com/leaflet/dist/leaflet.css"></script>');
