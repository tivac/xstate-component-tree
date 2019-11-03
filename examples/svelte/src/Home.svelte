HOME

{#each children as child}
    <svelte:component
        this={child.component}
        children={child.children}
        {...child.props}
    />
{/each}

<script>
export let children = [];
</script>