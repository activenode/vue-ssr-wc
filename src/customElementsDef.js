export class GenericElement extends HTMLElement {
  connectedCallback() {
    if (this.connected) {
      return;
    }

    this.connected = true;

    const cssClassOfWrapper = `.${this.containerName}`;

    if (!this.isServerRendered) {
      const newWrapper = document.createElement("div");
      newWrapper.classList.add(this.containerName);
      this.prepend(newWrapper);
    }
    const wrapper = this.querySelector(cssClassOfWrapper);

    const unslottedElems = this.querySelectorAll(
      `${cssClassOfWrapper} > [unslotted="true"]`
    );

    this.attachShadow({ mode: "open" }).appendChild(wrapper);

    unslottedElems.forEach(elem => {
      elem.removeAttribute("unslotted");
      this.appendChild(elem);
    });
  }

  get renderTarget() {
    return this.shadowRoot.querySelector(`.${this.containerName}`);
  }

  get isServerRendered() {
    const cssClassOfWrapper = `.${this.containerName}`;
    const wrapper = this.querySelector(cssClassOfWrapper);
    return !!this.dataset.serverRendered && wrapper;
  }
}
