const Vue = require("vue/dist/vue");
const renderer = require("vue-server-renderer").createRenderer();

const DOMParserInstance = new DOMParser();

Vue.component("SlotFactory", {
  render: createElement => {
    return createElement(
      "slot" // tag name
    );
  }
});

const SliderElem = Vue.component("anonymous-slider-elem", {
  data: function() {
    return {
      wasClicked: false,
      additionalPadding: 0,
      additionalMargin: 0,
      textFromSlots: ""
    };
  },
  methods: {
    clicked: function() {
      // I am not saying this is a good thing to do.
      // But it prooves the point of being able to access the native slots
      // and sometimes you just need to :)
      // also it is a safe thing to do since its slotted :)
      const slot = this.$el.querySelector("slot");
      let textFromSlots = "";
      slot.assignedElements().forEach(elem => {
        elem.style.backgroundColor = "green";
        elem.style.borderRadius = "5px";
        textFromSlots += elem.textContent;
      });

      this.wasClicked = true;
      this.additionalPadding = "2ex";
      this.additionalMargin = "2ex";
      this.textFromSlots = textFromSlots;
    }
  },
  props: [],
  template: `<div class="slider-elem" v-on:click="clicked" 
  v-bind:style="{ padding: additionalPadding, margin: additionalMargin }">
        <SlotFactory />
        <slot></slot>
        <div v-if="wasClicked">
          This div is only rendered by Vue if you clicked me
          <p>In fact i even know that you provided me with this text: {{textFromSlots}}</p>
        </div>
    </div>    
    `
});

const Slider = Vue.component("anonymous-slider", {
  data: function() {
    return {};
  },
  props: [],
  template: `<div class="slider">
        <SlotFactory />
        <slot></slot>
    </div>    
    `
});

Vue.component("slider-elem", {
  render: function(createElement) {
    return createElement(
      "wc-slider-elem",
      {
        attrs: {
          unslotted: "true",
          "data-server-rendered": "true"
        }
      },
      [createElement(SliderElem, {}, [this.$slots.default])]
    );
  }
});

Vue.component("slider-container", {
  render: function(createElement) {
    return createElement(
      "wc-slider",
      {
        attrs: {
          unslotted: "true",
          "data-server-rendered": "true"
        }
      },
      [createElement(Slider, {}, [this.$slots.default])]
    );
  }
});

const wcToVueMap = {
  "wc-slider": "slider-container",
  "wc-slider-elem": "slider-elem"
};

const wcKeys = Object.keys(wcToVueMap);

const wcToVueProcessor = (node, parent) => {
  const nodeName = node.nodeName.toLowerCase();
  if (!parent) {
    parent = document.createElement("ghost");
  }

  let newElem;

  if (nodeName === "#text") {
    // its a text node, copy
    newElem = node.cloneNode();
  } else if (wcKeys.includes(nodeName)) {
    // okay we need to rename this one
    const newTagName = wcToVueMap[nodeName];
    newElem = document.createElement(newTagName);
  } else {
    newElem = document.createElement(nodeName);
    // process all children
  }

  if (nodeName !== "#text") {
    [...node.attributes].forEach(attr => {
      newElem.setAttribute(attr.name, attr.value);
    });

    [...node.childNodes].forEach(childNode => {
      wcToVueProcessor(childNode, newElem);
    });
  }

  parent.appendChild(newElem);

  return parent.innerHTML;

  // This was the old implementation that is not stable:
  /*return Object.keys(wcToVueMap).reduce((str, currentWcKey) => {
    return str
      .replace(
        new RegExp(`<${currentWcKey}>`, "g"),
        `<${wcToVueMap[currentWcKey]}>`
      )
      .replace(
        new RegExp(`</${currentWcKey}>`, "g"),
        `</${wcToVueMap[currentWcKey]}>`
      );
  }, html);*/
};

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

const parsedHtmlAsXML = DOMParserInstance.parseFromString(
  inputHtmlFromPotentialCMS,
  "application/xml"
);

const postProcessedHtmlForServerRendering = wcToVueProcessor(
  parsedHtmlAsXML.documentElement
);

const html = new Vue({ template: postProcessedHtmlForServerRendering });

const sliderHtmlPromise = renderer.renderToString(html);

sliderHtmlPromise.then(htmlResult => {
  console.log({ htmlResult });
  const hydrateButton = document.getElementById("hydrateButton");
  const addViaCsrButton = document.getElementById("addViaCSR");
  const csrComponentsWrapper = document.getElementById("csrComponents");

  document.querySelector("button.ssr").addEventListener("click", function(e) {
    e.preventDefault();
    this.disabled = true;
    document.getElementById("app").innerHTML = htmlResult;
    document.getElementById("ssrDone").removeAttribute("hidden");
    hydrateButton.removeAttribute("hidden");
  });

  hydrateButton.addEventListener("click", () => {
    defineCustomElementsForHydration();
    document.getElementById("hydrationDone").removeAttribute("hidden");
    hydrateButton.disabled = true;
    addViaCsrButton.removeAttribute("hidden");
  });

  addViaCsrButton.addEventListener("click", () => {
    const newCustomElement = document.createElement("wc-slider-elem");
    csrComponentsWrapper.appendChild(newCustomElement);
  });
});

function defineCustomElementsForHydration() {
  class BasicWC extends HTMLElement {
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

  customElements.define(
    "wc-slider-elem",
    class extends BasicWC {
      constructor() {
        super();
        this.containerName = "slider-elem";
      }

      connectedCallback() {
        super.connectedCallback();

        const isServerRendered = !!this.dataset.serverRendered;

        //var ComponentClass = Vue.extend(SliderElem);
        //var instance = new ComponentClass();

        const app = new Vue({
          template: "<anonymous-slider-elem></anonymous-slider-elem>"
        });

        if (isServerRendered) {
          // ok we need to hydrate this
          //app.$mount(, true);
          app.$mount(this.renderTarget, true);
          //console.log("here", this);
        } else {
          console.log("todo CSR");
        }
      }
    }
  );
}
