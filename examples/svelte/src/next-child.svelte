<script>
    import service from "./statechart.js";
</script>

<p>
    <button on:click={() => service.send({ type: "NEXT" })}>Next Child</button>
</p>
