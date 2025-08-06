const imageFile = document.getElementById("image-file");
const image = document.getElementById("image");
const imageDisplay = document.getElementById("image-display");
jQuery(imageDisplay).resizable({ aspectRatio: true });
const numFramesInput = document.getElementById("num-frames");
const delayInput = document.getElementById("delay");
const framesArea = document.getElementById("frames");
let zoomOverlay = null;
// Used to update zoom overlay while resizing image.
// {top, left, width, height}
let oldZoomOverlayCoords = null;

function updateContainerMinDimensions() {
  const containerBounds = imageDisplay.getBoundingClientRect();
  const zoomBounds = zoomOverlay.getBoundingClientRect();
  const minWidth = zoomBounds.right - containerBounds.x;
  const minHeight = zoomBounds.bottom - containerBounds.y;
  jQuery(imageDisplay).resizable("option", "minWidth", minWidth);
  jQuery(imageDisplay).resizable("option", "minHeight", minHeight);
}

jQuery(imageDisplay).on("resizestart", function (event, ui) {
  // Avoid handling resizestart from the zoom overlay.
  if (event.target !== event.currentTarget) {
    return;
  }
  const zoomOverlayRect = zoomOverlay.getBoundingClientRect();
  const containerRect = imageDisplay.getBoundingClientRect();
  oldZoomOverlayCoords = {
    left: zoomOverlayRect.x - containerRect.x,
    top: zoomOverlayRect.y - containerRect.y,
    width: zoomOverlayRect.width,
    height: zoomOverlayRect.height,
  };
});

jQuery(imageDisplay).on("resize", function (event, ui) {
  // Avoid handling resize from the zoom overlay.
  if (event.target !== event.currentTarget) {
    return;
  }
  const scale = ui.size.width / ui.originalSize.width;
  zoomOverlay.style.left = parseInt(scale * oldZoomOverlayCoords.left) + "px";
  zoomOverlay.style.top = parseInt(scale * oldZoomOverlayCoords.top) + "px";
  const rescaledWidth = parseInt(scale * oldZoomOverlayCoords.width);
  const rescaledHeight = parseInt(scale * oldZoomOverlayCoords.height);
  // Avoid making the area of the zoom overlay too small.
  // To preserve aspect ratio, either resize both dimensions or none.
  if (rescaledWidth > 25 && rescaledHeight > 25) {
    zoomOverlay.style.width = rescaledWidth + "px";
    zoomOverlay.style.height = rescaledHeight + "px";
  }
  updateContainerMinDimensions();
});
imageFile.addEventListener("change", function () {
  const file = imageFile.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      image.onload = function () {
        if (!zoomOverlay) {
          zoomOverlay = document.createElement("div");
          zoomOverlay.classList.add("zoom-area");
          imageDisplay.appendChild(zoomOverlay);

          jQuery(zoomOverlay).on(
            "dragstop resizestop",
            updateContainerMinDimensions,
          );
          jQuery(zoomOverlay).draggable({ containment: "parent" });
          jQuery(zoomOverlay).resizable({
            aspectRatio: true,
            containment: "parent",
          });
        }
        imageDisplay.style.width = image.naturalWidth + "px";
        imageDisplay.style.height = image.naturalHeight + "px";
        zoomOverlay.style.left = parseInt(0.33 * image.naturalWidth) + "px";
        zoomOverlay.style.top = parseInt(0.33 * image.naturalHeight) + "px";
        zoomOverlay.style.width = parseInt(0.33 * image.naturalWidth) + "px";
        zoomOverlay.style.height = parseInt(0.33 * image.naturalHeight) + "px";
        updateContainerMinDimensions();
        framesArea.style.zoom = 300 / image.naturalHeight;
      };
      image.src = e.target.result;
      imageDisplay.style.backgroundImage = "url(" + e.target.result + ")";
    };
    reader.readAsDataURL(file);
  }
});

function intTween(start, stop, fraction) {
  return parseInt((1 - fraction) * start + fraction * stop);
}

function makeGif() {
  const gif = new GIF({
    workerScript: "deps/gif.worker.js",
    workers: 2,
    quality: 10,
  });

  const numFrames = numFramesInput.value;
  const outputRect = imageDisplay.getBoundingClientRect();
  const finalRect = zoomOverlay.getBoundingClientRect();
  const startWidth = image.naturalWidth;
  const finalWidth = finalRect.width;
  const startHeight = image.naturalHeight;
  const finalHeight = finalRect.height;
  const scale = image.naturalWidth / outputRect.width;
  const finalX = parseInt(scale * (finalRect.x - outputRect.x));
  const finalY = parseInt(scale * (finalRect.y - outputRect.y));
  jQuery(framesArea).empty();
  for (let i = 0; i < numFrames; i++) {
    const frac = i / (numFrames - 1);
    const canvas = document.createElement("canvas");
    canvas.width = outputRect.width;
    canvas.height = outputRect.height;
    framesArea.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.drawImage(
      image,
      intTween(0, finalX, frac),
      intTween(0, finalY, frac),
      intTween(startWidth, finalWidth, frac),
      intTween(startHeight, finalHeight, frac),
      0,
      0,
      outputRect.width,
      outputRect.height,
    );
    gif.addFrame(canvas);
  }

  gif.on("finished", function (blob) {
    window.open(URL.createObjectURL(blob));
  });

  gif.render();
}

document.getElementById("gif-button").addEventListener("click", makeGif);
