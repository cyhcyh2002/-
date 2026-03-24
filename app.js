
let chart = null;
const calculator = new EquilibriumCalculator();


document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const referenceLink = document.getElementById('referenceLink');
    const exportBtn = document.getElementById('exportBtn');
    
    calculateBtn.addEventListener('click', handleCalculate);
    resetBtn.addEventListener('click', handleReset);
    referenceLink.addEventListener('click', function(e) {
        e.preventDefault();
        alert('');
    });
    exportBtn.addEventListener('click', handleExportCSV);
    
    
    initChart();
});


function handleReset() {
    document.getElementById('totalMo').value = '0.10';
    document.getElementById('pHStart').value = '0';
    document.getElementById('pHEnd').value = '10';
    document.getElementById('pHStep').value = '0.1';
    document.getElementById('maxIterations').value = '1000';
    document.getElementById('tolerance').value = '1e-10';
    
 
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
    }
   
    document.getElementById('tableHead').innerHTML = '';
    document.getElementById('tableBody').innerHTML = '';
    
    document.getElementById('status').className = 'status-message';
    document.getElementById('status').textContent = '';
    document.getElementById('chartInfo').innerHTML = '';
}


function initChart() {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribution of Mo species in the Mo(VI)-H2O system with pH at 25 degrees Celsius',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'pH'
                    },
                    type: 'linear',
                    min: 0,
                    max: 10,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Alpha(Mo)'
                    },
                    type: 'linear',
                    min: 0,
                    max: 1,
                    ticks: {
                        stepSize: 0.1
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}


function handleCalculate() {
    const statusDiv = document.getElementById('status');
    const calculateBtn = document.getElementById('calculateBtn');
    
    
    const totalMo = parseFloat(document.getElementById('totalMo').value);
    const pHStart = parseFloat(document.getElementById('pHStart').value);
    const pHEnd = parseFloat(document.getElementById('pHEnd').value);
    const pHStep = parseFloat(document.getElementById('pHStep').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);
    let tolerance = document.getElementById('tolerance').value;
    
    if (typeof tolerance === 'string' && tolerance.includes('e')) {
        tolerance = parseFloat(tolerance);
    } else {
        tolerance = parseFloat(tolerance);
    }
    if (isNaN(tolerance) || tolerance <= 0) {
        tolerance = 1e-10; 
    }
    
    
    if (isNaN(totalMo) || totalMo <= 0) {
        showStatus('Please enter a valid total Mo concentration', 'error');
        return;
    }
    
    if (pHStart >= pHEnd) {
        showStatus('pH The start value must be less than the end value', 'error');
        return;
    }
    
    calculateBtn.disabled = true;
    showStatus('Calculating...', 'info');
    
    
    setTimeout(() => {
        try {
           
            const result = calculator.calculateDistribution(
                totalMo, pHStart, pHEnd, pHStep, maxIterations, tolerance
            );
            
            
            updateChart(result, pHStart, pHEnd);
            
           
            const convergedCount = result.distributions.filter(d => d.converged).length;
            const totalCount = result.distributions.length;
            showStatus(
                `Computation finished! Total words calculated${totalCount}pH spot,${convergedCount}Convergence.`,
                'success'
            );
            
        } catch (error) {
            console.error('error:', error);
            showStatus('error: ' + error.message, 'error');
        } finally {
            calculateBtn.disabled = false;
        }
    }, 100);
}


function updateChart(result, pHStart, pHEnd) {
    const pHValues = result.pHValues;
    const distributions = result.distributions;
    
    
    const speciesOrder = [
        'MoO4(2-)',
        'HMoO4-',
        'H2MoO4',
        '[Mo7O24](6-)',
        '[HMo7O24](5-)',
        '[H2Mo7O24](4-)',
        '[H3Mo7O24](3-)',
        '[Mo8O26](4-)',
        '[HMo8O26](3-)',
        'MoO2(2+)'
    ];
    
  
    const datasets = [];
    const colors = [
        'rgb(54, 162, 235)',  
        'rgb(255, 99, 132)',  
        'rgb(75, 192, 192)',  
        'rgb(255, 206, 86)',  
        'rgb(153, 102, 255)', 
        'rgb(255, 159, 64)',  
        'rgb(199, 199, 199)', 
        'rgb(83, 102, 255)',  
        'rgb(255, 99, 255)',  
        'rgb(99, 255, 132)',  
    ];
    
    
    speciesOrder.forEach((speciesName, index) => {
        const data = distributions.map(dist => dist.MoSpecies[speciesName] || 0);
        datasets.push({
            label: `[${speciesName}]`,
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '40',
            borderWidth: 2,
            fill: false,
            tension: 0.1
        });
    });
    
 
    chart.data.labels = pHValues.map(pH => pH.toFixed(1));
    chart.data.datasets = datasets;
    
   
    chart.options.scales.x.min = 0;
    chart.options.scales.x.max = 10;
    chart.options.scales.x.ticks = {
        stepSize: 1,
        max: 10,
        min: 0
    };
    
    
    chart.update('none'); 
    
   
    updateChartInfo(result);
    
   
    updateDataTable(result);
}

