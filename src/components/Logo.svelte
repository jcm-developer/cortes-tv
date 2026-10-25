<script lang="ts">
  /**
   * Renders the Cortes TV wordmark (the "C" monogram plus "tv") in the current text color.
   *
   * The same paths as `public/icons/icon.svg`, cropped to the letters; keep both in step.
   *
   * @param height - The wordmark height, in pixels.
   */
  interface Props {
    height?: number;
  }
  let { height = 22 }: Props = $props();
</script>

<svg
  viewBox="184 360 656 302"
  height={height}
  width={(height * 656) / 302}
  role="img"
  aria-label="Cortes TV"
  fill="none"
  stroke="currentColor"
>
  <g transform="translate(4 0)">
    <path d="M415.6 426.4 A121 121 0 1 0 415.6 597.6" stroke-width="58" />
    <path d="M545 360 V580 Q545 614 590 614 H622" stroke-width="52" />
    <path d="M492 446 H620" stroke-width="52" />
    <path d="M658 420 H712 L747 544 L782 420 H836 L774 640 H720 Z" fill="currentColor" stroke="none" />
  </g>
</svg>
