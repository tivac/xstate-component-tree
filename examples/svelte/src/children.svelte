{#each children as { component, props, children }}
    <svelte:component this={component.default || component} {children} {...props} />
{/each}

<script>
export let children = [];
</script>