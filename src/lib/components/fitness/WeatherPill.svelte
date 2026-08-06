<script>
	/**
	 * What the weather was doing during a run.
	 *
	 * A pill on the run's stat row rather than a section of its own: it belongs with
	 * duration and distance as one more fact about that outing, and it reads as a
	 * sentence — condition, temperature, humidity.
	 *
	 * The source line is not decoration. Open-Meteo's data is CC-BY, so the attribution
	 * travels with the reading; it sits behind the same info affordance the kcal estimate
	 * uses for its citations, so the row stays quiet.
	 */
	import Sun from '@lucide/svelte/icons/sun';
	import CloudSun from '@lucide/svelte/icons/cloud-sun';
	import Cloudy from '@lucide/svelte/icons/cloudy';
	import Cloud from '@lucide/svelte/icons/cloud';
	import CloudFog from '@lucide/svelte/icons/cloud-fog';
	import CloudDrizzle from '@lucide/svelte/icons/cloud-drizzle';
	import CloudRain from '@lucide/svelte/icons/cloud-rain';
	import CloudRainWind from '@lucide/svelte/icons/cloud-rain-wind';
	import CloudSnow from '@lucide/svelte/icons/cloud-snow';
	import CloudLightning from '@lucide/svelte/icons/cloud-lightning';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import DropletOff from '@lucide/svelte/icons/droplet-off';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Droplets from '@lucide/svelte/icons/droplets';
	import Waves from '@lucide/svelte/icons/waves';
	import ThermometerSun from '@lucide/svelte/icons/thermometer-sun';
	import Info from '@lucide/svelte/icons/info';
	import { clampToViewport } from '$lib/js/clampToViewport';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';
	import { dewPointC, humidityFeel } from '$lib/fitness/weather';
	import { page } from '$app/state';

	/** @type {{ weather: { temperatureC: number, humidity: number, condition: string, code?: number } | null | undefined }} */
	let { weather } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);

	// Four distinct skies, four distinct marks: full sun, sun behind cloud, cloud with
	// more cloud behind it, then the flat overcast one.
	const ICONS = {
		clear: Sun,
		mainly_clear: CloudSun,
		partly_cloudy: Cloudy,
		cloudy: Cloud,
		fog: CloudFog,
		drizzle: CloudDrizzle,
		rain: CloudRain,
		showers: CloudRainWind,
		snow: CloudSnow,
		thunderstorm: CloudLightning,
		unknown: CircleQuestionMark
	};

	const condition = $derived(/** @type {keyof typeof ICONS} */ (weather?.condition ?? 'unknown'));
	// An unrecognised condition string falls to the same question mark as an unmapped
	// code — the component never invents a sky either.
	const Icon = $derived(ICONS[condition] ?? CircleQuestionMark);
	// Spelled out rather than built from the condition string: a typo'd or newly added
	// condition then fails to compile instead of rendering a blank pill.
	const LABELS = $derived({
		clear: t.weather_clear,
		mainly_clear: t.weather_mainly_clear,
		partly_cloudy: t.weather_partly_cloudy,
		cloudy: t.weather_cloudy,
		fog: t.weather_fog,
		drizzle: t.weather_drizzle,
		rain: t.weather_rain,
		showers: t.weather_showers,
		snow: t.weather_snow,
		thunderstorm: t.weather_thunderstorm,
		unknown: t.weather_unknown
	});
	const label = $derived(LABELS[condition] ?? weather?.condition ?? '');

	// How the air felt to work in. Derived from temperature *and* humidity, because the
	// percentage alone does not say — see humidityFeel.
	const feel = $derived(
		weather ? humidityFeel(weather.temperatureC, weather.humidity) : null
	);
	const dewPoint = $derived(weather ? dewPointC(weather.temperatureC, weather.humidity) : null);

	const FEEL_ICONS = {
		dry: DropletOff,
		comfortable: Droplet,
		humid: Droplets,
		muggy: Waves,
		oppressive: ThermometerSun
	};
	const FEEL_LABELS = $derived({
		dry: t.humidity_dry,
		comfortable: t.humidity_comfortable,
		humid: t.humidity_humid,
		muggy: t.humidity_muggy,
		oppressive: t.humidity_oppressive
	});
	const FeelIcon = $derived(feel ? FEEL_ICONS[feel] : Droplets);
	// Named only when it is worth knowing. On an ordinary day the percentage speaks for
	// itself and a word for it is noise; once the air is holding sweat in, that is the
	// thing that explains the run.
	const feelWorthNaming = $derived(feel === 'humid' || feel === 'muggy' || feel === 'oppressive');
	// The full reading always reachable, whether or not the word is shown.
	const humidityTitle = $derived(
		[
			`${t.humidity} ${weather?.humidity}%`,
			dewPoint != null ? `${t.dew_point} ${dewPoint.toFixed(1)} °C` : '',
			feel ? FEEL_LABELS[feel] : ''
		]
			.filter(Boolean)
			.join(' · ')
	);

	let showSource = $state(false);
</script>

{#if weather}
	<div class="stat-pill weather has-info">
		<Icon size={14} />
		<span class="weather-condition">{label}</span>
		{#if condition === 'unknown' && weather.code != null}
			<!-- The code is the whole point of an unknown reading: it is what turns "we
			     don't know" into a one-line fix. -->
			<span class="weather-code">WMO {weather.code}</span>
		{/if}
		<span class="weather-sep" aria-hidden="true">·</span>
		<span class="weather-temp">{weather.temperatureC.toFixed(1)} °C</span>
		<span class="weather-humidity" class:strong={feelWorthNaming} title={humidityTitle}>
			<FeelIcon size={12} />{weather.humidity}%
			{#if feelWorthNaming && feel}<span class="weather-feel">{FEEL_LABELS[feel]}</span>{/if}
		</span>
		<button
			class="weather-info-trigger"
			onclick={() => (showSource = !showSource)}
			aria-label={t.weather_source_aria}
		>
			<Info size={12} />
		</button>
		{#if showSource}
			<div class="weather-source" {@attach clampToViewport}>
				<a href="https://open-meteo.com/" target="_blank" rel="noopener">{t.weather_source}</a>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Matches the run stat pills it sits among (see RunDetailView's .stat-pill). */
	.stat-pill {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		background: var(--color-surface);
		border-radius: 20px;
		box-shadow: var(--shadow-sm);
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.stat-pill.weather {
		color: var(--blue);
		background: color-mix(in srgb, var(--blue) 10%, transparent);
	}
	.weather-condition {
		font-weight: 600;
	}
	.weather-sep {
		opacity: 0.5;
	}
	.weather-code {
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}
	.weather-temp {
		font-variant-numeric: tabular-nums;
	}
	.weather-humidity {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.85;
	}
	/* Air that held the sweat in is the part of the reading that explains a run, so it
	   stops being the quiet half of the pill. */
	.weather-humidity.strong {
		opacity: 1;
		font-weight: 600;
	}
	.weather-feel {
		margin-left: 0.15rem;
	}
	.weather-info-trigger {
		display: flex;
		align-items: center;
		opacity: 0.5;
		background: none;
		border: none;
		padding: 0;
		margin-left: 0.1rem;
		color: inherit;
		cursor: pointer;
	}
	.weather-info-trigger:hover {
		opacity: 1;
	}
	.weather-source {
		position: absolute;
		bottom: calc(100% + 0.4rem);
		left: 0;
		z-index: 20;
		white-space: nowrap;
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-md);
		font-size: 0.72rem;
		color: var(--color-text-secondary);
	}
	.weather-source a {
		color: var(--color-primary);
	}
</style>
