<script>
	export let data;
	console.log("DATA:", data)
	console.log("payments:", data.payments)
	import PaymentCard from "$lib/components/PaymentCard.svelte";
</script>
{#if data.payments}
{#each data.payments as payment}
	<PaymentCard {payment}></PaymentCard>
{/each}
{/if}
