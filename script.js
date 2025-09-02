
const ipInput = document.getElementById('ipInput');
const searchBtn = document.getElementById('searchBtn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const showAnalyticsBtn = document.getElementById('show-analytics-btn');

const resultDiv = document.getElementById('result');

const securityReportDiv = document.getElementById('security-report'); 
const historyBody = document.getElementById('history-body');
const chartWrapper = document.getElementById('chart-wrapper');
const analyticsChartCanvas = document.getElementById('analytics-chart');


const ipAddressSpan = document.getElementById('ipAddress');
const locationSpan = document.getElementById('location');
const ispSpan = document.getElementById('isp');
const organizationSpan = document.getElementById('organization');
const asnSpan = document.getElementById('asn');


let map = null;
let myChart = null;


document.addEventListener('DOMContentLoaded', loadHistory);
searchBtn.addEventListener('click', handleSearch);
clearHistoryBtn.addEventListener('click', clearHistory);
showAnalyticsBtn.addEventListener('click', generateAnalytics);



async function handleSearch() {
    const ipAddress = ipInput.value.trim();
    if (!ipAddress) {
        alert('Please enter an IP address.');
        return;
    }
    
   
    resultDiv.classList.add('hidden');

    if(securityReportDiv) securityReportDiv.classList.add('hidden'); 

    const geoData = await fetchGeolocation(ipAddress);

    if (geoData) {
        displayGeolocation(geoData);
        saveToHistory(geoData);
        resultDiv.classList.remove('hidden');
    }
}


async function fetchGeolocation(ip) {
    const apiURL = `http://ip-api.com/json/${ip}?fields=status,message,country,city,lat,lon,isp,org,as,query`;
    try {
        const response = await fetch(apiURL);
        const data = await response.json();
        if (data.status === 'fail') {
            alert(`Geolocation Error: ${data.message}`);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Geolocation fetch error:', error);
        return null;
    }
}


function displayGeolocation(data) {
    ipAddressSpan.textContent = data.query;
    locationSpan.textContent = `${data.city}, ${data.country}`;
    ispSpan.textContent = data.isp;
    organizationSpan.textContent = data.org;
    asnSpan.textContent = data.as;
    updateMap(data.lat, data.lon, data.query);
}

function updateMap(lat, lon, ip) {
    if (map === null) {
        map = L.map('map').setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 13);
    }
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    L.marker([lat, lon]).addTo(map).bindPopup(`Location for ${ip}`).openPopup();
}


function saveToHistory(data) {
    const history = JSON.parse(localStorage.getItem('ipHistory')) || [];

    const newEntry = {
        ip: data.query,
        location: `${data.city}, ${data.country}`,
        country: data.country,
        isp: data.isp,
        timestamp: new Date().toLocaleString()
    };

    history.unshift(newEntry);
    if (history.length > 20) history.pop();
    localStorage.setItem('ipHistory', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('ipHistory')) || [];
    historyBody.innerHTML = '';
    
    document.querySelector('#history-table thead tr').innerHTML = `
        <th>Timestamp</th>
        <th>IP Address</th>
        <th>Location</th>
        <th>ISP</th>
    `;
    history.forEach(entry => {
        const row = document.createElement('tr');
       
        row.innerHTML = `
            <td>${entry.timestamp}</td>
            <td>${entry.ip}</td>
            <td>${entry.location}</td>
            <td>${entry.isp}</td>
        `;
        historyBody.appendChild(row);
    });
}

function clearHistory() {
    localStorage.removeItem('ipHistory');
    loadHistory();
    chartWrapper.classList.add('hidden');
}


function generateAnalytics() {
    const history = JSON.parse(localStorage.getItem('ipHistory')) || [];
    if (history.length === 0) {
        alert('No history data to analyze. Perform some lookups first.');
        return;
    }

    const countryCounts = {};
    history.forEach(entry => {
        if(entry.country !== 'Unknown') {
            countryCounts[entry.country] = (countryCounts[entry.country] || 0) + 1;
        }
    });

    const labels = Object.keys(countryCounts);
    const data = Object.values(countryCounts);

    chartWrapper.classList.remove('hidden');
    createOrUpdateChart(labels, data);
}

function createOrUpdateChart(labels, data) {
    if (myChart) myChart.destroy();
    myChart = new Chart(analyticsChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '# of Lookups by Country',
                data: data,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { color: '#e0e0e0', stepSize: 1 } },
                x: { ticks: { color: '#e0e0e0' } }
            },
            plugins: { legend: { labels: { color: '#e0e0e0' } } }
        }
    });
}