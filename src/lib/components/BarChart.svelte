<script>
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';

  export let data = { labels: [], datasets: [] };
  export let title = '';
  export let height = '400px';

  let canvas;
  let chart;
  let hiddenCategories = new Set(); // Track which categories are hidden

  // Register Chart.js components
  Chart.register(...registerables);

  // Nord theme colors for categories
  const nordColors = [
    '#5E81AC', // Nord Blue
    '#88C0D0', // Nord Light Blue
    '#81A1C1', // Nord Lighter Blue
    '#A3BE8C', // Nord Green
    '#EBCB8B', // Nord Yellow
    '#D08770', // Nord Orange
    '#BF616A', // Nord Red
    '#B48EAD', // Nord Purple
    '#8FBCBB', // Nord Cyan
    '#ECEFF4', // Nord Light Gray
  ];

  function getCategoryColor(category, index) {
    const categoryColorMap = {
      'groceries': '#A3BE8C',      // Green
      'restaurant': '#D08770',     // Orange
      'transport': '#5E81AC',      // Blue
      'entertainment': '#B48EAD',  // Purple
      'shopping': '#EBCB8B',       // Yellow
      'utilities': '#81A1C1',      // Light Blue
      'healthcare': '#BF616A',     // Red
      'education': '#88C0D0',      // Cyan
      'travel': '#8FBCBB',         // Light Cyan
      'other': '#4C566A'           // Dark Gray
    };

    return categoryColorMap[category] || nordColors[index % nordColors.length];
  }

  function createChart() {
    if (!canvas || !data.datasets) return;

    // Destroy existing chart
    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext('2d');

    // Process datasets with colors and capitalize labels
    const processedDatasets = data.datasets.map((dataset, index) => ({
      ...dataset,
      label: dataset.label.charAt(0).toUpperCase() + dataset.label.slice(1),
      backgroundColor: getCategoryColor(dataset.label, index),
      borderColor: getCategoryColor(dataset.label, index),
      borderWidth: 1
    }));

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: processedDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 40
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              color: '#ffffff',
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 14,
                weight: 'bold'
              }
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              color: 'transparent',
              font: {
                size: 0
              }
            }
          }
        },
        plugins: {
          datalabels: {
            display: false
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              color: '#ffffff',
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 14,
                weight: 'bold'
              }
            },
            onClick: (event, legendItem, legend) => {
              const datasetIndex = legendItem.datasetIndex;
              const clickedMeta = chart.getDatasetMeta(datasetIndex);

              // Check if only this dataset is currently visible
              const onlyThisVisible = chart.data.datasets.every((dataset, idx) => {
                const meta = chart.getDatasetMeta(idx);
                return idx === datasetIndex ? !meta.hidden : meta.hidden;
              });

              if (onlyThisVisible) {
                // Show all categories
                chart.data.datasets.forEach((dataset, idx) => {
                  chart.getDatasetMeta(idx).hidden = false;
                });
              } else {
                // Hide all except the clicked one
                chart.data.datasets.forEach((dataset, idx) => {
                  chart.getDatasetMeta(idx).hidden = idx !== datasetIndex;
                });
              }

              chart.update();
            }
          },
          title: {
            display: !!title,
            text: title,
            color: '#ffffff',
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 18,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            backgroundColor: '#2e3440',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderWidth: 0,
            cornerRadius: 12,
            padding: 12,
            displayColors: true,
            titleAlign: 'center',
            bodyAlign: 'center',
            titleFont: {
              family: 'Inter, system-ui, sans-serif',
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Inter, system-ui, sans-serif',
              size: 14,
              weight: '500'
            },
            titleMarginBottom: 8,
            usePointStyle: true,
            boxPadding: 6,
            callbacks: {
              title: function(context) {
                return '';
              },
              label: function(context) {
                return context.dataset.label + ': CHF ' + context.parsed.y.toFixed(2);
              }
            }
          }
        },
        interaction: {
          intersect: true,
          mode: 'point'
        },
        onClick: (event, activeElements) => {
          if (activeElements.length > 0) {
            const datasetIndex = activeElements[0].datasetIndex;

            // Check if only this dataset is currently visible
            const onlyThisVisible = chart.data.datasets.every((dataset, idx) => {
              const meta = chart.getDatasetMeta(idx);
              return idx === datasetIndex ? !meta.hidden : meta.hidden;
            });

            if (onlyThisVisible) {
              // Show all categories
              chart.data.datasets.forEach((dataset, idx) => {
                chart.getDatasetMeta(idx).hidden = false;
              });
            } else {
              // Hide all except the clicked one
              chart.data.datasets.forEach((dataset, idx) => {
                chart.getDatasetMeta(idx).hidden = idx !== datasetIndex;
              });
            }

            chart.update();
          }
        }
      },
      plugins: [{
        id: 'monthlyTotals',
        afterDatasetsDraw: function(chart) {
          const ctx = chart.ctx;
          const chartArea = chart.chartArea;

          ctx.save();
          ctx.font = 'bold 14px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          // Calculate and display monthly totals (only for visible categories)
          chart.data.labels.forEach((label, index) => {
            let total = 0;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
              // Only add to total if the dataset is visible
              const meta = chart.getDatasetMeta(datasetIndex);
              if (meta && !meta.hidden) {
                total += dataset.data[index] || 0;
              }
            });

            if (total > 0) {
              // Get the x position for this month from any visible dataset
              let x = null;
              let maxY = chartArea.bottom;

              for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
                const datasetMeta = chart.getDatasetMeta(datasetIndex);
                if (datasetMeta && !datasetMeta.hidden && datasetMeta.data[index]) {
                  if (x === null) {
                    x = datasetMeta.data[index].x;
                  }
                  maxY = Math.min(maxY, datasetMeta.data[index].y);
                }
              }

              if (x !== null) {
                // Display the total above the bar
                ctx.fillText(`CHF ${total.toFixed(0)}`, x, maxY - 10);
              }
            }
          });

          ctx.restore();
        }
      }]
    });
  }

  onMount(() => {
    createChart();

    // Watch for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      setTimeout(createChart, 100); // Small delay to let CSS variables update
    };

    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      if (chart) {
        chart.destroy();
      }
    };
  });

  // Recreate chart when data changes
  $: if (canvas && data) {
    createChart();
  }
</script>

<div class="chart-container" style="height: {height}">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    background: var(--nord6);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    .chart-container {
      background: var(--nord1);
      border-color: var(--nord2);
    }
  }

  canvas {
    max-width: 100%;
    height: 100% !important;
    cursor: pointer;
  }

  canvas:hover {
    opacity: 0.95;
  }
</style>
