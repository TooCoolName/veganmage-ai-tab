<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";

	let {
		open = $bindable(false),
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		value = $bindable() as string | undefined,
		...restProps
	}: SelectPrimitive.RootProps = $props();
</script>

<!-- eslint-disable-next-line @typescript-eslint/consistent-type-assertions -->
<SelectPrimitive.Root bind:open bind:value={value as never} {...restProps} />
