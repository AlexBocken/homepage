<script>
  import { onMount, untrack } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { paymentCategoryName } from '$lib/js/cospendI18n';

  /**
   * @type {{
   *   data?: { labels: string[], datasets: Array<{ label: string, data: number[] }> },
   *   title?: string,
   *   height?: string,
   *   onFilterChange?: ((categories: string[] | null) => void) | null,
   *   lang?: 'en' | 'de'
   * }}
   */
  let { data = { labels: [], datasets: [] }, title = '', height = '400px', onFilterChange = null, lang = 'de' } = $props();

  /** @type {HTMLCanvasElement | undefined} */
  let canvas = $state(undefined);
  /** @type {Chart | null} */
  let chart = $state(null);

  // Register Chart.js components
  Chart.register(...registerables);

  function isDark() {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

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

  /** @type {Record<string, string>} */
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

  /**
   * @param {string} category
   * @param {number} index
   * @returns {string}
   */
  function getCategoryColor(category, index) {
    return categoryColorMap[category] || nordColors[index % nordColors.length];
  }

  function emitFilter() {
    if (!onFilterChange || !chart) return;
    const c = chart;
    const allVisible = c.data.datasets.every((/** @type {any} */ _, /** @type {number} */ idx) => !c.getDatasetMeta(idx).hidden);
    if (allVisible) {
      onFilterChange(null);
    } else {
      const visible = c.data.datasets
        .filter((/** @type {any} */ _, /** @type {number} */ idx) => !c.getDatasetMeta(idx).hidden)
        .map((/** @type {any} */ ds) => /** @type {string} */ (ds._categoryKey ?? ds.label ?? '').toLowerCase());
      onFilterChange(visible);
    }
  }

  function createChart() {
    if (!canvas || !data.datasets) return;

    // Destroy existing chart
    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dark = isDark();
    const textColor = dark ? '#D8DEE9' : '#2E3440';
    const tooltipBg = dark ? '#2E3440' : '#ECEFF4';
    const tooltipText = dark ? '#ECEFF4' : '#2E3440';
    const tooltipBody = dark ? '#D8DEE9' : '#3B4252';

    // Convert $state proxy to plain arrays to avoid Chart.js property descriptor issues
    const plainLabels = [...(data.labels || [])];
    const plainDatasets = (data.datasets || []).map((/** @type {{ label: string, data: number[] }} */ ds) => ({
      label: ds.label,
      data: [...(ds.data || [])]
    }));

    // Process datasets with colors and capitalize labels
    const processedDatasets = plainDatasets.map((/** @type {{ label: string, data: number[] }} */ dataset, /** @type {number} */ index) => ({
      label: paymentCategoryName(dataset.label, lang),
      data: dataset.data,
      backgroundColor: getCategoryColor(dataset.label, index),
      borderColor: getCategoryColor(dataset.label, index),
      borderWidth: 1,
      _categoryKey: dataset.label
    }));

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: plainLabels,
        datasets: processedDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
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
              color: textColor,
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
        plugins: /** @type {any} */ ({
          datalabels: {
            display: false
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              color: textColor,
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 14,
                weight: 'bold'
              }
            },
            onClick: (/** @type {any} */ event, /** @type {{ datasetIndex?: number }} */ legendItem, /** @type {any} */ legend) => {
              const datasetIndex = legendItem.datasetIndex;
              if (datasetIndex == null || !chart) return;
              const c = chart;

              // Check if only this dataset is currently visible
              const onlyThisVisible = c.data.datasets.every((/** @type {any} */ dataset, /** @type {number} */ idx) => {
                const meta = c.getDatasetMeta(idx);
                return idx === datasetIndex ? !meta.hidden : meta.hidden;
              });

              if (onlyThisVisible) {
                // Show all categories
                c.data.datasets.forEach((/** @type {any} */ dataset, /** @type {number} */ idx) => {
                  c.getDatasetMeta(idx).hidden = false;
                });
              } else {
                // Hide all except the clicked one
                c.data.datasets.forEach((/** @type {any} */ dataset, /** @type {number} */ idx) => {
                  c.getDatasetMeta(idx).hidden = idx !== datasetIndex;
                });
              }

              c.update();
              emitFilter();
            }
          },
          title: {
            display: !!title,
            text: title,
            color: textColor,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 18,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipBody,
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
              weight: 500
            },
            titleMarginBottom: 8,
            usePointStyle: true,
            boxPadding: 6,
            callbacks: {
              title: function(/** @type {any} */ context) {
                return '';
              },
              label: function(/** @type {any} */ context) {
                return context.dataset.label + ': CHF ' + context.parsed.y.toFixed(2);
              }
            }
          }
        }),
        interaction: {
          intersect: true,
          mode: 'point'
        },
        onClick: (/** @type {any} */ event, /** @type {Array<{ datasetIndex: number }>} */ activeElements) => {
          if (activeElements.length > 0 && chart) {
            const c = chart;
            const datasetIndex = activeElements[0].datasetIndex;

            // Check if only this dataset is currently visible
            const onlyThisVisible = c.data.datasets.every((/** @type {any} */ dataset, /** @type {number} */ idx) => {
              const meta = c.getDatasetMeta(idx);
              return idx === datasetIndex ? !meta.hidden : meta.hidden;
            });

            if (onlyThisVisible) {
              // Show all categories
              c.data.datasets.forEach((/** @type {any} */ dataset, /** @type {number} */ idx) => {
                c.getDatasetMeta(idx).hidden = false;
              });
            } else {
              // Hide all except the clicked one
              c.data.datasets.forEach((/** @type {any} */ dataset, /** @type {number} */ idx) => {
                c.getDatasetMeta(idx).hidden = idx !== datasetIndex;
              });
            }

            c.update();
            emitFilter();
          }
        }
      },
      plugins: [{
        id: 'monthlyTotals',
        afterDatasetsDraw: function(/** @type {Chart} */ chartInstance) {
          const ctx = chartInstance.ctx;
          const chartArea = chartInstance.chartArea;

          ctx.save();
          ctx.font = 'bold 14px Inter, system-ui, sans-serif';
          ctx.fillStyle = isDark() ? '#D8DEE9' : '#2E3440';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          // Calculate and display monthly totals (only for visible categories)
          const labels = chartInstance.data.labels || [];
          labels.forEach((/** @type {any} */ label, /** @type {number} */ index) => {
            let total = 0;
            chartInstance.data.datasets.forEach((/** @type {any} */ dataset, /** @type {number} */ datasetIndex) => {
              // Only add to total if the dataset is visible
              const meta = chartInstance.getDatasetMeta(datasetIndex);
              if (meta && !meta.hidden) {
                const val = dataset.data[index];
                total += (typeof val === 'number' ? val : 0);
              }
            });

            if (total > 0) {
              // Get the x position for this month from any visible dataset
              /** @type {number | null} */
              let x = null;
              let maxY = chartArea.bottom;

              for (let datasetIndex = 0; datasetIndex < chartInstance.data.datasets.length; datasetIndex++) {
                const datasetMeta = chartInstance.getDatasetMeta(datasetIndex);
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

  // Recreate chart when lang changes
  let prevLang = untrack(() => lang);
  $effect(() => {
    const currentLang = lang;
    if (currentLang !== prevLang) {
      prevLang = currentLang;
      untrack(() => { if (canvas) createChart(); });
    }
  });

  onMount(() => {
    createChart();
    // Enable animations for subsequent updates (legend toggles, etc.)
    requestAnimationFrame(() => {
      if (chart) {
        chart.options.animation = { duration: 300 };
        chart.options.transitions = {
          active: { animation: { duration: 200 } }
        };
      }
    });

    // Watch for theme changes (both media query and data-theme attribute)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      setTimeout(createChart, 100); // Small delay to let CSS variables update
    };

    mediaQuery.addEventListener('change', handleThemeChange);

    // Also watch for data-theme attribute changes on <html>
    const themeObserver = new MutationObserver((/** @type {MutationRecord[]} */ mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          handleThemeChange();
        }
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      themeObserver.disconnect();
      if (chart) {
        chart.destroy();
      }
    };
  });
</script>

<div class="chart-container" style="height: {height}">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--color-border);
  }

  @media (max-width: 600px) {
    .chart-container {
      padding: 0.75rem;
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
