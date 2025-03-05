// Wait for the page to load
document.addEventListener("DOMContentLoaded", function () {
    const defaultCenter = [-1.286389, 36.817223]; // Nairobi coordinates
    const defaultZoom = 12;
    const searchRadius = 20; // 20km radius
    let userMarker = null;
    let facilitiesLayer = L.layerGroup();

    // Initialize map
    const map = L.map('map').setView(defaultCenter, defaultZoom);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Get user's location
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = [position.coords.latitude, position.coords.longitude];
            
            // Clear previous user marker if exists
            if (userMarker) {
                map.removeLayer(userMarker);
            }

            // Add user marker with custom icon
            userMarker = L.marker(userLocation, {
                icon: L.divIcon({
                    className: 'custom-marker user-location',
                    html: '<i class="fas fa-user-circle"></i>'
                }),
                zIndexOffset: 1000 // Ensure user marker is above facility markers
            }).addTo(map);

            // Set view to user location and show popup
            map.setView(userLocation, defaultZoom);
            userMarker.bindPopup('Your Location').openPopup();

            // Fetch nearby facilities
            fetchNearbyFacilities(userLocation[0], userLocation[1], searchRadius);
        },
        (error) => {
            console.warn("Geolocation error:", error);
            fetchNearbyFacilities(defaultCenter[0], defaultCenter[1], searchRadius);
        }
    );

    async function fetchNearbyFacilities(lat, lng, radius) {
        try {
            // Clear previous facilities
            facilitiesLayer.clearLayers();

            // Try API endpoint first
            const response = await fetch(
                `http://localhost:8000/facilities/nearby?latitude=${lat}&longitude=${lng}&radius=${radius}`
            );

            if (response.ok) {
                const facilities = await response.json();
                console.log('Fetched facilities:', facilities); // Debug log
                addFacilitiesToMap(facilities);
            } else {
                console.error('API Error:', await response.text()); // Debug log
                // Fallback to CSV if API fails
                const csvResponse = await fetch('http://localhost:8000/health-facilities-csv');
                const csvText = await csvResponse.text();
                
                Papa.parse(csvText, {
                    header: true,
                    complete: function(results) {
                        console.log('CSV Data:', results.data); // Debug log
                        const nearbyFacilities = results.data.filter(facility => {
                            if (!facility.Latitude || !facility.Longitude) return false;
                            
                            const distance = calculateDistance(
                                lat, 
                                lng, 
                                parseFloat(facility.Latitude), 
                                parseFloat(facility.Longitude)
                            );
                            return distance <= radius;
                        });
                        
                        addFacilitiesToMap(nearbyFacilities);
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching facilities:', error);
        }
    }

    function addFacilitiesToMap(facilities) {
        console.log('Adding facilities to map:', facilities); // Debug log
        
        facilities.forEach(facility => {
            const facilityLat = facility.latitude || facility.Latitude;
            const facilityLng = facility.longitude || facility.Longitude;
            
            if (facilityLat && facilityLng) {
                console.log(`Creating marker at: ${facilityLat}, ${facilityLng}`); // Debug log
                
                const marker = L.marker([facilityLat, facilityLng], {
                    icon: L.divIcon({
                        className: 'custom-marker facility-location',
                        html: '<i class="fas fa-hospital"></i>'
                    })
                });

                marker.bindPopup(createFacilityPopupContent(facility));
                facilitiesLayer.addLayer(marker);
            }
        });

        // Add facilities layer to map
        facilitiesLayer.addTo(map);
    }

    function createFacilityPopupContent(facility) {
        return `
            <div class="facility-popup">
                <h4>${facility.facility_name || facility.name || facility['Facility Name']}</h4>
                <p><strong>Type:</strong> ${facility.facility_type || facility.type || facility['Facility Type'] || 'N/A'}</p>
                <p><strong>Location:</strong> ${facility.location || facility['LOCATION'] || 'N/A'}</p>
                <p><strong>District:</strong> ${facility.district || facility['District'] || 'N/A'}</p>
                <button class="btn btn-primary btn-sm" onclick="window.location.href='booking.html?facility=${facility.id || facility['Facility Number']}'">
                    Book Appointment
                </button>
            </div>
        `;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }
});