import Chart from 'chart.js/auto';

export type AccelDataPoint = {
    x: number;
    y: number;
    z: number;
    timestamp: string;
};

let accelChart: Chart | null = null;
let chartData: AccelDataPoint[] = [];

export function initAccelChart(canvasId: string) {
    const ctx = (document.getElementById(canvasId) as HTMLCanvasElement).getContext('2d');
    if (!ctx) throw new Error('Canvas not found');

    accelChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'X',
                    data: [],
                    borderColor: '#e53e3e',
                    fill: false,
                },
                {
                    label: 'Y',
                    data: [],
                    borderColor: '#3182ce',
                    fill: false,
                },
                {
                    label: 'Z',
                    data: [],
                    borderColor: '#38a169',
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    title: { display: true, text: 'Timestamp' },
                },
                y: {
                    title: { display: true, text: 'Acceleration (g)' },
                },
            },
        },
    });
}

export function plotAccelData(data: AccelDataPoint) {
    chartData.push(data);
    if (!accelChart) return;

    // Add timestamp label
    accelChart.data.labels?.push(data.timestamp);
    // Add data to each axis
    accelChart.data.datasets[0].data.push(data.x);
    accelChart.data.datasets[1].data.push(data.y);
    accelChart.data.datasets[2].data.push(data.z);

    // Limit to last 100 points
    if (chartData.length > 100) {
        chartData.shift();
        accelChart.data.labels?.shift();
        accelChart.data.datasets.forEach((ds) => ds.data.shift());
    }

    accelChart.update();
}

export function clearAccelPlot() {
    chartData = [];
    if (!accelChart) return;
    accelChart.data.labels = [];
    accelChart.data.datasets.forEach((ds) => (ds.data = []));
    accelChart.update();
}
