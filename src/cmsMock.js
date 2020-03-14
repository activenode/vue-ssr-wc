const inputHtmlFromPotentialCMS = `
<wc-slider>
  <wc-slider-elem>
    <div unslotted="true" style="min-height: 60px; background: yellow">
      sheep (click me)
    </div>
  </wc-slider-elem>

  <wc-slider-elem>
    <div unslotted="true" style="min-height: 60px; background: pink">
      elephant (click me)
    </div>
  </wc-slider-elem>
</wc-slider>
`;

export function getHtmlFromCMS() {
  return Promise.resolve(inputHtmlFromPotentialCMS);
}