function updateChartInfo(result) {
    const infoDiv = document.getElementById('chartInfo');
    const convergedCount = result.distributions.filter(d => d.converged).length;
    const totalCount = result.distributions.length;
    const avgIterations = result.distributions
        .filter(d => d.converged)
        .reduce((sum, d) => sum + d.iterations, 0) / convergedCount || 0;
    
    infoDiv.innerHTML = `
        <strong>Compute information:</strong><br>
        Total calculation points: ${totalCount} | 
        Number of convergence points: ${convergedCount} | 
        Average number of iterations: ${avgIterations.toFixed(1)}
    `;
}


function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + type;
}


function updateDataTable(result) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const distributions = result.distributions;
    
    if (distributions.length === 0) {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        return;
    }
    
    
    const speciesOrder = [
        'MoO4(2-)',
        'HMoO4-',
        'H2MoO4',
        '[Mo7O24](6-)',
        '[HMo7O24](5-)',
        '[H2Mo7O24](4-)',
        '[H3Mo7O24](3-)',
        '[Mo8O26](4-)',
        '[HMo8O26](3-)',
        'MoO2(2+)'
    ];
    
    
    let headHTML = '<tr><th>pH</th>';
    speciesOrder.forEach(species => {
        headHTML += `<th>Alpha(${species})</th>`;
    });
    headHTML += '<th>Convergence</th><th>Number of iterations</th></tr>';
    tableHead.innerHTML = headHTML;
  
    let bodyHTML = '';
    distributions.forEach(dist => {
        bodyHTML += `<tr>`;
        bodyHTML += `<td>${dist.pH.toFixed(1)}</td>`;
        
        speciesOrder.forEach(species => {
            const value = dist.MoSpecies[species] || 0;
            bodyHTML += `<td>${value.toFixed(6)}</td>`;
        });
        
        bodyHTML += `<td>${dist.converged ? 'yes' : 'no'}</td>`;
        bodyHTML += `<td>${dist.iterations}</td>`;
        bodyHTML += `</tr>`;
    });
    tableBody.innerHTML = bodyHTML;
    
    
    window.calculationData = {
        speciesOrder: speciesOrder,
        distributions: distributions
    };
    
    
    const infoDiv = document.getElementById('chartInfo');
    const existingInfo = infoDiv.innerHTML;
    const dataInfo = `<br><strong>Data table:</strong>Total${distributions.length}Line,${speciesOrder.length + 3}Column(Scroll horizontally and vertically to view)`;
    infoDiv.innerHTML = existingInfo + dataInfo;
}


function handleExportCSV() {
    if (!window.calculationData || !window.calculationData.distributions) {
        alert('Please calculate first!');
        return;
    }
    
    const { speciesOrder, distributions } = window.calculationData;
    const totalMo = document.getElementById('totalMo').value;
    
 
    let csvContent = '\uFEFF'; 
    csvContent += `Mo(VI)-H2OCalculation results of species equilibrium distribution\n`;
    csvContent += `Total molybdenum concentration: ${totalMo} mol/L\n`;
    csvContent += `\n`;
    
    
    csvContent += 'pH,';
    speciesOrder.forEach(species => {
        csvContent += `Alpha(${species}),`;
    });
    csvContent += 'Convergence,Number of iterations\n';
    
  
    distributions.forEach(dist => {
        csvContent += `${dist.pH.toFixed(1)},`;
        speciesOrder.forEach(species => {
            const value = dist.MoSpecies[species] || 0;
            csvContent += `${value.toFixed(6)},`;
        });
        csvContent += `${dist.converged ? 'yes' : 'no'},${dist.iterations}\n`;
    });
    
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Mo-H2O_Calculation result_${totalMo}molL_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function generateColors(count) {
    const colors = [
        'rgb(75, 192, 192)',  
        'rgb(255, 99, 132)',  
        'rgb(54, 162, 235)',  
        'rgb(255, 206, 86)',  
        'rgb(153, 102, 255)', 
        'rgb(255, 159, 64)',  
        'rgb(199, 199, 199)', 
        'rgb(83, 102, 255)',  
        'rgb(255, 99, 255)',  
        'rgb(99, 255, 132)',  
    ];
    
    
    while (colors.length < count) {
        const hue = (colors.length * 137.508) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    
    return colors;
}