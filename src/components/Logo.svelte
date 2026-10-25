<script lang="ts">
  /**
   * Renders the Cortes TV wordmark ("Ctv" in SF Pro Display Bold) in the current text color.
   *
   * The same path as `public/icons/icon.svg`; keep both in step.
   *
   * @param height - The wordmark height, in pixels.
   */
  interface Props {
    height?: number;
  }
  let { height = 22 }: Props = $props();
</script>

<svg viewBox="75 -1468 3147 1493" {height} width={(height * 3147) / 1493} role="img" aria-label="Cortes TV">
  <path fill="currentColor" d="M758 25C1112 25 1359 -179 1393 -501H1099C1067 -330 938 -225 759 -225C528 -225 383 -415 383 -723C383 -1027 530 -1218 758 -1218C934 -1218 1070 -1102 1098 -925H1392C1369 -1248 1105 -1468 758 -1468C340 -1468 75 -1187 75 -722C75 -256 338 25 758 25ZM1612 -1319V-1072H1461V-852H1612V-289C1612 -80 1710 4 1962 4C2021 4 2071 -1 2101 -8V-223C2083 -220 2056 -218 2030 -218C1944 -218 1904 -257 1904 -339V-852H2102V-1072H1904V-1319ZM3222 -1072H2917L2695 -258H2689L2466 -1072H2153L2524 0H2854Z" />
</svg>
