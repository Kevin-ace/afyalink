// Wait for the page to load
document.addEventListener("DOMContentLoaded", function () {
    // Initialize the map and set its view to Nairobi, Kenya
    var map = L.map('map').setView([-1.286389, 36.817223], 12);

    // Add OpenStreetMap tiles (Free tile provider)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Example marker (You can replace it with hospital locations from your backend)
    var marker = L.marker([-1.286389, 36.817223]).addTo(map)
        .bindPopup("<b>Nairobi Hospital</b><br>24/7 Emergency Services")
        .openPopup();
});
